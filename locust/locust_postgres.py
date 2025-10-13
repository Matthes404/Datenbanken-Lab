# based on https://github.com/locustio/locust/blob/master/locust/contrib/postgres.py

from locust import User, events
import time
import psycopg


class PostgresClient:
    def __init__(self, conn_string):
        self.connection = psycopg.connect(conn_string)

    def execute_transaction(self, name, statements):
        start_time = time.time()
        try:
            for stmt in statements:
                self.connection.execute(stmt)
            self.connection.commit()
            response_time = int((time.time() - start_time) * 1000)
            events.request.fire(request_type="transaction", name=name, response_time=response_time, response_length=0)
        except Exception as e:
            self.connection.rollback()
            response_time = int((time.time() - start_time) * 1000)
            events.request.fire(request_type="transaction failure", name=name, response_time=response_time, response_length=0, exception=e)

    def close(self):
        self.connection.close()


class PostgresUser(User):
    abstract = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = PostgresClient(conn_string=self.conn_string)

    def on_stop(self):
        self.client.close()
