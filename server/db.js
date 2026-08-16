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
        selling_price NUMERIC(10, 2) NOT NULL
      );
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default admin user if none exists
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) === 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);
      await client.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
        ['admin', passwordHash]
      );
      console.log('Default admin user seeded successfully.');
    }

    console.log('Database tables initialized successfully.');
    
    // Auto-heal missing purchase logs for products with stock
    await healMissingPurchases(client);
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

export { pool, initDb };
