import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database tables
const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Initializing database tables...');
    
    // Brands table
    await client.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Seed default brands if empty
    const brandCount = await client.query('SELECT COUNT(*) FROM brands');
    if (parseInt(brandCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO brands (name) VALUES 
        ('Superstar'),
        ('Ericsson'),
        ('RFL'),
        ('Philips'),
        ('Havells'),
        ('Walton'),
        ('Click'),
        ('Other')
      `);
    }

    // 1. Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        brand VARCHAR(100),
        model VARCHAR(100),
        purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        stock_quantity INT NOT NULL DEFAULT 0,
        reorder_level INT NOT NULL DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration to add brand column if table already exists
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
    `);

    // 2. Purchases table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        quantity INT NOT NULL,
        purchase_price NUMERIC(10, 2) NOT NULL,
        vendor_name VARCHAR(255),
        purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration to add invoice_no column if table already exists
    await client.query(`
      ALTER TABLE purchases ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100);
    `);

    // 3. Sales table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(20),
        discount NUMERIC(10, 2) DEFAULT 0.00,
        total_amount NUMERIC(10, 2) NOT NULL,
        profit NUMERIC(10, 2) NOT NULL,
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Sale Items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INT REFERENCES sales(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id) ON DELETE SET NULL,
        quantity INT NOT NULL,
        purchase_price NUMERIC(10, 2) NOT NULL,
        selling_price NUMERIC(10, 2) NOT NULL,
        purchase_id INT REFERENCES purchases(id) ON DELETE SET NULL
      );
    `);

    // Migration to add purchase_id column to existing sale_items if missing
    await client.query(`
      ALTER TABLE sale_items 
      ADD COLUMN IF NOT EXISTS purchase_id INT REFERENCES purchases(id) ON DELETE SET NULL;
    `);

    // 5. Employee Expenses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_expenses (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(255) NOT NULL,
        expense_type VARCHAR(100) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        month_year VARCHAR(20) NOT NULL,
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT
      );
    `);

    // 6. Shop Expenses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shop_expenses (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT
      );
    `);

    // 7. Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration to add role column to existing users table if missing
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'employee';
    `);

    // Seed default admin user if none exists
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) === 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);
      await client.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        ['admin', passwordHash, 'admin']
      );
      console.log('Default admin user seeded successfully.');
    } else {
      // Ensure the 'admin' user is set to 'admin' role
      await client.query("UPDATE users SET role = 'admin' WHERE username = 'admin'");
    }

    console.log('Database tables initialized successfully.');
    
    // Auto-heal missing purchase logs for products with stock
    await healMissingPurchases(client);

    // Auto-allocate past unallocated sales to specific purchase batches (FIFO)
    await allocatePastSalesToBatches(client);
  } catch (err) {
    console.error('Error initializing database tables:', err);
    throw err;
  } finally {
    client.release();
  }
};

const healMissingPurchases = async (client) => {
  try {
    const products = await client.query('SELECT * FROM products');
    for (const prod of products.rows) {
      const pCheck = await client.query('SELECT COUNT(*) FROM purchases WHERE product_id = $1', [prod.id]);
      if (parseInt(pCheck.rows[0].count) === 0 && parseInt(prod.stock_quantity) > 0) {
        await client.query(
          `INSERT INTO purchases (product_id, quantity, purchase_price, vendor_name, invoice_no, purchase_date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            prod.id, 
            prod.stock_quantity, 
            prod.purchase_price, 
            'প্রারম্ভিক স্টক (Initial Stock)', 
            `INIT-${prod.id}`, 
            prod.created_at || new Date()
          ]
        );
        console.log(`Auto-created initial stock purchase record for product: ${prod.name}`);
      }
    }
  } catch (err) {
    console.error('Error healing missing purchases:', err);
  }
};

const allocatePastSalesToBatches = async (client) => {
  try {
    // 1. Get all sale_items that have NULL purchase_id
    const unallocatedRes = await client.query(
      'SELECT * FROM sale_items WHERE purchase_id IS NULL ORDER BY id ASC'
    );
    
    if (unallocatedRes.rows.length === 0) return;
    
    console.log(`Migrating ${unallocatedRes.rows.length} unallocated sale items to specific batches...`);
    
    for (const item of unallocatedRes.rows) {
      // Find available purchases for this product
      const purchasesRes = await client.query(`
        SELECT 
          p.id,
          p.quantity as original_qty,
          p.purchase_price,
          COALESCE(SUM(si.quantity), 0) as consumed_qty
        FROM purchases p
        LEFT JOIN sale_items si ON si.purchase_id = p.id
        WHERE p.product_id = $1
        GROUP BY p.id, p.purchase_date
        ORDER BY p.purchase_date ASC, p.id ASC
      `, [item.product_id]);
      
      let remainingToAllocate = parseInt(item.quantity);
      
      for (const p of purchasesRes.rows) {
        const available = parseInt(p.original_qty) - parseInt(p.consumed_qty);
        if (available > 0) {
          const consume = Math.min(remainingToAllocate, available);
          
          if (consume === remainingToAllocate) {
            // This sale item fits entirely in this batch
            await client.query(
              'UPDATE sale_items SET purchase_id = $1 WHERE id = $2',
              [p.id, item.id]
            );
            remainingToAllocate = 0;
            break;
          } else {
            // It spans multiple batches! Split the sale_item!
            // First, update the current sale_item to consume the available amount
            await client.query(
              'UPDATE sale_items SET quantity = $1, purchase_id = $2 WHERE id = $3',
              [consume, p.id, item.id]
            );
            
            remainingToAllocate -= consume;
            
            // Insert a new sale_item for the remainder (which will be processed in subsequent iterations)
            const newInsert = await client.query(
              `INSERT INTO sale_items (sale_id, product_id, quantity, purchase_price, selling_price, purchase_id)
               VALUES ($1, $2, $3, $4, $5, NULL) RETURNING id`,
              [item.sale_id, item.product_id, remainingToAllocate, item.purchase_price, item.selling_price]
            );
            
            // Set item.id and item.quantity to the new row so the loop can continue allocating it
            item.id = newInsert.rows[0].id;
            item.quantity = remainingToAllocate;
          }
        }
      }
    }
    console.log('Past sales migrated to specific batches successfully.');
  } catch (err) {
    console.error('Error allocating past sales:', err);
  }
};

export { pool, initDb };
