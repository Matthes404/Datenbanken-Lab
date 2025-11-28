export interface ICategoryStats {
  category: string
  products: number
  orders: number
  revenue: number
}

export interface IAnalyticsRepository {
  getCategoryStats(): Promise<ICategoryStats[]>
}

export const ANALYTICS_REPOSITORY = Symbol('ANALYTICS_REPOSITORY')