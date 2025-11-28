import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { OrderDocument, OrderDoc } from '../../schemas/order.schema'
import { CustomerDocument, CustomerDoc } from '../../schemas/customer.schema'
import { ProductDocument, ProductDoc } from '../../schemas/product.schema'
import {
  IOrder,
  IOrderRepository,
  IOrderQuery,
  IPaginatedOrders,
  ICreateOrder,
} from '../interfaces/order.repository.interface'

@Injectable()
export class MongoOrderRepository implements IOrderRepository {
  constructor(
    @InjectModel(OrderDocument.name)
    private readonly model: Model<OrderDoc>,
    @InjectModel(CustomerDocument.name)
    private readonly customerModel: Model<CustomerDoc>,
    @InjectModel(ProductDocument.name)
    private readonly productModel: Model<ProductDoc>
  ) {}

  private async toInterface(doc: OrderDoc): Promise<IOrder> {
    const customer = await this.customerModel.findById(doc.customer_id).exec()
    const productIds = doc.positions.map(p => p.product_id).filter(Boolean)
    const products = await this.productModel.find({ _id: { $in: productIds } }).exec()
    const productMap = new Map(products.map(p => [p._id.toString(), p]))

    return {
      id: doc._id.toString(),
      customer_id: doc.customer_id.toString(),
      customer_name: customer?.name,
      customer_gender: customer?.gender,
      order_date: doc.order_date,
      positions: doc.positions.map(p => {
        const product = productMap.get(p.product_id?.toString())
        return {
          product_id: p.product_id?.toString(),
          quantity: p.quantity,
          buying_price: p.buying_price,
          product: product ? {
            id: product._id.toString(),
            title: product.title,
            category: product.category,
            price: product.price,
            in_stock: product.in_stock,
          } : undefined,
        }
      }),
    }
  }

  async findAll(query: IOrderQuery): Promise<IPaginatedOrders> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 25

    const filter: any = {}

    if (query.customerName) {
      const customers = await this.customerModel
        .find({ name: { $regex: query.customerName, $options: 'i' } })
        .exec()
      const customerIds = customers.map(c => c._id)
      filter.customer_id = { $in: customerIds }
    }

    if (query.orderDateFrom || query.orderDateTo) {
      filter.order_date = {}
      if (query.orderDateFrom) filter.order_date.$gte = new Date(query.orderDateFrom)
      if (query.orderDateTo) filter.order_date.$lte = new Date(query.orderDateTo)
    }

    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ order_date: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ])

    const data = await Promise.all(docs.map(d => this.toInterface(d)))

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: pageSize === 0 ? 0 : Math.ceil(total / pageSize),
      },
    }
  }

  async findById(id: string): Promise<IOrder | null> {
    const doc = await this.model.findById(id).exec()
    return doc ? this.toInterface(doc) : null
  }

  async findByCustomerId(customerId: string): Promise<IOrder[]> {
    const docs = await this.model
      .find({ customer_id: new Types.ObjectId(customerId) })
      .exec()
    return Promise.all(docs.map(d => this.toInterface(d)))
  }

  async create(data: ICreateOrder): Promise<IOrder> {
    const doc = await this.model.create({
      customer_id: new Types.ObjectId(data.customer_id),
      order_date: data.order_date,
      positions: data.positions.map(p => ({
        product_id: new Types.ObjectId(p.product_id),
        quantity: p.quantity,
        buying_price: p.buying_price,
      })),
    })
    return this.toInterface(doc)
  }

  async update(id: string, data: Partial<IOrder>): Promise<IOrder | null> {
    const doc = await this.model.findByIdAndUpdate(
      id,
      { order_date: data.order_date },
      { new: true }
    ).exec()
    return doc ? this.toInterface(doc) : null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec()
    return result !== null
  }
}