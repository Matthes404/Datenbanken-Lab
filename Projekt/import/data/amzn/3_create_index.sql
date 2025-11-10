CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);  
CREATE INDEX IF NOT EXISTS idx_order_positions_order_id ON order_positions(order_id);  
CREATE INDEX IF NOT EXISTS idx_order_positions_product_id ON order_positions(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE MATERIALIZED VIEW mv_category_stats AS SELECT p.category, COUNT(DISTINCT p.id) AS products, COUNT(DISTINCT o.id) AS orders, SUM(op.quantity * op.buying_price) AS revenue FROM products p JOIN order_positions op ON op.product_id = p.id JOIN orders o ON op.order_id = o.id GROUP BY p.category;