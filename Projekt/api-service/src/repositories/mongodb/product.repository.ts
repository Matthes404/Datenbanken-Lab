import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ProductDocument, ProductDoc } from '../../schemas/product.schema'
import { IProduct, IProductRepository } from '../interfaces/product.repository.interface'

@Injectable()
export class MongoProductRepository implements IProductRepository {
  constructor(
    @InjectModel(ProductDocument.name)
    private readonly model: Model<ProductDoc>
  ) {}

  private toInterface(doc: ProductDoc): IProduct {
    return {
      id: doc._id.toString(),
      title: doc.title,
      category: doc.category,
      price: doc.price,
      in_stock: doc.in_stock,
    }
  }

  async findAll(): Promise<IProduct[]> {
    const docs = await this.model.find().exec()
    return docs.map(d => this.toInterface(d))
  }

  async findById(id: string): Promise<IProduct | null> {
    const doc = await this.model.findById(id).exec()
    return doc ? this.toInterface(doc) : null
  }

  async findByTitle(title: string): Promise<IProduct | null> {
    const doc = await this.model.findOne({ title }).exec()
    return doc ? this.toInterface(doc) : null
  }

  async create(data: IProduct): Promise<IProduct> {
    const doc = await this.model.create(data)
    return this.toInterface(doc)
  }

  async update(id: string, data: Partial<IProduct>): Promise<IProduct | null> {
    const doc = await this.model.findByIdAndUpdate(id, data, { new: true }).exec()
    return doc ? this.toInterface(doc) : null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec()
    return result !== null
  }
}