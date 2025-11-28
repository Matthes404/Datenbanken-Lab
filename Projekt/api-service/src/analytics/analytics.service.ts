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
}