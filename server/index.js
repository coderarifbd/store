import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDb } from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-store-key-12345';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Database on startup
initDb().then(() => {
  console.log('Database system is ready.');
}).catch((err) => {
  console.error('Failed to initialize database:', err);
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to enforce admin role
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
};

// Middleware to enforce specific module permissions
const requirePermission = (moduleName) => {
  return (req, res, next) => {
    if (req.user) {
      if (req.user.role === 'admin') {
        return next();
      }
      const allowed = req.user.allowed_modules || '';
      if (allowed.split(',').includes(moduleName)) {
        return next();
      }
    }
    res.status(403).json({ error: `Access denied. Requires '${moduleName}' permission.` });
  };
};

// Protect all API routes under /api except auth
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/login') {
    return next();
  }
  authenticateToken(req, res, next);
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }

    const user = userRes.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }

    // Generate JWT token (expires in 7 days)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, allowed_modules: user.allowed_modules },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        allowed_modules: user.allowed_modules
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Change password endpoint (requires authenticateToken)
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { current_password, new_password, new_username } = req.body;
  const userId = req.user.id;
  
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'পুরাতন পাসওয়ার্ড এবং নতুন পাসওয়ার্ড আবশ্যক' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      throw new Error('ব্যবহারকারী পাওয়া যায়নি');
    }
    const user = userRes.rows[0];
    
    const isPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'পুরাতন পাসওয়ার্ডটি ভুল হয়েছে' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(new_password, salt);
    
    const updatedUsername = new_username && new_username.trim() ? new_username.trim() : user.username;
    
    await client.query(
      'UPDATE users SET username = $1, password_hash = $2 WHERE id = $3',
      [updatedUsername, passwordHash, userId]
    );
    
    await client.query('COMMIT');
    res.json({ 
      message: 'Password changed successfully',
      user: {
        id: userId,
        username: updatedUsername,
        role: user.role,
        allowed_modules: user.allowed_modules
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে' });
  } finally {
    client.release();
  }
});

// ==========================================
// USER MANAGEMENT ENDPOINTS (ইউজার ব্যবস্থাপনা)
// ==========================================

// Get all users (Admin only)
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, allowed_modules, created_at FROM users ORDER BY username ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// Add new user (Admin only)
app.post('/api/users', requireAdmin, async (req, res) => {
  const { username, password, role, allowed_modules } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'ইউজারনেম, পাসওয়ার্ড এবং রোল আবশ্যক' });
  }
  
  const trimmedUsername = username.trim();
  if (trimmedUsername.toLowerCase() === 'admin') {
    return res.status(400).json({ error: 'admin ইউজারনেমটি সংরক্ষিত, এটি ব্যবহার করা যাবে না' });
  }

  // Determine allowed modules based on role
  const modules = role === 'admin' 
    ? 'dashboard,inventory,purchases,sales,expenses,reports,users' 
    : (allowed_modules || 'dashboard,inventory,purchases,sales');

  try {
    // Check if user already exists
    const checkUser = await pool.query('SELECT * FROM users WHERE username = $1', [trimmedUsername]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role, allowed_modules) VALUES ($1, $2, $3, $4) RETURNING id, username, role, allowed_modules, created_at',
      [trimmedUsername, passwordHash, role, modules]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating user' });
  }
});

// Delete user (Admin only)
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const userIdToDelete = parseInt(id);
  
  if (req.user.id === userIdToDelete) {
    return res.status(400).json({ error: 'আপনি নিজের অ্যাকাউন্ট ডিলিট করতে পারবেন না' });
  }

  try {
    // Check if the user is default admin
    const checkUser = await pool.query('SELECT * FROM users WHERE id = $1', [userIdToDelete]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'ইউজার খুঁজে পাওয়া যায়নি' });
    }
    
    if (checkUser.rows[0].username === 'admin') {
      return res.status(400).json({ error: 'ডিফল্ট admin অ্যাকাউন্ট ডিলিট করা সম্ভব নয়' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userIdToDelete]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

// ==========================================
// BRANDS ENDPOINTS
// ==========================================

// Get all brands
app.get('/api/brands', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brands ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching brands' });
  }
});

// Add a brand
app.post('/api/brands', async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Brand name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO brands (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *',
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error adding brand' });
  }
});

// Delete a brand
app.delete('/api/brands/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM brands WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json({ message: 'Brand deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting brand' });
  }
});

// Update a brand
app.put('/api/brands/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Brand name is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE brands SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating brand' });
  }
});

// ==========================================
// PRODUCTS ENDPOINTS
// ==========================================

// Get all products
app.get('/api/products', requirePermission('inventory'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching products' });
  }
});

// Add a product
app.post('/api/products', requirePermission('inventory'), async (req, res) => {
  const { name, category, brand, model, purchase_price, selling_price, stock_quantity, reorder_level } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO products (name, category, brand, model, purchase_price, selling_price, stock_quantity, reorder_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, category, brand || '', model || '', purchase_price || 0, selling_price || 0, stock_quantity || 0, reorder_level || 10]
    );
    const newProduct = result.rows[0];
    const qty = parseInt(stock_quantity || 0);

    if (qty > 0) {
      await client.query(
        `INSERT INTO purchases (product_id, quantity, purchase_price, vendor_name, invoice_no, purchase_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          newProduct.id,
          qty,
          purchase_price || 0,
          'প্রারম্ভিক স্টক (Initial Stock)',
          `INIT-${newProduct.id}`,
          newProduct.created_at || new Date()
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(newProduct);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error adding product' });
  } finally {
    client.release();
  }
});

// Update a product
app.put('/api/products/:id', requirePermission('inventory'), async (req, res) => {
  const { id } = req.params;
  const { name, category, brand, model, purchase_price, selling_price, stock_quantity, reorder_level, is_discontinued } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE products 
       SET name = $1, category = $2, brand = $3, model = $4, purchase_price = $5, selling_price = $6, stock_quantity = $7, reorder_level = $8, is_discontinued = $9
       WHERE id = $10 RETURNING *`,
      [name, category, brand || '', model || '', purchase_price, selling_price, stock_quantity, reorder_level, is_discontinued || false, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const updatedProduct = result.rows[0];
    const qty = parseInt(stock_quantity || 0);

    // Sync INIT purchase record
    const initNo = `INIT-${id}`;
    const initCheck = await client.query('SELECT * FROM purchases WHERE invoice_no = $1', [initNo]);
    
    if (initCheck.rows.length > 0) {
      if (qty > 0) {
        await client.query(
          `UPDATE purchases 
           SET quantity = $1, purchase_price = $2 
           WHERE invoice_no = $3`,
          [qty, purchase_price, initNo]
        );
      } else {
        await client.query('DELETE FROM purchases WHERE invoice_no = $1', [initNo]);
      }
    } else if (qty > 0) {
      await client.query(
        `INSERT INTO purchases (product_id, quantity, purchase_price, vendor_name, invoice_no, purchase_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          qty,
          purchase_price,
          'প্রারম্ভিক স্টক (Initial Stock)',
          initNo,
          updatedProduct.created_at || new Date()
        ]
      );
    }

    await client.query('COMMIT');
    res.json(updatedProduct);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error updating product' });
  } finally {
    client.release();
  }
});

// Delete a product
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting product' });
  }
});


// Get FIFO stock batches for a product
app.get('/api/products/:id/batches', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get all purchases for this product sorted by date ASC
    const purchasesRes = await pool.query(
      'SELECT id, quantity, purchase_price, purchase_date, vendor_name FROM purchases WHERE product_id = $1 ORDER BY purchase_date ASC, id ASC',
      [id]
    );
    
    // 2. Get total quantity sold of this product
    const salesRes = await pool.query(
      'SELECT COALESCE(SUM(quantity), 0) as total_sold FROM sale_items WHERE product_id = $1',
      [id]
    );
    let totalSold = parseInt(salesRes.rows[0].total_sold);
    
    // 3. Allocate sold quantity to purchases (FIFO)
    const activeBatches = [];
    for (const p of purchasesRes.rows) {
      const qty = parseInt(p.quantity);
      if (totalSold >= qty) {
        totalSold -= qty; // This batch is completely sold out
      } else {
        const remaining = qty - totalSold;
        totalSold = 0; // All sales have been allocated
        activeBatches.push({
          purchase_id: p.id,
          purchase_date: p.purchase_date,
          vendor_name: p.vendor_name,
          original_qty: qty,
          remaining_qty: remaining,
          purchase_price: parseFloat(p.purchase_price)
        });
      }
    }
    
    res.json(activeBatches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error calculating stock batches' });
  }
});

// Get all products with their active stock batches
app.get('/api/products/with-batches', async (req, res) => {
  try {
    const productsRes = await pool.query('SELECT * FROM products WHERE is_discontinued = FALSE OR is_discontinued IS NULL ORDER BY name ASC');
    const products = productsRes.rows;
    
    const batchesRes = await pool.query(`
      SELECT 
        p.product_id,
        p.id as purchase_id,
        p.purchase_date,
        p.vendor_name,
        p.quantity as original_qty,
        p.purchase_price,
        (p.quantity - COALESCE(SUM(si.quantity), 0)) as remaining_qty
      FROM purchases p
      LEFT JOIN sale_items si ON si.purchase_id = p.id
      GROUP BY p.product_id, p.id, p.purchase_date, p.vendor_name, p.quantity, p.purchase_price
      HAVING (p.quantity - COALESCE(SUM(si.quantity), 0)) > 0
      ORDER BY p.purchase_date ASC, p.id ASC
    `);
    const batches = batchesRes.rows;
    
    const productsWithBatches = products.map(prod => {
      const prodBatches = batches
        .filter(b => b.product_id === prod.id)
        .map(b => ({
          purchase_id: b.purchase_id,
          purchase_date: b.purchase_date,
          vendor_name: b.vendor_name,
          original_qty: parseInt(b.original_qty),
          remaining_qty: parseInt(b.remaining_qty),
          purchase_price: parseFloat(b.purchase_price)
        }));
      return {
        ...prod,
        batches: prodBatches
      };
    });
    
    res.json(productsWithBatches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching products with batches' });
  }
});


// ==========================================
// PURCHASES ENDPOINTS (পণ্য ক্রয়ের হিসাব)
// ==========================================

// Get all purchase logs
app.get('/api/purchases', requirePermission('purchases'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, prod.name as product_name, prod.category as product_category, prod.brand as product_brand
      FROM purchases p
      LEFT JOIN products prod ON p.product_id = prod.id
      ORDER BY p.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching purchases' });
  }
});

// Log a purchase and update stock
app.post('/api/purchases', requirePermission('purchases'), async (req, res) => {
  const { product_id, quantity, purchase_price, vendor_name, purchase_date, items, invoice_no } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const pDate = purchase_date ? new Date(purchase_date) : new Date();
    const results = [];
    const invoiceNo = invoice_no || 'PR-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
    
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { product_id: pId, quantity: qty, purchase_price: price } = item;
        
        // Check if product exists
        const productCheck = await client.query('SELECT * FROM products WHERE id = $1', [pId]);
        if (productCheck.rows.length === 0) {
          throw new Error(`Product with ID ${pId} not found`);
        }
        
        // Insert purchase record
        const purchaseResult = await client.query(
          `INSERT INTO purchases (product_id, quantity, purchase_price, vendor_name, purchase_date, invoice_no)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [pId, qty, price, vendor_name || '', pDate, invoiceNo]
        );
        
        // Update product stock and update standard purchase_price
        await client.query(
          `UPDATE products 
           SET stock_quantity = stock_quantity + $1, purchase_price = $2 
           WHERE id = $3`,
          [qty, price, pId]
        );
        
        results.push(purchaseResult.rows[0]);
      }
    } else {
      // Check if product exists
      const productCheck = await client.query('SELECT * FROM products WHERE id = $1', [product_id]);
      if (productCheck.rows.length === 0) {
        throw new Error('Product not found');
      }
      
      // Insert purchase record
      const purchaseResult = await client.query(
        `INSERT INTO purchases (product_id, quantity, purchase_price, vendor_name, purchase_date, invoice_no)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [product_id, quantity, purchase_price, vendor_name || '', pDate, invoiceNo]
      );
      
      // Update product stock and update standard purchase_price
      await client.query(
        `UPDATE products 
         SET stock_quantity = stock_quantity + $1, purchase_price = $2 
         WHERE id = $3`,
        [quantity, purchase_price, product_id]
      );
      
      results.push(purchaseResult.rows[0]);
    }
    
    await client.query('COMMIT');
    res.status(201).json(results);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error recording purchase' });
  } finally {
    client.release();
  }
});

// Delete a purchase invoice (all items under same invoice_no) and restore stock
app.delete('/api/purchases/invoice/:invoice_no', requireAdmin, async (req, res) => {
  const { invoice_no } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Get all items under this invoice_no
    let itemsCheck = await client.query('SELECT * FROM purchases WHERE invoice_no = $1', [invoice_no]);
    
    // Fallback for legacy items where invoice_no was NULL
    if (itemsCheck.rows.length === 0) {
      const idMatch = invoice_no.match(/^PR-(?:ID-)?(\d+)$/);
      if (idMatch) {
        const purchaseId = parseInt(idMatch[1]);
        itemsCheck = await client.query('SELECT * FROM purchases WHERE id = $1 AND invoice_no IS NULL', [purchaseId]);
      }
    }
    
    if (itemsCheck.rows.length === 0) {
      throw new Error('Invoice not found');
    }
    
    // 2. Adjust product stock levels
    for (const item of itemsCheck.rows) {
      await client.query(
        `UPDATE products 
         SET stock_quantity = GREATEST(0, stock_quantity - $1) 
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }
    
    // 3. Delete purchases
    if (itemsCheck.rows[0].invoice_no) {
      await client.query('DELETE FROM purchases WHERE invoice_no = $1', [invoice_no]);
    } else {
      await client.query('DELETE FROM purchases WHERE id = $1', [itemsCheck.rows[0].id]);
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Purchase invoice deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error deleting purchase invoice' });
  } finally {
    client.release();
  }
});


// Edit a purchase invoice (update vendor and date for all items under invoice_no)
app.put('/api/purchases/invoice/:invoice_no', async (req, res) => {
  const { invoice_no } = req.params;
  const { vendor_name, purchase_date } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Fallback for legacy items (invoice_no might be format PR-<id>)
    let isLegacy = false;
    let purchaseId = null;
    const idMatch = invoice_no.match(/^PR-(?:ID-)?(\d+)$/);
    if (idMatch) {
      purchaseId = parseInt(idMatch[1]);
      const legacyCheck = await client.query('SELECT * FROM purchases WHERE id = $1 AND invoice_no IS NULL', [purchaseId]);
      if (legacyCheck.rows.length > 0) {
        isLegacy = true;
      }
    }

    const pDate = purchase_date ? new Date(purchase_date) : null;
    
    if (isLegacy) {
      if (pDate) {
        await client.query(
          `UPDATE purchases 
           SET vendor_name = $1, purchase_date = $2 
           WHERE id = $3`,
          [vendor_name || '', pDate, purchaseId]
        );
      } else {
        await client.query(
          `UPDATE purchases 
           SET vendor_name = $1 
           WHERE id = $2`,
          [vendor_name || '', purchaseId]
        );
      }
    } else {
      if (pDate) {
        await client.query(
          `UPDATE purchases 
           SET vendor_name = $1, purchase_date = $2 
           WHERE invoice_no = $3`,
          [vendor_name || '', pDate, invoice_no]
        );
      } else {
        await client.query(
          `UPDATE purchases 
           SET vendor_name = $1 
           WHERE invoice_no = $2`,
          [vendor_name || '', invoice_no]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Purchase invoice updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error updating purchase invoice' });
  } finally {
    client.release();
  }
});


// Edit a purchase log
app.put('/api/purchases/:id', requirePermission('purchases'), async (req, res) => {
  const { id } = req.params;
  const { quantity, purchase_price, vendor_name, purchase_date } = req.body;
  const qty = parseInt(quantity);
  const price = parseFloat(purchase_price);
  
  if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
    return res.status(400).json({ error: 'Valid quantity and purchase price are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Get current purchase record details
    const pCheck = await client.query('SELECT * FROM purchases WHERE id = $1', [id]);
    if (pCheck.rows.length === 0) {
      throw new Error('Purchase record not found');
    }
    const oldPurchase = pCheck.rows[0];
    
    // 2. Calculate stock difference
    const qtyDiff = qty - oldPurchase.quantity;
    
    // 3. Update product stock and optionally purchase_price
    await client.query(
      `UPDATE products 
       SET stock_quantity = GREATEST(0, stock_quantity + $1), purchase_price = $2 
       WHERE id = $3`,
      [qtyDiff, price, oldPurchase.product_id]
    );
    
    // 4. Update purchase log
    const pDate = purchase_date ? new Date(purchase_date) : oldPurchase.purchase_date;
    const result = await client.query(
      `UPDATE purchases 
       SET quantity = $1, purchase_price = $2, vendor_name = $3, purchase_date = $4 
       WHERE id = $5 RETURNING *`,
      [qty, price, vendor_name || '', pDate, id]
    );
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error updating purchase record' });
  } finally {
    client.release();
  }
});

// Delete a purchase log
app.delete('/api/purchases/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Get the purchase details to adjust stock
    const pCheck = await client.query('SELECT * FROM purchases WHERE id = $1', [id]);
    if (pCheck.rows.length === 0) {
      throw new Error('Purchase record not found');
    }
    const { product_id, quantity } = pCheck.rows[0];
    
    // 2. Adjust product stock
    await client.query(
      `UPDATE products 
       SET stock_quantity = GREATEST(0, stock_quantity - $1) 
       WHERE id = $2`,
      [quantity, product_id]
    );
    
    // 3. Delete the purchase record
    await client.query('DELETE FROM purchases WHERE id = $1', [id]);

    // 4. Update product's purchase_price to the latest purchase rate (if any exists)
    const latestPurchase = await client.query(
      'SELECT purchase_price FROM purchases WHERE product_id = $1 ORDER BY purchase_date DESC, id DESC LIMIT 1',
      [product_id]
    );
    if (latestPurchase.rows.length > 0) {
      await client.query(
        'UPDATE products SET purchase_price = $1 WHERE id = $2',
        [latestPurchase.rows[0].purchase_price, product_id]
      );
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Purchase record deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error deleting purchase record' });
  } finally {
    client.release();
  }
});


// ==========================================
// SALES ENDPOINTS (পণ্য বিক্রির হিসাব)
// ==========================================

// Get all sales logs
app.get('/api/sales', requirePermission('sales'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching sales' });
  }
});

// Get detailed sale information (including items)
app.get('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const saleResult = await pool.query('SELECT * FROM sales WHERE id = $1', [id]);
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale record not found' });
    }
    
    const itemsResult = await pool.query(`
      SELECT si.*, p.name as product_name, p.category as product_category, p.brand as product_brand, p.model as product_model
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = $1
    `, [id]);
    
    res.json({
      sale: saleResult.rows[0],
      items: itemsResult.rows[0] ? itemsResult.rows : []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching sale details' });
  }
});

// Log a sale and decrease stock
app.post('/api/sales', requirePermission('sales'), async (req, res) => {
  const { customer_name, customer_phone, discount, items, sale_date } = req.body;
  // items should be an array of: { product_id, quantity, selling_price, purchase_id }
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Sale must contain at least one item' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let total_amount = 0;
    let total_cost = 0;
    const processedItems = [];
    
    // 1. Validate stock and calculate prices
    for (const item of items) {
      const { product_id, quantity, selling_price, purchase_id } = item;
      
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1', [product_id]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Product ID ${product_id} not found`);
      }
      
      const product = prodRes.rows[0];
      if (product.stock_quantity < quantity) {
        throw new Error(`Insufficient stock for product "${product.name}". Available: ${product.stock_quantity}, Requested: ${quantity}`);
      }
      
      const allocations = []; // Array of { purchase_id, quantity, purchase_price }
      let itemTotalCost = 0;

      if (purchase_id) {
        // A. Manual batch selection
        const pRes = await client.query('SELECT * FROM purchases WHERE id = $1', [purchase_id]);
        if (pRes.rows.length === 0) {
          throw new Error(`Selected batch (Purchase ID ${purchase_id}) not found`);
        }
        const purchase = pRes.rows[0];
        
        // Calculate remaining batch quantity from actual DB sale logs
        const consumedRes = await client.query(
          'SELECT COALESCE(SUM(quantity), 0) as consumed FROM sale_items WHERE purchase_id = $1',
          [purchase_id]
        );
        const consumed = parseInt(consumedRes.rows[0].consumed);
        const remaining = purchase.quantity - consumed;
        
        if (remaining < quantity) {
          throw new Error(`Selected batch "${purchase.vendor_name || 'ক্রয়'}" does not have enough stock. Available: ${remaining}, Requested: ${quantity}`);
        }
        
        itemTotalCost = quantity * parseFloat(purchase.purchase_price);
        allocations.push({
          purchase_id,
          quantity,
          purchase_price: parseFloat(purchase.purchase_price)
        });
      } else {
        // B. Automated FIFO calculation
        const purchasesRes = await client.query(
          'SELECT id, quantity, purchase_price FROM purchases WHERE product_id = $1 ORDER BY purchase_date ASC, id ASC',
          [product_id]
        );
        
        let remainingToSell = quantity;
        
        for (const p of purchasesRes.rows) {
          // Get consumed count for this specific purchase batch
          const consumedRes = await client.query(
            'SELECT COALESCE(SUM(quantity), 0) as consumed FROM sale_items WHERE purchase_id = $1',
            [p.id]
          );
          const consumed = parseInt(consumedRes.rows[0].consumed);
          const availableInBatch = p.quantity - consumed;
          
          if (availableInBatch > 0) {
            const consumeQty = Math.min(remainingToSell, availableInBatch);
            itemTotalCost += consumeQty * parseFloat(p.purchase_price);
            remainingToSell -= consumeQty;
            
            allocations.push({
              purchase_id: p.id,
              quantity: consumeQty,
              purchase_price: parseFloat(p.purchase_price)
            });
            
            if (remainingToSell <= 0) break;
          }
        }
        
        // Fallback for case where sold quantity exceeds logged purchases (e.g., initial seed stock manual adjustments)
        if (remainingToSell > 0) {
          itemTotalCost += remainingToSell * parseFloat(product.purchase_price);
          allocations.push({
            purchase_id: null,
            quantity: remainingToSell,
            purchase_price: parseFloat(product.purchase_price)
          });
        }
      }
      
      total_amount += parseFloat(selling_price) * quantity;
      total_cost += itemTotalCost;
      
      // Add each allocation to processedItems
      for (const alloc of allocations) {
        processedItems.push({
          product_id,
          quantity: alloc.quantity,
          purchase_price: alloc.purchase_price,
          selling_price,
          purchase_id: alloc.purchase_id
        });
      }
    }
    
    const disc = parseFloat(discount || 0);
    const final_amount = total_amount - disc;
    const profit = final_amount - total_cost;
    const sDate = sale_date ? new Date(sale_date) : new Date();
    
    // 2. Insert into sales table
    const saleInsert = await client.query(
      `INSERT INTO sales (customer_name, customer_phone, discount, total_amount, profit, sale_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [customer_name || '', customer_phone || '', disc, final_amount, profit, sDate]
    );
    
    const saleId = saleInsert.rows[0].id;
    
    // 3. Insert items into sale_items table
    for (const pItem of processedItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, purchase_price, selling_price, purchase_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [saleId, pItem.product_id, pItem.quantity, pItem.purchase_price, pItem.selling_price, pItem.purchase_id]
      );
    }
    
    // Deduct stock from products table using a grouped reduction query to prevent double update issues if same product has multiple batches in sale
    const productDeductions = {};
    for (const pItem of processedItems) {
      productDeductions[pItem.product_id] = (productDeductions[pItem.product_id] || 0) + pItem.quantity;
    }
    for (const pId in productDeductions) {
      await client.query(
        `UPDATE products 
         SET stock_quantity = stock_quantity - $1 
         WHERE id = $2`,
        [productDeductions[pId], parseInt(pId)]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json(saleInsert.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error recording sale' });
  } finally {
    client.release();
  }
});


// Delete a sale log and restore stock
app.delete('/api/sales/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Get sale items to restore stock
    const itemsCheck = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [id]);
    
    // 2. Restock products
    for (const item of itemsCheck.rows) {
      await client.query(
        `UPDATE products 
         SET stock_quantity = stock_quantity + $1 
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }
    
    // 3. Delete sale items and sale record
    await client.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
    await client.query('DELETE FROM sales WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    res.json({ message: 'Sale invoice deleted successfully and stock restored' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error deleting sale record' });
  } finally {
    client.release();
  }
});


// ==========================================
// EMPLOYEE EXPENSES ENDPOINTS (কর্মচারির খরচ)
// ==========================================

// Get all employee expenses
app.get('/api/employee-expenses', requirePermission('expenses'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employee_expenses ORDER BY payment_date DESC, id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching employee expenses' });
  }
});

// Add employee expense
app.post('/api/employee-expenses', requirePermission('expenses'), async (req, res) => {
  const { employee_name, expense_type, amount, month_year, payment_date, notes } = req.body;
  try {
    const pDate = payment_date ? new Date(payment_date) : new Date();
    const result = await pool.query(
      `INSERT INTO employee_expenses (employee_name, expense_type, amount, month_year, payment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [employee_name, expense_type, amount, month_year, pDate, notes || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving employee expense' });
  }
});

// Delete employee expense
app.delete('/api/employee-expenses/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM employee_expenses WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Employee expense deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting employee expense' });
  }
});


// ==========================================
// SHOP EXPENSES ENDPOINTS (দোকান খরচ)
// ==========================================

// Get all shop expenses
app.get('/api/shop-expenses', requirePermission('expenses'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shop_expenses ORDER BY expense_date DESC, id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching shop expenses' });
  }
});

// Add shop expense
app.post('/api/shop-expenses', requirePermission('expenses'), async (req, res) => {
  const { category, amount, expense_date, notes } = req.body;
  try {
    const eDate = expense_date ? new Date(expense_date) : new Date();
    const result = await pool.query(
      `INSERT INTO shop_expenses (category, amount, expense_date, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [category, amount, eDate, notes || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving shop expense' });
  }
});

// Delete shop expense
app.delete('/api/shop-expenses/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM shop_expenses WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Shop expense deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting shop expense' });
  }
});


// ==========================================
// REPORTS & ANALYTICS ENDPOINTS
// ==========================================

// Dashboard Summary Stats
app.get('/api/reports/summary', async (req, res) => {
  try {
    // Current Local time references
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    // 1. Current stock total items and total valuation
    const stockResult = await pool.query(`
      SELECT 
        SUM(stock_quantity) as total_items,
        SUM(stock_quantity * purchase_price) as total_valuation
      FROM products
    `);
    
    // 2. Low stock alert count
    const lowStockResult = await pool.query(`
      SELECT COUNT(*) as count FROM products WHERE stock_quantity <= reorder_level AND (is_discontinued = FALSE OR is_discontinued IS NULL)
    `);

    // Date bounds for current month (using standard UTC date strings or simple query)
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01 00:00:00`;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const monthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01 00:00:00`;

    // 3. Current month sales revenue and profit
    const salesResult = await pool.query(`
      SELECT 
        SUM(total_amount) as revenue,
        SUM(profit) as profit
      FROM sales
      WHERE sale_date >= $1 AND sale_date < $2
    `, [monthStart, monthEnd]);

    // 4. Current month purchase costs
    const purchasesResult = await pool.query(`
      SELECT SUM(quantity * purchase_price) as total
      FROM purchases
      WHERE purchase_date >= $1 AND purchase_date < $2
    `, [monthStart, monthEnd]);

    // 5. Current month employee expenses
    const empExpResult = await pool.query(`
      SELECT SUM(amount) as total
      FROM employee_expenses
      WHERE payment_date >= $1 AND payment_date < $2
    `, [monthStart, monthEnd]);

    // 6. Current month shop expenses
    const shopExpResult = await pool.query(`
      SELECT SUM(amount) as total
      FROM shop_expenses
      WHERE expense_date >= $1 AND expense_date < $2
    `, [monthStart, monthEnd]);

    // 7. Top Selling Products
    const topSellingRes = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.brand,
        p.model,
        SUM(si.quantity) as total_sold
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.id, p.name, p.brand, p.model
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    // 8. Least Selling Products (with last sold date)
    const leastSellingRes = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.brand,
        p.model,
        COALESCE(SUM(si.quantity), 0) as total_sold,
        MAX(s.sale_date) as last_sold_date
      FROM products p
      LEFT JOIN sale_items si ON si.product_id = p.id
      LEFT JOIN sales s ON si.sale_id = s.id
      GROUP BY p.id, p.name, p.brand, p.model
      ORDER BY total_sold ASC, last_sold_date ASC NULLS FIRST
      LIMIT 5
    `);

    res.json({
      stock: {
        total_items: parseInt(stockResult.rows[0].total_items || 0),
        total_valuation: parseFloat(stockResult.rows[0].total_valuation || 0),
        low_stock_count: parseInt(lowStockResult.rows[0].count || 0)
      },
      current_month: {
        sales_revenue: parseFloat(salesResult.rows[0].revenue || 0),
        sales_profit: parseFloat(salesResult.rows[0].profit || 0),
        purchases_total: parseFloat(purchasesResult.rows[0].total || 0),
        employee_expenses: parseFloat(empExpResult.rows[0].total || 0),
        shop_expenses: parseFloat(shopExpResult.rows[0].total || 0)
      },
      top_selling: topSellingRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        brand: r.brand,
        model: r.model,
        total_sold: parseInt(r.total_sold || 0)
      })),
      least_selling: leastSellingRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        brand: r.brand,
        model: r.model,
        total_sold: parseInt(r.total_sold || 0),
        last_sold_date: r.last_sold_date
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating dashboard summary' });
  }
});

// Monthly report data (sales, expenses, purchases by day for a given month)
app.get('/api/reports/monthly', requirePermission('reports'), async (req, res) => {
  const { year, month } = req.query;
  const targetYear = parseInt(year || new Date().getFullYear());
  const targetMonth = parseInt(month || (new Date().getMonth() + 1));
  
  try {
    const monthStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01 00:00:00`;
    const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
    const nextMonthYear = targetMonth === 12 ? targetYear + 1 : targetYear;
    const monthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01 00:00:00`;

    // Daily Sales
    const salesRes = await pool.query(`
      SELECT DATE(sale_date) as date, SUM(total_amount) as amount, SUM(profit) as profit
      FROM sales
      WHERE sale_date >= $1 AND sale_date < $2
      GROUP BY DATE(sale_date)
      ORDER BY DATE(sale_date)
    `, [monthStart, monthEnd]);

    // Daily Purchases
    const purchasesRes = await pool.query(`
      SELECT DATE(purchase_date) as date, SUM(quantity * purchase_price) as amount
      FROM purchases
      WHERE purchase_date >= $1 AND purchase_date < $2
      GROUP BY DATE(purchase_date)
      ORDER BY DATE(purchase_date)
    `, [monthStart, monthEnd]);

    // Daily Employee Expenses
    const empExpRes = await pool.query(`
      SELECT DATE(payment_date) as date, SUM(amount) as amount
      FROM employee_expenses
      WHERE payment_date >= $1 AND payment_date < $2
      GROUP BY DATE(payment_date)
    `, [monthStart, monthEnd]);

    // Daily Shop Expenses
    const shopExpRes = await pool.query(`
      SELECT DATE(expense_date) as date, SUM(amount) as amount
      FROM shop_expenses
      WHERE expense_date >= $1 AND expense_date < $2
      GROUP BY DATE(expense_date)
    `, [monthStart, monthEnd]);

    // Total monthly sums
    const sumsRes = await pool.query(`
      SELECT
        (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE sale_date >= $1 AND sale_date < $2) as total_sales,
        (SELECT COALESCE(SUM(profit), 0) FROM sales WHERE sale_date >= $1 AND sale_date < $2) as total_profit,
        (SELECT COALESCE(SUM(quantity * purchase_price), 0) FROM purchases WHERE purchase_date >= $1 AND purchase_date < $2) as total_purchases,
        (SELECT COALESCE(SUM(amount), 0) FROM employee_expenses WHERE payment_date >= $1 AND payment_date < $2) as total_emp_expenses,
        (SELECT COALESCE(SUM(amount), 0) FROM shop_expenses WHERE expense_date >= $1 AND expense_date < $2) as total_shop_expenses
    `, [monthStart, monthEnd]);

    // Category breakdown for shop expenses
    const shopCategoryRes = await pool.query(`
      SELECT category, SUM(amount) as amount
      FROM shop_expenses
      WHERE expense_date >= $1 AND expense_date < $2
      GROUP BY category
    `, [monthStart, monthEnd]);

    res.json({
      summary: {
        sales: parseFloat(sumsRes.rows[0].total_sales),
        profit: parseFloat(sumsRes.rows[0].total_profit),
        purchases: parseFloat(sumsRes.rows[0].total_purchases),
        employee_expenses: parseFloat(sumsRes.rows[0].total_emp_expenses),
        shop_expenses: parseFloat(sumsRes.rows[0].total_shop_expenses),
        net_profit: parseFloat(sumsRes.rows[0].total_profit) - parseFloat(sumsRes.rows[0].total_emp_expenses) - parseFloat(sumsRes.rows[0].total_shop_expenses)
      },
      daily: {
        sales: salesRes.rows,
        purchases: purchasesRes.rows,
        employee_expenses: empExpRes.rows,
        shop_expenses: shopExpRes.rows
      },
      expense_breakdown: {
        shop_by_category: shopCategoryRes.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating monthly report' });
  }
});

// Yearly report data (sales, expenses, purchases by month for a given year)
app.get('/api/reports/yearly', requirePermission('reports'), async (req, res) => {
  const { year } = req.query;
  const targetYear = parseInt(year || new Date().getFullYear());
  
  try {
    const yearStart = `${targetYear}-01-01 00:00:00`;
    const yearEnd = `${targetYear + 1}-01-01 00:00:00`;

    // Monthly Sales in target year
    const salesRes = await pool.query(`
      SELECT EXTRACT(MONTH FROM sale_date) as month, SUM(total_amount) as amount, SUM(profit) as profit
      FROM sales
      WHERE sale_date >= $1 AND sale_date < $2
      GROUP BY EXTRACT(MONTH FROM sale_date)
      ORDER BY month
    `, [yearStart, yearEnd]);

    // Monthly Purchases in target year
    const purchasesRes = await pool.query(`
      SELECT EXTRACT(MONTH FROM purchase_date) as month, SUM(quantity * purchase_price) as amount
      FROM purchases
      WHERE purchase_date >= $1 AND purchase_date < $2
      GROUP BY EXTRACT(MONTH FROM purchase_date)
      ORDER BY month
    `, [yearStart, yearEnd]);

    // Monthly Employee Expenses in target year
    const empExpRes = await pool.query(`
      SELECT EXTRACT(MONTH FROM payment_date) as month, SUM(amount) as amount
      FROM employee_expenses
      WHERE payment_date >= $1 AND payment_date < $2
      GROUP BY EXTRACT(MONTH FROM payment_date)
      ORDER BY month
    `, [yearStart, yearEnd]);

    // Monthly Shop Expenses in target year
    const shopExpRes = await pool.query(`
      SELECT EXTRACT(MONTH FROM expense_date) as month, SUM(amount) as amount
      FROM shop_expenses
      WHERE expense_date >= $1 AND expense_date < $2
      GROUP BY EXTRACT(MONTH FROM expense_date)
      ORDER BY month
    `, [yearStart, yearEnd]);

    res.json({
      year: targetYear,
      sales: salesRes.rows,
      purchases: purchasesRes.rows,
      employee_expenses: empExpRes.rows,
      shop_expenses: shopExpRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating yearly report' });
  }
});

// Analytics: Most sold and oldest products
app.get('/api/reports/stats', requirePermission('reports'), async (req, res) => {
  try {
    // 1. Most sold products (সব থেকে বেশি বিক্রিত পণ্য)
    const mostSoldResult = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.category, 
        p.brand,
        p.model,
        p.stock_quantity,
        SUM(si.quantity) as total_sold,
        SUM(si.quantity * si.selling_price) as total_revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.id, p.name, p.category, p.brand, p.model, p.stock_quantity
      ORDER BY total_sold DESC
      LIMIT 10
    `);

    // 2. Oldest stock products (বেশি দিন স্টকে থাকা পণ্য)
    // Products with stock > 0, sorted by created_at (oldest first)
    const oldStockResult = await pool.query(`
      SELECT id, name, category, brand, model, stock_quantity, purchase_price, created_at
      FROM products
      WHERE stock_quantity > 0
      ORDER BY created_at ASC
      LIMIT 10
    `);

    res.json({
      most_sold: mostSoldResult.rows,
      old_stock: oldStockResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating statistics' });
  }
});

// Start Express server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
