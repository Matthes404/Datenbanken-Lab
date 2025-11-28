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