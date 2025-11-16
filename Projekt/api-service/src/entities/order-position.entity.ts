import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
@Entity('order_positions')
export class OrderPosition {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => Int)
  @Column('int')
  quantity: number;

  @Field(() => Int)
  @Column('int')
  buying_price: number;

  @Field(() => Order)
  @ManyToOne(() => Order, (order) => order.positions, { 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Field(() => Product, { nullable: true })
  @ManyToOne(() => Product, (product) => product.positions, {
    nullable: true,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
