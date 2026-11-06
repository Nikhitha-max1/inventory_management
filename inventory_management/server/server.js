require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');


const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Automatically open the dashboard at the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});


function sendError(res, error, message = 'Something went wrong.') {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'A record with these details already exists.' });
    }
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
            success: false,
            message: 'This record is used in stock transactions and cannot be deleted.'
        });
    }
    return res.status(500).json({ success: false, message });
}

function validPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

// Connection test
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DATABASE() AS database_name');
        res.json({ success: true, message: 'MySQL connected successfully!', database: rows[0].database_name });
    } catch (error) {
        sendError(res, error, 'Could not connect to MySQL. Check your .env settings.');
    }
});

// Dashboard summary
app.get('/api/dashboard', async (req, res) => {
    try {
        const [[productStats]] = await db.query(`
            SELECT COUNT(*) AS total_products,
                   COALESCE(SUM(quantity), 0) AS total_units,
                   COALESCE(SUM(CASE WHEN quantity <= reorder_level THEN 1 ELSE 0 END), 0) AS low_stock
            FROM products
        `);
        const [[supplierStats]] = await db.query('SELECT COUNT(*) AS total_suppliers FROM suppliers');
        const [[transactionStats]] = await db.query('SELECT COUNT(*) AS total_transactions FROM stock_transactions');
        res.json({
            success: true,
            stats: {
                totalProducts: productStats.total_products,
                totalUnits: productStats.total_units,
                lowStock: productStats.low_stock,
                totalSuppliers: supplierStats.total_suppliers,
                totalTransactions: transactionStats.total_transactions
            }
        });
    } catch (error) {
        sendError(res, error);
    }
});

// PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY product_id DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        sendError(res, error);
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { product_name, category, price, quantity, reorder_level } = req.body;
        if (!product_name?.trim() || !category?.trim() ||
            price === '' || !Number.isFinite(Number(price)) || Number(price) < 0 ||
            !Number.isInteger(Number(quantity)) || Number(quantity) < 0 ||
            !Number.isInteger(Number(reorder_level)) || Number(reorder_level) < 0) {
            return res.status(400).json({ success: false, message: 'Enter valid product details. Price, quantity and reorder level cannot be negative.' });
        }

        const [result] = await db.query(
            `INSERT INTO products (product_name, category, price, quantity, reorder_level)
             VALUES (?, ?, ?, ?, ?)`,
            [product_name.trim(), category.trim(), Number(price), Number(quantity), Number(reorder_level)]
        );
        res.status(201).json({ success: true, message: 'Product added successfully.', id: result.insertId });
    } catch (error) {
        sendError(res, error);
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { product_name, category, price, quantity, reorder_level } = req.body;
        if (!validPositiveInteger(id) || !product_name?.trim() || !category?.trim() ||
            price === '' || !Number.isFinite(Number(price)) || Number(price) < 0 ||
            !Number.isInteger(Number(quantity)) || Number(quantity) < 0 ||
            !Number.isInteger(Number(reorder_level)) || Number(reorder_level) < 0) {
            return res.status(400).json({ success: false, message: 'Enter valid product details.' });
        }

        const [result] = await db.query(
            `UPDATE products SET product_name=?, category=?, price=?, quantity=?, reorder_level=?
             WHERE product_id=?`,
            [product_name.trim(), category.trim(), Number(price), Number(quantity), Number(reorder_level), id]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Product not found.' });
        res.json({ success: true, message: 'Product updated successfully.' });
    } catch (error) {
        sendError(res, error);
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM products WHERE product_id=?', [Number(req.params.id)]);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Product not found.' });
        res.json({ success: true, message: 'Product deleted successfully.' });
    } catch (error) {
        sendError(res, error);
    }
});

// SUPPLIERS
app.get('/api/suppliers', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM suppliers ORDER BY supplier_id DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        sendError(res, error);
    }
});

app.post('/api/suppliers', async (req, res) => {
    try {
        const { name, company, phone, email, address } = req.body;
        if (!name?.trim() || !company?.trim()) {
            return res.status(400).json({ success: false, message: 'Supplier name and company are required.' });
        }
        const [result] = await db.query(
            'INSERT INTO suppliers (name, company, phone, email, address) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), company.trim(), phone || null, email || null, address || null]
        );
        res.status(201).json({ success: true, message: 'Supplier added successfully.', id: result.insertId });
    } catch (error) {
        sendError(res, error);
    }
});

app.put('/api/suppliers/:id', async (req, res) => {
    try {
        const { name, company, phone, email, address } = req.body;
        if (!name?.trim() || !company?.trim()) {
            return res.status(400).json({ success: false, message: 'Supplier name and company are required.' });
        }
        const [result] = await db.query(
            'UPDATE suppliers SET name=?, company=?, phone=?, email=?, address=? WHERE supplier_id=?',
            [name.trim(), company.trim(), phone || null, email || null, address || null, Number(req.params.id)]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Supplier not found.' });
        res.json({ success: true, message: 'Supplier updated successfully.' });
    } catch (error) {
        sendError(res, error);
    }
});

app.delete('/api/suppliers/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM suppliers WHERE supplier_id=?', [Number(req.params.id)]);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Supplier not found.' });
        res.json({ success: true, message: 'Supplier deleted successfully.' });
    } catch (error) {
        sendError(res, error);
    }
});

// TRANSACTIONS: Purchase adds stock; Sale removes stock.
app.get('/api/transactions', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT st.transaction_id, st.product_id, st.supplier_id,
                   p.product_name, s.name AS supplier_name,
                   st.transaction_type, st.quantity, st.transaction_date
            FROM stock_transactions st
            INNER JOIN products p ON p.product_id = st.product_id
            INNER JOIN suppliers s ON s.supplier_id = st.supplier_id
            ORDER BY st.transaction_id DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        sendError(res, error);
    }
});

app.post('/api/transactions', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { product_id, supplier_id, transaction_type, quantity, transaction_date } = req.body;
        if (!validPositiveInteger(product_id) || !validPositiveInteger(supplier_id) ||
            !['Purchase', 'Sale'].includes(transaction_type) ||
            !validPositiveInteger(quantity) || !/^\d{4}-\d{2}-\d{2}$/.test(transaction_date || '')) {
            return res.status(400).json({ success: false, message: 'Enter valid transaction details.' });
        }

        await connection.beginTransaction();

        const [products] = await connection.query(
            'SELECT quantity FROM products WHERE product_id=? FOR UPDATE', [Number(product_id)]
        );
        if (!products.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Selected product was not found.' });
        }

        const [suppliers] = await connection.query(
            'SELECT supplier_id FROM suppliers WHERE supplier_id=?', [Number(supplier_id)]
        );
        if (!suppliers.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Selected supplier was not found.' });
        }

        const currentStock = Number(products[0].quantity);
        const amount = Number(quantity);
        if (transaction_type === 'Sale' && amount > currentStock) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `Not enough stock. Available quantity: ${currentStock}.` });
        }

        const newStock = transaction_type === 'Purchase' ? currentStock + amount : currentStock - amount;
        await connection.query('UPDATE products SET quantity=? WHERE product_id=?', [newStock, Number(product_id)]);
        await connection.query(
            `INSERT INTO stock_transactions
             (product_id, supplier_id, transaction_type, quantity, transaction_date)
             VALUES (?, ?, ?, ?, ?)`,
            [Number(product_id), Number(supplier_id), transaction_type, amount, transaction_date]
        );

        await connection.commit();
        res.status(201).json({ success: true, message: `${transaction_type} recorded. Stock updated to ${newStock}.` });
    } catch (error) {
        await connection.rollback();
        sendError(res, error);
    } finally {
        connection.release();
    }
});

// Friendly fallback for unknown API routes
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'API route not found.' });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
