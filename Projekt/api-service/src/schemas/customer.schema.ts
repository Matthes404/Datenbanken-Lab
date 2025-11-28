import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export enum Gender {
  MALE = 'm',
  FEMALE = 'f',
}

@Schema({ collection: 'customers' })
export class CustomerDocument {
  _id: Types.ObjectId

  @Prop({ required: true })
  name: string

  @Prop({ required: true, enum: Object.values(Gender) })
  gender: Gender
}

export type CustomerDoc = CustomerDocument & Document
export const CustomerSchema = SchemaFactory.createForClass(CustomerDocument)