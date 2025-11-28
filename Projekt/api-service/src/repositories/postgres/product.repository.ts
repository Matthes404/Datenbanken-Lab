import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Product } from '../../entities/product.entity'
import { IProduct, IProductRepository } from '../interfaces/product.repository.interface'

@Injectable()
export class PostgresProductRepository implements IProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>
  ) {}

  private toInterface(entity: Product): IProduct {
    return {
      id: entity.id,
      title: entity.title,
      category: entity.category,
      price: entity.price,
      in_stock: entity.in_stock,
    }
  }

  async findAll(): Promise<IProduct[]> {
    const entities = await this.repo.find()
    return entities.map(e => this.toInterface(e))
  }

  async findById(id: string): Promise<IProduct | null> {
    const entity = await this.repo.findOneBy({ id })
    return entity ? this.toInterface(entity) : null
  }

  async findByTitle(title: string): Promise<IProduct | null> {
    const entity = await this.repo.findOne({ where: { title } })
    return entity ? this.toInterface(entity) : null
  }

  async create(data: IProduct): Promise<IProduct> {
    const entity = await this.repo.save(data)
    return this.toInterface(entity)
  }

  async update(id: string, data: Partial<IProduct>): Promise<IProduct | null> {
    const result = await this.repo.update(id, data)
    if (result.affected === 0) return null
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id)
    return (result.affected ?? 0) > 0
  }
}