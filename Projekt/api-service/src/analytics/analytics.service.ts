import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AnalyticsService {
  constructor(private dataSource: DataSource) {}

  async getAnalytics() {
    const query = `
      SELECT 
        products.category AS category,
        COUNT(DISTINCT products.id) AS products,
        COUNT(DISTINCT orders.id) AS orders,
        SUM(order_positions.quantity * order_positions.buying_price) AS revenue
      FROM products
      INNER JOIN order_positions ON order_positions.product_id = products.id
      INNER JOIN orders ON order_positions.order_id = orders.id
      GROUP BY products.category
      ORDER BY products.category;
    `;

    const result = await this.dataSource.query(query);
    return result;
  }
}
