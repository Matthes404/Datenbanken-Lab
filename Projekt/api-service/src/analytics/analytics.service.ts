import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AnalyticsService {
  constructor(private dataSource: DataSource) {}

  async getAnalytics() {
    return this.dataSource.query(`
      SELECT *
      FROM mv_category_stats
      ORDER BY category;
    `);
  }
}