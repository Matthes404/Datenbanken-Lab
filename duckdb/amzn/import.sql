ATTACH '' AS postgres (TYPE postgres, READ_ONLY);
COPY postgres.customers TO 'customers.parquet';
COPY postgres.products TO 'products.parquet';
COPY postgres.orders TO 'orders.parquet';
COPY postgres.order_positions TO 'order_positions.parquet';

ATTACH 'ndbk.db' AS ndbk;
USE ndbk;

DROP TABLE IF EXISTS customers;
CREATE TABLE customers AS SELECT * FROM read_parquet('customers.parquet');

DROP TABLE IF EXISTS products;
CREATE TABLE products AS SELECT * FROM read_parquet('products.parquet');

DROP TABLE IF EXISTS orders;
CREATE TABLE orders AS SELECT * FROM read_parquet('orders.parquet');

DROP TABLE IF EXISTS order_positions;
CREATE TABLE order_positions AS SELECT * FROM read_parquet('order_positions.parquet');

-- view for transactional query
drop view if exists order_details;
create view order_details as
	select o.id, o.order_date, o.customer_id, c.name, c.gender, op.id as op_id, op.product_id, p.title, p.price, op.buying_price, op.quantity
	from orders o
		join order_positions op on o.id = op.order_id
		join customers c on o.customer_id = c.id
		join products p on op.product_id = p.id;

-- view for analytical query
drop view if exists analytical_query_amzn;
create view analytical_query_amzn as
      select
            category,
            count(distinct p.id) as products,
            count(distinct op.order_id) as orders,
            sum(buying_price * quantity) as revenue
      from products p join order_positions op on p.id = op.product_id
      group by category;

USE memory; -- select other database to detach ndbk
DETACH ndbk;