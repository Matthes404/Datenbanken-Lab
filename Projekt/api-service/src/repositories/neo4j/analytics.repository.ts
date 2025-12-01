import { Inject, Injectable } from '@nestjs/common'
import { Driver, Integer } from 'neo4j-driver'
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
      const res = await session.run(
        `
        MATCH (cs:CategoryStats)
        RETURN
          cs.category AS category,
          cs.products AS products,
          cs.orders   AS orders,
          cs.revenue  AS revenue
        ORDER BY category
        `,
      )

      return res.records.map((rec) => ({
        category: rec.get('category'),
        products: (rec.get('products') as Integer).toNumber(),
        orders:   (rec.get('orders') as Integer).toNumber(),
        revenue:  Number(rec.get('revenue')),
      }))
    } finally {
      await session.close()
    }
  }

   async refreshCategoryStats(): Promise<void> {
    const session = this.driver.session()

    try {
      // Alte Stats löschen
      await session.run(`
        MATCH (cs:CategoryStats)
        DETACH DELETE cs
      `)

      // Neue Stats
      await session.run(`
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
      `)
    } finally {
      await session.close()
    }
  }

}
