# Lab 3: Migration zu MongoDB
---

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


## 1. Datenmodell
# MongoDB Collections

## Collection: `customers`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `_id` | ObjectId | Automatisch generierte ID |
| `name` | String | Kundenname |
| `gender` | String | Geschlecht ("m" oder "f") |

## Collection: `products`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `_id` | ObjectId | Automatisch generierte ID |
| `title` | String | Produktname |
| `category` | String | Kategorie |
| `price` | Number | Aktueller Preis |
| `in_stock` | Number | Lagerbestand |

## Collection: `orders`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `_id` | ObjectId | Automatisch generierte ID |
| `customer_id` | ObjectId | Referenz auf customers Collection |
| `order_date` | Date | Bestelldatum |
| `positions` | Array | Eingebettete Bestellpositionen |
| `positions[].product_id` | ObjectId | Referenz auf products Collection |
| `positions[].quantity` | Number | Bestellmenge |
| `positions[].buying_price` | Number | Preis zum Kaufzeitpunkt |

## Collection: `category_stats`

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `category` | String | Produktkategorie |
| `products` | Number | Anzahl Produkte in dieser Kategorie |
| `orders` | Number | Anzahl Bestellungen mit Produkten dieser Kategorie |
| `revenue` | Number | Gesamtumsatz der Kategorie |
| `updated_at` | Date | Zeitpunkt der letzten Berechnung |

### Warum 3 statt 4 Collections?

Die `order_positions` Tabelle wurde in die `orders` Collection **eingebettet**, weil:

1. **Komposition**: Positionen gehören immer zu genau einer Bestellung
2. **Gemeinsamer Zugriff**: Bestellungen werden fast immer mit ihren Positionen abgefragt
3. **Performance**: Kein JOIN nötig - ein Dokument enthält alle Daten

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

## 6. Befehle Übersicht

| Aktion | Befehl |
|--------|--------|
| MongoDB starten | `docker-compose up -d mongodb` |
| Daten importieren | `docker-compose run --rm mongo-import` |
| API starten | `docker-compose up -d --build api` |
| MongoDB Shell | `docker-compose exec mongodb mongosh -u admin -p secret --authenticationDatabase admin ndbk` |
| Analytics refreshen | `curl -X POST http://localhost:3000/analytics/refresh` |