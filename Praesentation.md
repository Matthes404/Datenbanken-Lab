# Lab 3: Migration zu MongoDB

## Übersicht

Dieses Projekt demonstriert die Migration einer relationalen PostgreSQL-Datenbank zu MongoDB, inklusive einer API die beide Datenbanken unterstützt.

---

## 1. Datenmodell

### PostgreSQL (relational) - 4 Tabellen

- `customers` (id, name, gender)
- `orders` (id, order_date, customer_id)
- `order_positions` (id, order_id, product_id, quantity, buying_price)
- `products` (id, title, category, price, in_stock)

### MongoDB (dokumentenorientiert) - 3 Collections

- `customers` - Kundendaten
- `products` - Produktdaten
- `orders` - Bestellungen **mit eingebetteten Positionen**
- `category_stats` - Vorberechnete Analytics (Materialized View Äquivalent)

### Designentscheidungen

| Aspekt | PostgreSQL | MongoDB | Begründung |
|--------|------------|---------|------------|
| **Order Positions** | Separate Tabelle mit FK | Eingebettet in Orders | Komposition - Positionen existieren nicht ohne Order |
| **Customer ↔ Order** | FK in orders | Referenz via ObjectId | 1:n Beziehung, viele Orders pro Customer möglich |
| **Product ↔ Position** | FK in order_positions | Referenz via ObjectId | Produkte werden von vielen Positionen referenziert |
| **Analytics** | Materialized View | Eigene Collection | Vorberechnete Statistiken für schnelle Abfragen |

### Warum 3 statt 4 Collections?

Die `order_positions` Tabelle wurde in die `orders` Collection **eingebettet**, weil:

1. **Komposition**: Positionen gehören immer zu genau einer Bestellung
2. **Gemeinsamer Zugriff**: Bestellungen werden fast immer mit ihren Positionen abgefragt
3. **Atomare Updates**: Eine Bestellung inkl. Positionen kann atomar geschrieben werden
4. **Performance**: Kein JOIN nötig - ein Dokument enthält alle Daten

---

## 2. Datenmodell anzeigen

### Collections und Dokumentanzahl

```bash
docker-compose exec mongodb mongosh -u admin -p secret --authenticationDatabase admin ndbk --eval "
  db.getCollectionNames().forEach(c => {
    print(c + ': ' + db[c].countDocuments() + ' documents')
  })
"
```

### Beispieldokumente anzeigen

```bash
# Customer
docker-compose exec mongodb mongosh -u admin -p secret --authenticationDatabase admin ndbk --eval "db.customers.findOne()"

# Product
docker-compose exec mongodb mongosh -u admin -p secret --authenticationDatabase admin ndbk --eval "db.products.findOne()"

# Order (mit eingebetteten Positions)
docker-compose exec mongodb mongosh -u admin -p secret --authenticationDatabase admin ndbk --eval "db.orders.findOne()"

# Category Stats
docker-compose exec mongodb mongosh -u admin -p secret --authenticationDatabase admin ndbk --eval "db.category_stats.findOne()"
```

### Indizes anzeigen

```bash
docker-compose exec mongodb mongosh -u admin -p secret --authenticationDatabase admin ndbk --eval "
  db.getCollectionNames().forEach(c => {
    print('--- ' + c + ' ---');
    printjson(db[c].getIndexes())
  })
"
```

---

## 3. Import der Daten

```bash
# MongoDB starten
docker-compose up -d mongodb

# Daten importieren
docker-compose run --rm mongo-import
```

### Import-Ablauf

1. CSV-Dateien lesen aus `import/data/{SCENARIO}/`
2. ID-Mapping erstellen: PostgreSQL IDs → MongoDB ObjectIds
3. Collections befüllen: customers, products, orders
4. Positionen einbetten: order_positions werden direkt in orders eingebettet
5. Indizes erstellen
6. Analytics generieren: category_stats Collection vorberechnen

---

## 4. API mit Datenbankwechsel

### Datenbank wechseln

In `.env`:

```env
DB_TYPE=postgres  # oder mongodb
```

Dann:

```bash
docker-compose up -d --build api
```

### API testen

```bash
# Orders abrufen
curl http://localhost:3000/orders

# Einzelne Order
curl http://localhost:3000/orders/{id}

# Analytics
curl http://localhost:3000/analytics

# Analytics neu berechnen (nur MongoDB)
curl -X POST http://localhost:3000/analytics/refresh
```

---

## 5. Projektstruktur

```
src/
├── database/
│   └── database.module.ts       # Dynamischer DB-Wechsel
├── repositories/
│   ├── interfaces/              # Abstrakte Verträge
│   ├── postgres/                # TypeORM Implementierung
│   └── mongodb/                 # Mongoose Implementierung
├── schemas/                     # MongoDB Schemas
├── entities/                    # PostgreSQL Entities
└── ...
```

---

## 6. Befehle Übersicht

| Aktion | Befehl |
|--------|--------|
| MongoDB starten | `docker-compose up -d mongodb` |
| Daten importieren | `docker-compose run --rm mongo-import` |
| API starten | `docker-compose up -d --build api` |
| MongoDB Shell | `docker-compose exec mongodb mongosh -u admin -p secret --authenticationDatabase admin ndbk` |
| Analytics refreshen | `curl -X POST http://localhost:3000/analytics/refresh` |

Natürlich — hier ist **alles vollständig als saubere Markdown-Datei**, ohne zusätzliche Erklär- oder Systemtexte außenrum ✔
→ Du kannst das **1:1 in deine Abgabe übernehmen**.

---

# Lab 3: Migration zu Neo4j
## 1. Datenmodell (relational → graphbasiert)

### Relationales Modell

| Tabelle         | Beschreibung      |
| --------------- | ----------------- |
| customers       | Kundendaten       |
| products        | Produktdaten      |
| orders          | Bestellungen      |
| order_positions | Bestellpositionen |

### Neo4j Graph-Modell

| Knoten (Nodes)  | Eigenschaften                        |
| --------------- | ------------------------------------ |
| `Customer`      | id, name, gender                     |
| `Order`         | id, order_date                       |
| `Product`       | id, title, category, price, in_stock |
| `CategoryStats` | category, products, orders, revenue  |

| Beziehung (Edges)                  | Bedeutung             |
| ---------------------------------- | --------------------- |
| `(:Customer)-[:PLACED]->(:Order)`  | Kunde bestellt Order  |
| `(:Order)-[:CONTAINS]->(:Product)` | Order enthält Produkt |

---

## 2. Datenimport

Import aus CSV nur, wenn Neo4j noch leer ist:

```bash
docker compose run --rm neo4j-import
```

CSV-Quelle:

```
/data/amzn/
```

### Ablauf im Importer

| Schritt                    | Ergebnis                             |
| -------------------------- | ------------------------------------ |
| CSVs einlesen              | Kunden, Produkte, Orders, Positionen |
| Knoten erzeugen            | Customer, Product, Order             |
| Beziehungen erzeugen       | PLACED, CONTAINS                     |
| CategoryStats vorberechnen | Performance-Optimierung              |

## 3️. Vorberechnete Neo4j Analytics (Materialized View Konzept)

Zur Performance-Optimierung wurde `CategoryStats` einmal vorher berechnet und als Knoten angelegt:

#### Cypher:

```cypher
MATCH (c:Customer)-[:PLACED]->(o:Order)-[r:CONTAINS]->(p:Product)
        WITH
          p.category AS category,
          count(DISTINCT p) AS productsCount,
          count(DISTINCT o) AS ordersCount,
          sum(toFloat(r.quantity) * toFloat(r.buying_price)) AS revenue
        MERGE (cs:CategoryStats { category: category })
        SET cs.products = productsCount,
            cs.orders   = ordersCount,
            cs.revenue  = revenue
```


---

## 4️. API-Konfiguration und DB-Umschaltung

`.env`:

```env
DB_TYPE=neo4j
```

Die API nutzt **Repositories**:

| Interface              | Neo4j-Implementierung    |
| ---------------------- | ------------------------ |
| `IProductRepository`   | Neo4jProductRepository   |
| `IOrderRepository`     | Neo4jOrderRepository     |
| `IAnalyticsRepository` | Neo4jAnalyticsRepository |

---

## 5️. Endpunkte testen

### REST

```
http://localhost:3000/orders
http://localhost:3000/products/zfdoss
http://localhost:3000/analytics
http://localhost:3000/orders?page=1&pageSize=2&customerName=Tim
```
### PATCH,DELETE
```
PATCH http://localhost:3000/products/ctamai
Content-Type: application/json

{
  "title": "New Title",
  "price": 12,
  "in_stock": 5
}

DELETE  http://localhost:3000/products/ctamai

```

### GraphQL Playground

```graphql
query {
      order(id: ?) {
      id
    order_date
    customer {
      name
    }
    positions { 
      quantity
      buying_price
      product {
        title
        category   
      }
    }
  }
}
```

---

## 6️. Graph-Visualisierung

```cypher
MATCH (c:Customer)-[:PLACED]->(o:Order)-[:CONTAINS]->(p:Product)
RETURN c, o, p LIMIT 50;
```

![image](graph.png)

---

## 7️. Lasttest (Locust)

Failed leider noch Problem hat wahrscheinlich mit Memory Problem zu tun.



---

## 8️. Struktur Neo4j

```
src/
├── database/
│   └── database.module.ts
├── repositories/
│   ├── neo4j/
│   │   ├── product.repository.ts
│   │   ├── order.repository.ts
│   │   ├── analytics.repository.ts
│   │   └── index.ts
└── ...
```