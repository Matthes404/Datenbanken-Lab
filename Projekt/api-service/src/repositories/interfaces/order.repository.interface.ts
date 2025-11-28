import { IProduct } from './product.repository.interface'

export interface IOrderPosition {
  id?: string
  product_id: string
  quantity: number
  buying_price: number
  product?: IProduct
}

export interface IOrder {
  id: string
  customer_id: string
  customer_name?: string
  customer_gender?: string
  order_date: Date
  positions: IOrderPosition[]
}

export interface IOrderQuery {
  page?: number
  pageSize?: number
  customerName?: string
  orderDateFrom?: string
  orderDateTo?: string
}

export interface IPaginatedOrders {
  data: IOrder[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export interface ICreateOrderPosition {
  product_id: string
  quantity: number
  buying_price: number
}

export interface ICreateOrder {
  order_date: Date
  customer_id: string
  positions: ICreateOrderPosition[]
}

export interface IOrderRepository {
  findAll(query: IOrderQuery): Promise<IPaginatedOrders>
  findById(id: string): Promise<IOrder | null>
  findByCustomerId(customerId: string): Promise<IOrder[]>
  create(data: ICreateOrder): Promise<IOrder>
  update(id: string, data: Partial<IOrder>): Promise<IOrder | null>
  delete(id: string): Promise<boolean>
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY')