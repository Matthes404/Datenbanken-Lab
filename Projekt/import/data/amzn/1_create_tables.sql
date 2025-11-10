DROP TABLE IF EXISTS order_positions, orders, products, customers CASCADE;

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  gender CHAR(1) CHECK (gender IN ('m','f'))
);

CREATE TABLE products (
  id CHAR(6) PRIMARY KEY,
  title VARCHAR(200) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(7,2) NOT NULL CHECK (price >= 0),
  in_stock INT NOT NULL CHECK (in_stock >= 0),
  CONSTRAINT idx_p_title_category UNIQUE (title, category)
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_date DATE NOT NULL,
  customer_id INT NOT NULL,
  CONSTRAINT fk_order_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE order_positions (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  product_id CHAR(6) NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  buying_price DECIMAL(7,2) NOT NULL CHECK (buying_price >= 0),
  CONSTRAINT fk_op_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_op_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);