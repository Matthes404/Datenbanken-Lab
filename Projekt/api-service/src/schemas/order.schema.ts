import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema()
export class OrderPositionSubdoc {
  @Prop({ type: Types.ObjectId, ref: 'ProductDocument' })
  product_id: Types.ObjectId

  @Prop({ required: true })
  quantity: number

  @Prop({ required: true })
  buying_price: number
}

export const OrderPositionSubdocSchema = SchemaFactory.createForClass(OrderPositionSubdoc)

@Schema({ collection: 'orders' })
export class OrderDocument {
  _id: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'CustomerDocument', required: true })
  customer_id: Types.ObjectId

  @Prop({ required: true })
  order_date: Date

  @Prop({ type: [OrderPositionSubdocSchema], default: [] })
  positions: OrderPositionSubdoc[]
}

export type OrderDoc = OrderDocument & Document
export const OrderSchema = SchemaFactory.createForClass(OrderDocument)