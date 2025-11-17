from locust import HttpUser, between, task
import psycopg
import random
import os
import uuid

# ======================================
# 1) EINMALIGE DB-Verbindung & Product-ID Laden
# ======================================

PRODUCT_IDS = []

def load_product_ids():
    global PRODUCT_IDS

    conn = psycopg.connect(
        host=os.getenv("POSTGRES_HOST"),
        port=os.getenv("POSTGRES_PORT"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        dbname=os.getenv("POSTGRES_DB"),
    )
    cur = conn.cursor()

    cur.execute("SELECT id FROM products;")
    rows = cur.fetchall()

    PRODUCT_IDS = [row[0] for row in rows]

    cur.close()
    conn.close()

    print(f"Loaded {len(PRODUCT_IDS)} product IDs from database.")


load_product_ids()   # wird beim Start ausgeführt


# ======================================
# 2) Locust-Test-Klasse
# ======================================

class MyLoadUser(HttpUser):
    wait_time = between(1, 1)  # 1 req/s

    @task(10)   # 10%
    def rest_route_1_get(self):
        product_id = random.choice(PRODUCT_IDS)
        self.client.get(f"/products/{product_id}")

    @task(10) # 1o%
    def rest_route_1_patch(self):
        product_id = random.choice(PRODUCT_IDS)
        unique_title = f"Updated-{uuid.uuid4().hex}"

        self.client.patch(
            f"/products/{product_id}",
            json={
                "title": unique_title,
                "in_stock": random.randint(0, 500),
                "price": random.randint(1, 200)
            }
        )

    @task(30)
    def rest_route_2_get_filtered(self):
        page = random.randint(1, 20)
        pageSize = random.randint(1, 10)

        possible_names = ["Tom", "Anna", "Lara", "Tim", "Erik", "Sarah", "Paul"]
        name_filter = random.choice(possible_names)

        self.client.get(
            f"/orders?page={page}&pageSize={pageSize}&customerName={name_filter}"
        )


    @task(15)
    def rest_route_2_post(self):
    # Zufälliger Kunde
      customer_id = random.randint(1, 19976)

    # Eine zufällige Position erzeugen
      product_id = random.choice(PRODUCT_IDS)

      payload = {
       "orderDate": "2025-01-04T00:00:00Z",
        "customerId": customer_id,
        "positions": [
        {
            "productId": product_id,
            "quantity": random.randint(1, 5),
            "buyingPrice": round(random.uniform(1, 99), 2)
        }
    ]
}

      self.client.post("/orders", json=payload)

    @task(5)    # 5%
    def rest_route_3(self):
        self.client.get("/analytics")


    @task(30)  # 30%
    def graphql_query(self):
        order_id = random.randint(1, 1205494)

        query = """
        query GetOrder($id: Int!) {
          order(id: $id) {
            id
            order_date
            customer { name }
            positions {
              quantity
              buying_price
              product {
                title
                price
              }
            }
          }
        }
        """

        variables = {"id": order_id}

        self.client.post(
            "/graphql",
            json={"query": query, "variables": variables}
        )

