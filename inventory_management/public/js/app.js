const API = {
    products: '/api/products',
    suppliers: '/api/suppliers',
    transactions: '/api/transactions',
    dashboard: '/api/dashboard'
};

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[char]);
}

function showMessage(element, message, type = '') {
    if (!element) return;
    element.textContent = message;
    element.className = `message ${type}`.trim();
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    let result;
    try { result = await response.json(); }
    catch { throw new Error('The server returned an invalid response.'); }
    if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Request failed.');
    }
    return result;
}

function todayISO() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

// DASHBOARD
async function initDashboard() {
    if (!$('totalProducts')) return;
    const dateLabel = $('todayLabel');
    if (dateLabel) dateLabel.textContent = new Date().toLocaleDateString(undefined, {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
    try {
        const result = await apiRequest(API.dashboard);
        const s = result.stats;
        $('totalProducts').textContent = s.totalProducts;
        $('totalUnits').textContent = s.totalUnits;
        $('lowStock').textContent = s.lowStock;
        $('totalSuppliers').textContent = s.totalSuppliers;
        $('totalTransactions').textContent = s.totalTransactions;
    } catch (error) {
        ['totalProducts', 'totalUnits', 'lowStock', 'totalSuppliers', 'totalTransactions']
            .forEach(id => { if ($(id)) $(id).textContent = '—'; });
        console.error(error);
    }
}

// PRODUCTS
let productsCache = [];

async function loadProducts() {
    const result = await apiRequest(API.products);
    productsCache = result.data;
    renderProducts(productsCache);
    return productsCache;
}

function renderProducts(products) {
    const tbody = $('productTable');
    if (!tbody) return;
    if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No products found.</td></tr>';
        return;
    }
    tbody.innerHTML = products.map(p => {
        const low = Number(p.quantity) <= Number(p.reorder_level);
        return `<tr>
            <td>${p.product_id}</td>
            <td><strong>${escapeHTML(p.product_name)}</strong></td>
            <td>${escapeHTML(p.category)}</td>
            <td>₹${Number(p.price).toFixed(2)}</td>
            <td>${p.quantity}</td>
            <td>${p.reorder_level}</td>
            <td><span class="status-pill ${low ? 'status-low' : 'status-ok'}">${low ? 'Low stock' : 'In stock'}</span></td>
            <td><div class="row-actions">
                <button class="small-btn" data-action="edit" data-id="${p.product_id}">Edit</button>
                <button class="small-btn delete" data-action="delete" data-id="${p.product_id}">Delete</button>
            </div></td>
        </tr>`;
    }).join('');
}

function resetProductForm() {
    $('productForm')?.reset();
    $('productId').value = '';
    $('formTitle').textContent = 'Add new product';
    $('saveBtn').textContent = 'Save product';
    $('cancelBtn').classList.add('hidden');
    $('reorderLevel').value = 5;
    showMessage($('formMessage'), '');
}

async function initProducts() {
    if (!$('productForm')) return;
    const form = $('productForm');
    const tbody = $('productTable');
    const message = $('formMessage');

    try { await loadProducts(); }
    catch (error) { showMessage($('tableMessage'), error.message, 'error'); }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = $('productId').value;
        const payload = {
            product_name: $('productName').value.trim(),
            category: $('category').value.trim(),
            price: $('price').value,
            quantity: $('quantity').value,
            reorder_level: $('reorderLevel').value
        };
        try {
            const result = await apiRequest(id ? `${API.products}/${id}` : API.products, {
                method: id ? 'PUT' : 'POST', body: JSON.stringify(payload)
            });
            showMessage(message, result.message, 'success');
            resetProductForm();
            await loadProducts();
        } catch (error) { showMessage(message, error.message, 'error'); }
    });

    $('cancelBtn').addEventListener('click', resetProductForm);

    tbody.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const id = Number(button.dataset.id);
        const product = productsCache.find(p => Number(p.product_id) === id);
        if (!product) return;

        if (button.dataset.action === 'edit') {
            $('productId').value = product.product_id;
            $('productName').value = product.product_name;
            $('category').value = product.category;
            $('price').value = product.price;
            $('quantity').value = product.quantity;
            $('reorderLevel').value = product.reorder_level;
            $('formTitle').textContent = 'Edit product';
            $('saveBtn').textContent = 'Update product';
            $('cancelBtn').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (button.dataset.action === 'delete') {
            if (!confirm(`Delete "${product.product_name}"?`)) return;
            try {
                const result = await apiRequest(`${API.products}/${id}`, { method: 'DELETE' });
                showMessage($('tableMessage'), result.message, 'success');
                await loadProducts();
            } catch (error) { showMessage($('tableMessage'), error.message, 'error'); }
        }
    });

    $('searchInput').addEventListener('input', (event) => {
        const term = event.target.value.toLowerCase();
        renderProducts(productsCache.filter(p =>
            [p.product_name, p.category, p.product_id].some(v => String(v).toLowerCase().includes(term))
        ));
    });
}

// SUPPLIERS
let suppliersCache = [];

async function loadSuppliers() {
    const result = await apiRequest(API.suppliers);
    suppliersCache = result.data;
    renderSuppliers(suppliersCache);
    return suppliersCache;
}

function renderSuppliers(suppliers) {
    const tbody = $('supplierTable');
    if (!tbody) return;
    if (!suppliers.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No suppliers found.</td></tr>';
        return;
    }
    tbody.innerHTML = suppliers.map(s => `<tr>
        <td>${s.supplier_id}</td>
        <td><strong>${escapeHTML(s.name)}</strong></td>
        <td>${escapeHTML(s.company)}</td>
        <td>${escapeHTML(s.phone || '—')}</td>
        <td>${escapeHTML(s.email || '—')}</td>
        <td>${escapeHTML(s.address || '—')}</td>
        <td><div class="row-actions">
            <button class="small-btn" data-action="edit" data-id="${s.supplier_id}">Edit</button>
            <button class="small-btn delete" data-action="delete" data-id="${s.supplier_id}">Delete</button>
        </div></td>
    </tr>`).join('');
}

function resetSupplierForm() {
    $('supplierForm')?.reset();
    $('supplierId').value = '';
    $('supplierFormTitle').textContent = 'Add new supplier';
    $('supplierSaveBtn').textContent = 'Save supplier';
    $('supplierCancelBtn').classList.add('hidden');
    showMessage($('supplierFormMessage'), '');
}

async function initSuppliers() {
    if (!$('supplierForm')) return;
    try { await loadSuppliers(); }
    catch (error) { showMessage($('supplierTableMessage'), error.message, 'error'); }

    $('supplierForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = $('supplierId').value;
        const payload = {
            name: $('supplierName').value.trim(),
            company: $('company').value.trim(),
            phone: $('phone').value.trim(),
            email: $('email').value.trim(),
            address: $('address').value.trim()
        };
        try {
            const result = await apiRequest(id ? `${API.suppliers}/${id}` : API.suppliers, {
                method: id ? 'PUT' : 'POST', body: JSON.stringify(payload)
            });
            showMessage($('supplierFormMessage'), result.message, 'success');
            resetSupplierForm();
            await loadSuppliers();
        } catch (error) { showMessage($('supplierFormMessage'), error.message, 'error'); }
    });

    $('supplierCancelBtn').addEventListener('click', resetSupplierForm);

    $('supplierTable').addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const id = Number(button.dataset.id);
        const supplier = suppliersCache.find(s => Number(s.supplier_id) === id);
        if (!supplier) return;

        if (button.dataset.action === 'edit') {
            $('supplierId').value = supplier.supplier_id;
            $('supplierName').value = supplier.name;
            $('company').value = supplier.company;
            $('phone').value = supplier.phone || '';
            $('email').value = supplier.email || '';
            $('address').value = supplier.address || '';
            $('supplierFormTitle').textContent = 'Edit supplier';
            $('supplierSaveBtn').textContent = 'Update supplier';
            $('supplierCancelBtn').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (button.dataset.action === 'delete') {
            if (!confirm(`Delete supplier "${supplier.name}"?`)) return;
            try {
                const result = await apiRequest(`${API.suppliers}/${id}`, { method: 'DELETE' });
                showMessage($('supplierTableMessage'), result.message, 'success');
                await loadSuppliers();
            } catch (error) { showMessage($('supplierTableMessage'), error.message, 'error'); }
        }
    });

    $('supplierSearch').addEventListener('input', (event) => {
        const term = event.target.value.toLowerCase();
        renderSuppliers(suppliersCache.filter(s =>
            [s.name, s.company, s.phone, s.email, s.address].some(v => String(v || '').toLowerCase().includes(term))
        ));
    });
}

// TRANSACTIONS
let transactionsCache = [];

async function loadTransactionOptions() {
    const [productsResult, suppliersResult] = await Promise.all([
        apiRequest(API.products), apiRequest(API.suppliers)
    ]);
    const productSelect = $('transactionProduct');
    const supplierSelect = $('transactionSupplier');

    productSelect.innerHTML = '<option value="">Select a product</option>' +
        productsResult.data.map(p => `<option value="${p.product_id}">${escapeHTML(p.product_name)} (Stock: ${p.quantity})</option>`).join('');
    supplierSelect.innerHTML = '<option value="">Select a supplier</option>' +
        suppliersResult.data.map(s => `<option value="${s.supplier_id}">${escapeHTML(s.name)} — ${escapeHTML(s.company)}</option>`).join('');
}

async function loadTransactions() {
    const result = await apiRequest(API.transactions);
    transactionsCache = result.data;
    renderTransactions(transactionsCache);
}

function renderTransactions(transactions) {
    const tbody = $('transactionTable');
    if (!tbody) return;
    if (!transactions.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No transactions recorded yet.</td></tr>';
        return;
    }
    tbody.innerHTML = transactions.map(t => `<tr>
        <td>${t.transaction_id}</td>
        <td>${escapeHTML(String(t.transaction_date).slice(0, 10))}</td>
        <td><strong>${escapeHTML(t.product_name)}</strong></td>
        <td>${escapeHTML(t.supplier_name)}</td>
        <td><span class="${t.transaction_type === 'Purchase' ? 'type-purchase' : 'type-sale'}">${escapeHTML(t.transaction_type)}</span></td>
        <td>${t.quantity}</td>
    </tr>`).join('');
}

async function initTransactions() {
    if (!$('transactionForm')) return;
    $('transactionDate').value = todayISO();
    try {
        await loadTransactionOptions();
        await loadTransactions();
    } catch (error) {
        showMessage($('transactionTableMessage'), error.message, 'error');
    }

    $('transactionForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            product_id: $('transactionProduct').value,
            supplier_id: $('transactionSupplier').value,
            transaction_type: $('transactionType').value,
            quantity: $('transactionQuantity').value,
            transaction_date: $('transactionDate').value
        };
        try {
            const result = await apiRequest(API.transactions, {
                method: 'POST', body: JSON.stringify(payload)
            });
            showMessage($('transactionFormMessage'), result.message, 'success');
            $('transactionForm').reset();
            $('transactionDate').value = todayISO();
            await Promise.all([loadTransactionOptions(), loadTransactions()]);
        } catch (error) {
            showMessage($('transactionFormMessage'), error.message, 'error');
        }
    });

    $('transactionSearch').addEventListener('input', (event) => {
        const term = event.target.value.toLowerCase();
        renderTransactions(transactionsCache.filter(t =>
            [t.product_name, t.supplier_name, t.transaction_type, t.transaction_date, t.transaction_id]
                .some(v => String(v).toLowerCase().includes(term))
        ));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initProducts();
    initSuppliers();
    initTransactions();
});
