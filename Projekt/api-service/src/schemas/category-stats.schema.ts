import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({ collection: 'category_stats' })
export class CategoryStatsDocument {
  @Prop({ required: true, unique: true })
  category: string

  @Prop({ required: true })
  products: number

  @Prop({ required: true })
  orders: number

  @Prop({ required: true })
  revenue: number

  @Prop({ required: true })
  updated_at: Date
}

export type CategoryStatsDoc = CategoryStatsDocument & Document
export const CategoryStatsSchema = SchemaFactory.createForClass(CategoryStatsDocument)