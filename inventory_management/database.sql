CREATE DATABASE IF NOT EXISTS inventory_management;
USE inventory_management;

CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    company VARCHAR(150) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(100),
    address VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    transaction_type ENUM('Purchase', 'Sale') NOT NULL,
    quantity INT NOT NULL,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_transaction_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Optional sample data: run only if you want these examples.
-- Do not run repeatedly, or duplicate records will be added.
-- INSERT INTO products (product_name, category, price, quantity, reorder_level) VALUES
-- ('Laptop', 'Electronics', 55000.00, 12, 3),
-- ('Wireless Mouse', 'Electronics', 750.00, 40, 10),
-- ('Office Chair', 'Furniture', 4500.00, 8, 2);
--
-- INSERT INTO suppliers (name, company, phone, email, address) VALUES
-- ('Rahul Kumar', 'Tech Supplies', '9876543210', 'rahul@example.com', 'Kurnool'),
-- ('Priya Sharma', 'Office World', '9876501234', 'priya@example.com', 'Hyderabad');
