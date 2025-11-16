import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { OrderPosition } from './order-position.entity';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
@Entity('orders')
export class Order {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ type: 'timestamp', nullable: true })
  order_date: Date;

  @Field(() => Customer)
  @ManyToOne(() => Customer, (customer) => customer.orders, { 
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Field(() => [OrderPosition], { nullable: true })
  @OneToMany(() => OrderPosition, (op) => op.order)
  positions: OrderPosition[];
}
