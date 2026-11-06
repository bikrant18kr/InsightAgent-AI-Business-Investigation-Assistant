-- InsightAgent Database Schema
-- Defines orders, order_items, returns, and searchable policy document chunks

CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category_id VARCHAR(50) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    order_date DATE NOT NULL,
    region VARCHAR(50) NOT NULL,       -- e.g. North, South, East, West
    channel VARCHAR(50) NOT NULL,      -- e.g. Online, Retail, Direct
    customer_id VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id),
    category_id VARCHAR(50) REFERENCES categories(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    revenue NUMERIC(12, 2) NOT NULL CHECK (revenue >= 0),
    total_cost NUMERIC(12, 2) NOT NULL CHECK (total_cost >= 0)
);

CREATE TABLE IF NOT EXISTS order_returns (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id VARCHAR(50) REFERENCES order_items(id) ON DELETE CASCADE,
    return_date DATE NOT NULL,
    reason VARCHAR(255),
    refund_amount NUMERIC(12, 2) NOT NULL CHECK (refund_amount >= 0)
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    section VARCHAR(150) NOT NULL,
    category VARCHAR(50),
    effective_date DATE,
    content TEXT NOT NULL
);

-- Indexing for performance and searchability
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_category ON order_items(category_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_order ON order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_date ON order_returns(return_date);
