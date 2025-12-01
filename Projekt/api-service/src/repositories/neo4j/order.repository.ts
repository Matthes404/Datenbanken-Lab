import { Inject, Injectable } from '@nestjs/common'
import neo4j, { Driver } from 'neo4j-driver'
import {
  IOrderRepository,
  IOrder,
  IOrderQuery,
  IPaginatedOrders,
  ICreateOrder,
  IOrderPosition,
} from '../interfaces/order.repository.interface'
import { IProduct } from '../interfaces/product.repository.interface'

@Injectable()
export class Neo4jOrderRepository implements IOrderRepository {
  constructor(
    @Inject('NEO4J_DRIVER')
    private readonly driver: Driver,
  ) {}

  // Neo4j-Node -> IProduct
  private nodeToProduct(pNode: any | null | undefined): IProduct | undefined {
    if (!pNode) return undefined
    const p = pNode.properties
    return {
      id: p.id,
      title: p.title,
      category: p.category,
      price: Number(p.price),
      in_stock: Number(p.in_stock),
    }
  }

    // Neo4j-Record -> IOrder
  private recordToOrder(rec: any): IOrder {
    const oNode = rec.get('o')
    const cNode = rec.get('c')
    const positionsRaw = (rec.get('positions') || []) as any[]

    const oProps = oNode.properties
    const cProps = cNode?.properties

    const order_date =
      oProps.order_date != null
        ? new Date(String(oProps.order_date))
        : new Date()

    const positions: IOrderPosition[] = positionsRaw
      .filter((entry) => !!entry)
      .map((entry) => {
        const pNode = entry.product
        const product: IProduct | undefined = pNode
          ? {
              id: pNode.properties.id,
              title: pNode.properties.title,
              category: pNode.properties.category,
              price: Number(pNode.properties.price),
              in_stock: Number(pNode.properties.in_stock),
            }
          : undefined

        return {
          product_id: pNode?.properties.id,
          quantity: Number(entry.quantity),
          buying_price: Number(entry.buying_price),
          product,
        }
      })

    // Basis-Objekt entsprechend IOrder
    const base: any = {
      id: String(oProps.id),
      customer_id: cProps?.id?.toString() ?? '',
      customer_name: cProps?.name,
      customer_gender: cProps?.gender,
      order_date,
      positions,
    }

    // verschachteltes customer-Objekt für GraphQL
    if (cProps) {
      base.customer = {
        id: String(cProps.id),
        name: cProps.name,
        gender: cProps.gender,
      }
    }

    return base as IOrder
  }


  async findAll(query: IOrderQuery): Promise<IPaginatedOrders> {
    const session = this.driver.session()

    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 25

    const limit = Math.max(0, Math.floor(pageSize))
    const skip = Math.max(0, Math.floor((page - 1) * pageSize))

    try {
      // Anzahl
      const countRes = await session.run(
        `
        MATCH (o:Order)
        OPTIONAL MATCH (c:Customer)-[:PLACED]->(o)
        WHERE
          ($customerName IS NULL OR toLower(c.name) CONTAINS toLower($customerName)) AND
          ($orderDateFrom IS NULL OR o.order_date >= $orderDateFrom) AND
          ($orderDateTo   IS NULL OR o.order_date <= $orderDateTo)
        RETURN count(DISTINCT o) AS total
        `,
        {
          customerName: query.customerName ?? null,
          orderDateFrom: query.orderDateFrom ?? null,
          orderDateTo: query.orderDateTo ?? null,
        },
      )

      const total = countRes.records[0].get('total').toNumber()

      // Daten
      const res = await session.run(
        `
        MATCH (o:Order)
        OPTIONAL MATCH (c:Customer)-[:PLACED]->(o)
        WHERE
          ($customerName IS NULL OR toLower(c.name) CONTAINS toLower($customerName)) AND
          ($orderDateFrom IS NULL OR o.order_date >= $orderDateFrom) AND
          ($orderDateTo   IS NULL OR o.order_date <= $orderDateTo)
        OPTIONAL MATCH (o)-[r:CONTAINS]->(p:Product)
        WITH o, c, collect({
          quantity: r.quantity,
          buying_price: r.buying_price,
          product: p
        }) AS positions
        ORDER BY o.order_date DESC, o.id DESC
        SKIP $skip
        LIMIT $limit
        RETURN o, c, positions
        `,
        {
          customerName: query.customerName ?? null,
          orderDateFrom: query.orderDateFrom ?? null,
          orderDateTo: query.orderDateTo ?? null,
          skip: neo4j.int(skip),
          limit: neo4j.int(limit),
        },
      )

      const orders: IOrder[] = res.records.map((record) =>
        this.recordToOrder(record),
      )

      return {
        data: orders,
        meta: {
          total,
          page,
          pageSize,
          totalPages: pageSize === 0 ? 0 : Math.ceil(total / pageSize),
        },
      }
    } finally {
      await session.close()
    }
  }

  async findById(id: string): Promise<IOrder | null> {
    const session = this.driver.session()
    try {
      const res = await session.run(
        `
        MATCH (c:Customer)-[:PLACED]->(o:Order)
        WHERE toString(o.id) = $id
        OPTIONAL MATCH (o)-[r:CONTAINS]->(p:Product)
        WITH o, c,
             collect({
               quantity: r.quantity,
               buying_price: r.buying_price,
               product: p
             }) AS positions
        RETURN o, c, positions
        `,
        { id },
      )
      if (!res.records.length) return null
      return this.recordToOrder(res.records[0])
    } finally {
      await session.close()
    }
  }

  async findByCustomerId(customerId: string): Promise<IOrder[]> {
    const session = this.driver.session()
    try {
      const res = await session.run(
        `
        MATCH (c:Customer)
        WHERE toString(c.id) = $customerId
        MATCH (c)-[:PLACED]->(o:Order)
        OPTIONAL MATCH (o)-[r:CONTAINS]->(p:Product)
        WITH o, c,
             collect({
               quantity: r.quantity,
               buying_price: r.buying_price,
               product: p
             }) AS positions
        RETURN o, c, positions
        ORDER BY o.order_date DESC, o.id DESC
        `,
        { customerId },
      )
      return res.records.map((r) => this.recordToOrder(r))
    } finally {
      await session.close()
    }
  }

  async create(data: ICreateOrder): Promise<IOrder> {
    const session = this.driver.session()
    const tx = session.beginTransaction()
    try {
      const idRes = await tx.run(
        `
        MATCH (o:Order)
        RETURN toString(coalesce(max(toInteger(o.id)), 0) + 1) AS nextId
        `,
      )
      const nextId = idRes.records[0].get('nextId')

      await tx.run(
        `
        MATCH (c:Customer {id: $customerId})
        CREATE (c)-[:PLACED]->(o:Order {
          id: $id,
          order_date: $orderDate
        })
        `,
        {
          id: nextId,
          customerId: data.customer_id,
          orderDate: data.order_date.toISOString(),
        },
      )

      for (const pos of data.positions) {
        await tx.run(
          `
          MATCH (o:Order {id: $orderId})
          MATCH (p:Product {id: $productId})
          CREATE (o)-[:CONTAINS {
            quantity: $quantity,
            buying_price: $buyingPrice
          }]->(p)
          `,
          {
            orderId: nextId,
            productId: pos.product_id,
            quantity: pos.quantity,
            buyingPrice: pos.buying_price,
          },
        )
      }

      await tx.commit()

      return (await this.findById(String(nextId))) as IOrder
    } catch (e) {
      await tx.rollback()
      throw e
    } finally {
      await session.close()
    }
  }

  async update(id: string, data: Partial<IOrder>): Promise<IOrder | null> {
    const session = this.driver.session()
    try {
      const updateData: any = {}
      if (data.order_date) {
        updateData.order_date = data.order_date.toISOString()
      }

      const res = await session.run(
        `
        MATCH (o:Order)
        WHERE toString(o.id) = $id
        SET o += $data
        WITH o
        MATCH (c:Customer)-[:PLACED]->(o)
        OPTIONAL MATCH (o)-[r:CONTAINS]->(p:Product)
        WITH o, c,
             collect({
               quantity: r.quantity,
               buying_price: r.buying_price,
               product: p
             }) AS positions
        RETURN o, c, positions
        `,
        { id, data: updateData },
      )

      if (!res.records.length) return null
      return this.recordToOrder(res.records[0])
    } finally {
      await session.close()
    }
  }

  async delete(id: string): Promise<boolean> {
    const session = this.driver.session()
    try {
      const res = await session.run(
        `
        MATCH (o:Order)
        WHERE toString(o.id) = $id
        WITH o, count(o) AS c
        DETACH DELETE o
        RETURN c AS deleted
        `,
        { id },
      )
      const deleted = res.records[0].get('deleted')?.toNumber?.() ?? 0
      return deleted > 0
    } finally {
      await session.close()
    }
  }
}
