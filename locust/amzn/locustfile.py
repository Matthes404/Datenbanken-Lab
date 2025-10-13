import string, random, sys, os

sys.path.append("..")

from locust import task, between
from locust_postgres import PostgresUser


class AmznPostgresUser(PostgresUser):
    wait_time = between(0, 0.2) # 100 ms in avg

    @task(25)
    def select_customer(self):
        customer_id = random.randint(1, 10_000)
        stmts = [f"SELECT * FROM customers WHERE id = {customer_id}"]
        self.client.execute_transaction(self.select_customer.__name__, stmts)

    @task(25)
    def select_order(self):
        order_id = random.randint(1, 1_000_000)
        stmts = [f"SELECT o.id, COUNT(*), SUM(op.buying_price) FROM orders o JOIN order_positions op ON o.id = op.order_id WHERE o.id = {order_id} GROUP BY o.id"]
        self.client.execute_transaction(self.select_order.__name__, stmts)

    @task(25)
    def select_product_stats(self):
        stmts = ["WITH p AS (SELECT id FROM products ORDER BY random() LIMIT 1) SELECT p.id, COUNT(*), SUM(op.buying_price) FROM p JOIN order_positions op ON p.id = op.product_id GROUP BY p.id"]
        self.client.execute_transaction(self.select_product_stats.__name__, stmts)

    @task(25)
    def update_customer(self):
        customer_id = random.randint(1, 10_000)
        name = ''.join(random.choices(string.ascii_letters, k=10))
        stmts = [f"UPDATE customers SET name = '{name}' WHERE id = {customer_id}"]
        self.client.execute_transaction(self.update_customer.__name__, stmts)


    HOST = os.getenv("POSTGRES_HOST")
    USER = os.getenv("POSTGRES_USER")
    PASS = os.getenv("POSTGRES_PASSWORD")
    DB = os.getenv("POSTGRES_DB")

    conn_string = f"postgresql://{USER}:{PASS}@{HOST}/{DB}"
