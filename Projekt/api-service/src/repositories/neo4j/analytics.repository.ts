import { Inject, Injectable } from '@nestjs/common'
import { Driver } from 'neo4j-driver'
import {
  IAnalyticsRepository,
  ICategoryStats,
} from '../interfaces/analytics.repository.interface'

@Injectable()
export class Neo4jAnalyticsRepository implements IAnalyticsRepository {
  constructor(
    @Inject('NEO4J_DRIVER')
    private readonly driver: Driver,
  ) {}

  async getCategoryStats(): Promise<ICategoryStats[]> {
    const session = this.driver.session()
    try {
      const res = await session.run(`
        MATCH (o:Order)-[r:CONTAINS]->(p:Product)
        WITH p.category AS category,
             count(DISTINCT p) AS products,
             count(DISTINCT o) AS orders,
             sum(r.quantity * r.buying_price) AS revenue
        RETURN category, products, orders, revenue
        ORDER BY category
      `)

      return res.records.map(rec => ({
        category: rec.get('category'),
        products: rec.get('products').toNumber(),
        orders: rec.get('orders').toNumber(),
        revenue: Number(rec.get('revenue')),
      }))
    } finally {
      await session.close()
    }
  }

  async refreshCategoryStats(): Promise<void> {
    return
  }
}
