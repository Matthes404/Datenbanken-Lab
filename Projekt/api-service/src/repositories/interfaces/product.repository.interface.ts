export interface IProduct {
  id: string
  title: string
  category: string
  price: number
  in_stock: number
}

export interface IProductRepository {
  findAll(): Promise<IProduct[]>
  findById(id: string): Promise<IProduct | null>
  findByTitle(title: string): Promise<IProduct | null>
  create(data: IProduct): Promise<IProduct>
  update(id: string, data: Partial<IProduct>): Promise<IProduct | null>
  delete(id: string): Promise<boolean>
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY')