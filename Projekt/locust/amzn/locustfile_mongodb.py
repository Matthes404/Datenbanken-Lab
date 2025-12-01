from locust import HttpUser, between, task
from pymongo import MongoClient
import random
import os
import uuid

# ======================================
# 1) EINMALIGE DB-Verbindung & IDs Laden
# ======================================

PRODUCT_IDS = []
CUSTOMER_IDS = []
ORDER_IDS = []

def load_ids():
    global PRODUCT_IDS, CUSTOMER_IDS, ORDER_IDS

    client = MongoClient(os.getenv("MONGODB_URI"))
    db = client["ndbk"]

    # Product IDs laden
    PRODUCT_IDS = [str(doc["_id"]) for doc in db.products.find({}, {"_id": 1})]
    print(f"Loaded {len(PRODUCT_IDS)} product IDs from database.")

    # Customer IDs laden
    CUSTOMER_IDS = [str(doc["_id"]) for doc in db.customers.find({}, {"_id": 1})]
    print(f"Loaded {len(CUSTOMER_IDS)} customer IDs from database.")

    # Order IDs laden (Sample für Performance)
    ORDER_IDS = [str(doc["_id"]) for doc in db.orders.aggregate([{"$sample": {"size": 10000}}])]
    print(f"Loaded {len(ORDER_IDS)} order IDs from database.")

    client.close()


load_ids()


# ======================================
# 2) Locust-Test-Klasse
# ======================================

class MyLoadUser(HttpUser):
    wait_time = between(1, 1)  # 1 req/s

    @task(10)   # 10%
    def rest_route_1_get(self):
        product_id = random.choice(PRODUCT_IDS)
        self.client.get(f"/products/{product_id}")

    @task(10)   # 10%
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

    @task(30)   # 30%
    def rest_route_2_get_filtered(self):
        page = random.randint(1, 20)
        pageSize = random.randint(1, 10)

        possible_names = ["Tom", "Anna", "Lara", "Tim", "Erik", "Sarah", "Paul"]
        name_filter = random.choice(possible_names)

        self.client.get(
            f"/orders?page={page}&pageSize={pageSize}&customerName={name_filter}",
            name="/orders?filtered"  # ← Gruppiert alle unter diesem Namen
        )

    @task(15)   # 15%
    def rest_route_2_post(self):
        customer_id = random.choice(CUSTOMER_IDS)
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

    @task(30)   # 30%
    def graphql_query(self):
        order_id = random.choice(ORDER_IDS)

        query = """
        query GetOrder($id: ID!) {
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
