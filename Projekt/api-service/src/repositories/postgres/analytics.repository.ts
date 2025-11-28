import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ICategoryStats, IAnalyticsRepository } from '../interfaces/analytics.repository.interface'

@Injectable()
export class PostgresAnalyticsRepository implements IAnalyticsRepository {
  constructor(private dataSource: DataSource) {}

  async getCategoryStats(): Promise<ICategoryStats[]> {
    return this.dataSource.query(`
      SELECT *
      FROM mv_category_stats
      ORDER BY category
    `)
  }
}