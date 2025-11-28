const { MongoClient } = require('mongodb')
const fs = require('fs')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:secret@mongodb:27017/ndbk?authSource=admin'
const SCENARIO = process.env.SCENARIO || 'amzn'

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',')
  
  return lines.slice(1).map(line => {
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

async function importData() {
  const client = new MongoClient(MONGODB_URI)
  const dataPath = `/data/${SCENARIO}`
  
  try {
    await client.connect()
    console.log('Connected to MongoDB')
    console.log(`Importing from: ${dataPath}`)
    
    const db = client.db('ndbk')
    
    // Drop existing collections
    const collections = await db.listCollections().toArray()
    for (const col of collections) {
      await db.dropCollection(col.name)
      console.log(`Dropped collection: ${col.name}`)
    }
    
    // Import Customers
    const customers = parseCSV(`${dataPath}/customers.csv`)
    const customerIdMap = new Map()
    
    const customerDocs = customers.map(c => ({
      originalId: c.id,
      doc: { name: c.name, gender: c.gender }
    }))
    
    const customersResult = await db.collection('customers').insertMany(
      customerDocs.map(c => c.doc)
    )
    
    customerDocs.forEach((c, i) => {
      customerIdMap.set(c.originalId, customersResult.insertedIds[i])
    })
    console.log(`Imported ${customers.length} customers`)
    
    // Import Products
    const products = parseCSV(`${dataPath}/products.csv`)
    const productIdMap = new Map()
    
    const productDocs = products.map(p => ({
      originalId: p.id,
      doc: {
        title: p.title,
        category: p.category,
        price: parseFloat(p.price),
        in_stock: parseInt(p.in_stock)
      }
    }))
    
    const productsResult = await db.collection('products').insertMany(
      productDocs.map(p => p.doc)
    )
    
    productDocs.forEach((p, i) => {
      productIdMap.set(p.originalId, productsResult.insertedIds[i])
    })
    console.log(`Imported ${products.length} products`)
    
    // Import Orders with Positions
    const orders = parseCSV(`${dataPath}/orders.csv`)
    const orderPositions = parseCSV(`${dataPath}/order_positions.csv`)
    
    // Group positions by order_id
    const positionsByOrder = new Map()
    for (const pos of orderPositions) {
      const orderId = pos.order_id
      if (!positionsByOrder.has(orderId)) {
        positionsByOrder.set(orderId, [])
      }
      positionsByOrder.get(orderId).push({
        product_id: productIdMap.get(pos.product_id),
        quantity: parseInt(pos.quantity),
        buying_price: parseFloat(pos.buying_price)
      })
    }
    
    const orderDocs = orders.map(o => ({
      customer_id: customerIdMap.get(o.customer_id),
      order_date: new Date(o.order_date),
      positions: positionsByOrder.get(o.id) || []
    }))
    
    await db.collection('orders').insertMany(orderDocs)
    console.log(`Imported ${orders.length} orders`)
    
    // Create indexes
    await db.collection('orders').createIndex({ customer_id: 1 })
    await db.collection('orders').createIndex({ order_date: -1 })
    await db.collection('products').createIndex({ category: 1 })
    await db.collection('products').createIndex({ title: 1 })
    console.log('Created indexes')
    
    console.log('Import completed successfully!')
    
  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

importData()