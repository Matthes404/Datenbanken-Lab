COPY customers FROM '/data/amzn/customers.csv' WITH (FORMAT csv, HEADER true);
SELECT setval('customers_id_seq', max(id)) FROM customers;

COPY products FROM '/data/amzn/products.csv' WITH (FORMAT csv, HEADER true);

COPY orders FROM '/data/amzn/orders.csv' WITH (FORMAT csv, HEADER true);
SELECT setval('orders_id_seq', max(id)) FROM orders;

COPY order_positions FROM '/data/amzn/order_positions.csv' WITH (FORMAT csv, HEADER true);
SELECT setval('order_positions_id_seq', max(id)) FROM order_positions;