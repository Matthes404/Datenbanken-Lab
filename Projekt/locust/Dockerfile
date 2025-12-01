FROM locustio/locust:latest

WORKDIR /app

RUN pip install "psycopg[binary]"
RUN pip install "pymongo"

COPY . .