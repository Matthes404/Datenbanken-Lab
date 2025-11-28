import { Injectable, Inject } from '@nestjs/common'
import { ANALYTICS_REPOSITORY } from '../repositories/interfaces/analytics.repository.interface'
import type { IAnalyticsRepository } from '../repositories/interfaces/analytics.repository.interface'

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analyticsRepo: IAnalyticsRepository
  ) {}

  getAnalytics() {
    return this.analyticsRepo.getCategoryStats()
  }

  async refreshAnalytics() {
    if (this.analyticsRepo.refreshCategoryStats) {
      await this.analyticsRepo.refreshCategoryStats()
      return { message: 'Analytics refreshed successfully' }
    }
    return { message: 'Refresh not supported for this database' }
  }
}