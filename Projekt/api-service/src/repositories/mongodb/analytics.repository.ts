import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { OrderDocument, OrderDoc } from '../../schemas/order.schema'
import { ProductDocument, ProductDoc } from '../../schemas/product.schema'
import { CategoryStatsDocument, CategoryStatsDoc } from '../../schemas/category-stats.schema'
import { ICategoryStats, IAnalyticsRepository } from '../interfaces/analytics.repository.interface'

@Injectable()
export class MongoAnalyticsRepository implements IAnalyticsRepository {
  constructor(
    @InjectModel(OrderDocument.name)
    private readonly orderModel: Model<OrderDoc>,
    @InjectModel(ProductDocument.name)
    private readonly productModel: Model<ProductDoc>,
    @InjectModel(CategoryStatsDocument.name)
    private readonly statsModel: Model<CategoryStatsDoc>
  ) {}

  async getCategoryStats(): Promise<ICategoryStats[]> {
    const stats = await this.statsModel.find().sort({ category: 1 }).exec()
    return stats.map(s => ({
      category: s.category,
      products: s.products,
      orders: s.orders,
      revenue: s.revenue,
    }))
  }

  async refreshCategoryStats(): Promise<void> {
    const result = await this.orderModel.aggregate([
      { $unwind: '$positions' },
      {
        $lookup: {
          from: 'products',
          localField: 'positions.product_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: {
            category: '$product.category',
            order_id: '$_id',
            product_id: '$product._id'
          },
          quantity: { $sum: '$positions.quantity' },
          buying_price: { $first: '$positions.buying_price' }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          products: { $addToSet: '$_id.product_id' },
          orders: { $addToSet: '$_id.order_id' },
          revenue: { $sum: { $multiply: ['$quantity', '$buying_price'] } }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          products: { $size: '$products' },
          orders: { $size: '$orders' },
          revenue: 1
        }
      }
    ])

    // Clear and insert new stats
    await this.statsModel.deleteMany({})
    await this.statsModel.insertMany(
      result.map(r => ({
        ...r,
        updated_at: new Date()
      }))
    )
  }
}