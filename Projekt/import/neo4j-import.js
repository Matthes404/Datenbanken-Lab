const neo4j = require('neo4j-driver')
const fs = require('fs')
const path = require('path')

// Env
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687'
const NEO4J_USER =
  process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j'
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'secretsecret'
const SCENARIO = process.env.SCENARIO || 'amzn'
const DATA_ROOT = process.env.DATA_ROOT || '/data'

// CSV-Parser
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',')

  return lines.slice(1).map((line) => {
    const values = []
    let current = ''
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    values.push(current)

    const obj = {}
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim()
    })
    return obj
  })
}

// Prüfen, ob DB leer ist
async function shouldImport(session) {
  const res = await session.run('MATCH (n) RETURN COUNT(n) AS cnt')
  const cnt = res.records[0].get('cnt').toNumber()
  if (cnt > 0) {
    console.log(
      `Neo4j enthält bereits ${cnt} Knoten – Import wird übersprungen.`
    )
    return false
  }
  console.log('Neo4j ist leer – Initialimport wird gestartet…')
  return true
}

// Batches ausführen
async function runBatched(session, cypher, rows, batchSize, label) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    await session.run(cypher, { rows: batch })
    console.log(
      `  ✔ ${label}: ${Math.min(i + batch.length, rows.length)}/${rows.length}`
    )
  }
}

// Constraints / Indexe
async function createConstraints(session) {
  console.log('Erzeuge Constraints/Indexe (falls noch nicht vorhanden)…')

  await session.run(`
    CREATE CONSTRAINT customer_id_unique IF NOT EXISTS
    FOR (c:Customer) REQUIRE c.id IS UNIQUE
  `)

  await session.run(`
    CREATE CONSTRAINT product_id_unique IF NOT EXISTS
    FOR (p:Product) REQUIRE p.id IS UNIQUE
  `)

  await session.run(`
    CREATE CONSTRAINT order_id_unique IF NOT EXISTS
    FOR (o:Order) REQUIRE o.id IS UNIQUE
  `)
}

// Customers importieren
async function importCustomers(session, customers) {
  const batchSize = 2000
  console.log(`Importiere ${customers.length} Customers…`)

  await runBatched(
    session,
    `
    UNWIND $rows AS row
    CREATE (:Customer {
      id: toInteger(row.id),
      name: row.name,
      gender: row.gender
    })
    `,
    customers,
    batchSize,
    'Customers'
  )
}

// Products importieren
async function importProducts(session, products) {
  const batchSize = 2000
  console.log(`Importiere ${products.length} Products…`)

  await runBatched(
    session,
    `
    UNWIND $rows AS row
    CREATE (:Product {
      id: row.id,
      title: row.title,
      category: row.category,
      price: toFloat(row.price),
      in_stock: toInteger(row.in_stock)
    })
    `,
    products,
    batchSize,
    'Products'
  )
}

// Orders & OrderPositions importieren

async function importOrdersAndPositions(session, orders, orderPositions) {
  const batchSize = 2000

  // 1) Orders + PLACED-Kante
  console.log(`Importiere ${orders.length} Orders…`)

  await runBatched(
    session,
    `
    UNWIND $rows AS row
    MATCH (c:Customer { id: toInteger(row.customer_id) })
    MERGE (c)-[:PLACED]->(o:Order { id: toInteger(row.id) })
    ON CREATE SET o.order_date = row.order_date
    `,
    orders,
    batchSize,
    'Orders'
  )

  orders.length = 0

  // 2) OrderPositions → CONTAINS-Kanten
  console.log(`Importiere ${orderPositions.length} OrderPositions…`)

  await runBatched(
    session,
    `
    UNWIND $rows AS row
    MATCH (o:Order   { id: toInteger(row.order_id) })
    MATCH (p:Product { id: row.product_id })
    CREATE (o)-[:CONTAINS {
      quantity: toInteger(row.quantity),
      buying_price: toFloat(row.buying_price)
    }]->(p)
    `,
    orderPositions,
    batchSize,
    'OrderPositions'
  )

  orderPositions.length = 0
}


// Import
async function runImport() {
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
  )
  const session = driver.session()

  try {
    console.log(`Verbinde zu Neo4j @ ${NEO4J_URI} als ${NEO4J_USER}…`)
    await driver.getServerInfo()
    console.log('Verbindung steht.')

    // Prüfen, ob DB leer ist
    const doImport = await shouldImport(session)
    if (!doImport) {
      await session.close()
      await driver.close()
      return
    }

    const dataPath = path.join(DATA_ROOT, SCENARIO)
    console.log(`Lese CSVs aus: ${dataPath}`)

    const customers = parseCSV(path.join(dataPath, 'customers.csv'))
    const products = parseCSV(path.join(dataPath, 'products.csv'))
    const orders = parseCSV(path.join(dataPath, 'orders.csv'))
    const orderPositions = parseCSV(path.join(dataPath, 'order_positions.csv'))

    console.log(
      `CSV geladen: customers=${customers.length}, products=${products.length}, orders=${orders.length}, positions=${orderPositions.length}`
    )

    await importCustomers(session, customers)
    customers.length = 0

    await importProducts(session, products)
    products.length = 0

    await createConstraints(session)

    await importOrdersAndPositions(session, orders, orderPositions)

    console.log('Neo4j-Import erfolgreich abgeschlossen!')
    await session.close()
    await driver.close()
  } catch (err) {
    console.error('Neo4j-Import fehlgeschlagen:', err)
    await session.close()
    await driver.close()
    process.exit(1)
  }
}

runImport()
