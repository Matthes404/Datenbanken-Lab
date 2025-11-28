export interface ICategoryStats {
  category: string
  products: number
  orders: number
  revenue: number
}

export interface IAnalyticsRepository {
  getCategoryStats(): Promise<ICategoryStats[]>
  refreshCategoryStats?(): Promise<void>
}

export const ANALYTICS_REPOSITORY = Symbol('ANALYTICS_REPOSITORY')