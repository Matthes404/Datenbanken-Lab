# Lab 4: Kafka Stream Processing - AMZN Szenario

## 1. Docker Services

| Service | Image | Zweck |
|---------|-------|-------|
| `kafka` | apache/kafka:3.7.0 | Message Broker|
| `ksqldb` | confluentinc/ksqldb-server:0.29.0 | Stream Processing Engine |
| `kafka-ui` | provectuslabs/kafka-ui | Debug UI für Topics (optional) |
| `kafka-producer` | Custom Node.js | Mock-Daten Producer |

## 2. ksqlDB Queries

### 2.1 Stream aus Raw-Topic erstellen

Definiert das Schema für eingehende Reviews aus dem Kafka Topic.

~~~sql
CREATE STREAM reviews_raw (
  product_id VARCHAR,
  rating INT,
  review_text VARCHAR,
  timestamp VARCHAR
) WITH (
  KAFKA_TOPIC='raw-reviews',
  VALUE_FORMAT='JSON'
);
~~~

### 2.2 Gefilterten Stream erstellen

Filtert Reviews mit unangemessener Sprache. Schreibt automatisch in neues Topic `REVIEWS_FILTERED`.

~~~sql
CREATE STREAM reviews_filtered AS
  SELECT *
  FROM reviews_raw
  WHERE LCASE(review_text) NOT LIKE '%fuck%'
    AND LCASE(review_text) NOT LIKE '%shit%'
  EMIT CHANGES;
~~~

### 2.3 Windowed Aggregation

Gruppiert nach `product_id` in 30-Sekunden-Fenstern. Berechnet Anzahl und Durchschnittsbewertung.

~~~sql
CREATE TABLE reviews_aggregated 
  WITH (KAFKA_TOPIC='aggregated-reviews') AS
  SELECT 
    product_id,
    AS_VALUE(product_id) AS product_id_value,
    WINDOWSTART AS window_start,
    WINDOWEND AS window_end,
    COUNT(*) AS review_count,
    AVG(rating) AS avg_rating
  FROM reviews_filtered
  WINDOW TUMBLING (SIZE 30 SECONDS)
  GROUP BY product_id
  EMIT FINAL;
~~~

## 3. API Endpoints

### SSE Streams

| Endpoint | Beschreibung | Daten |
|----------|--------------|-------|
| `GET /events/reviews` | Live gefilterte Reviews | `{ PRODUCT_ID, RATING, REVIEW_TEXT, TIMESTAMP }` |
| `GET /events/aggregates` | Aggregierte Werte pro Zeitfenster | `{ PRODUCT_ID_VALUE, REVIEW_COUNT, AVG_RATING, WINDOW_START, WINDOW_END }` |

### Beispiel EventSource (JavaScript)

~~~javascript
const reviews = new EventSource('http://localhost:3000/events/reviews');
reviews.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log(data);
};
~~~

## 4. Setup / Demo

### Alle Services starten

~~~bash
docker-compose up -d kafka ksqldb kafka-ui kafka-producer api
~~~

### ksqlDB Queries einrichten

~~~bash
docker-compose exec ksqldb ksql http://localhost:8088
~~~

Dann die drei Queries aus Abschnitt 2 ausführen.

### URLs

| Service | URL |
|---------|-----|
| API Reviews | http://localhost:3000/events/reviews |
| API Aggregates | http://localhost:3000/events/aggregates |
| Kafka UI | http://localhost:8080 |
| ksqlDB | http://localhost:8088/ |


### PostgreSQL Stats prüfen

~~~bash
docker-compose exec postgres psql -U ndbk -d ndbk -c "SELECT * FROM product_stats;"
~~~