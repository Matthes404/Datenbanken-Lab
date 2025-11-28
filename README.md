# Repository Pattern für Multi-Database Support

## Übersicht

Diese Implementierung ermöglicht den Wechsel zwischen verschiedenen Datenbanken (Postgres, MongoDB, später Neo4j) über eine Umgebungsvariable, ohne den Anwendungscode ändern zu müssen.

## Architektur

```
src/
├── database/
│   └── database.module.ts       # Dynamisches Modul für DB-Auswahl
├── repositories/
│   ├── interfaces/              # Abstrakte Verträge
│   │   ├── product.repository.interface.ts
│   │   ├── order.repository.interface.ts
│   │   └── index.ts
│   ├── postgres/                # TypeORM Implementierung
│   │   ├── product.repository.ts
│   │   ├── order.repository.ts
│   │   └── index.ts
│   └── mongodb/                 # Mongoose Implementierung
│       ├── product.repository.ts
│       ├── order.repository.ts
│       └── index.ts
├── schemas/                     # MongoDB Schemas
│   ├── customer.schema.ts
│   ├── product.schema.ts
│   ├── order.schema.ts
│   └── index.ts
├── entities/                    # Postgres Entities (bestehend)
└── ...
```

## Funktionsweise

### 1. Interfaces definieren den Vertrag

Jedes Repository muss dieselben Methoden implementieren:

```typescript
export interface IProductRepository {
  findAll(): Promise<IProduct[]>
  findById(id: string): Promise<IProduct | null>
  findByTitle(title: string): Promise<IProduct | null>
  create(data: IProduct): Promise<IProduct>
  update(id: string, data: Partial<IProduct>): Promise<IProduct | null>
  delete(id: string): Promise<boolean>
}
```

### 2. DatabaseModule wählt die Implementierung

Basierend auf `DB_TYPE` wird die passende Implementierung injiziert:

```typescript
// .env
DB_TYPE=postgres