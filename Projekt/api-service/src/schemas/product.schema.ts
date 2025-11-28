import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema({ collection: 'products' })
export class ProductDocument {
  _id: Types.ObjectId

  @Prop({ required: true })
  title: string

  @Prop({ required: true })
  category: string

  @Prop({ required: true })
  price: number

  @Prop({ required: true })
  in_stock: number
}

export type ProductDoc = ProductDocument & Document
export const ProductSchema = SchemaFactory.createForClass(ProductDocument)