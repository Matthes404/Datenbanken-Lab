import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { OrderPosition } from './order-position.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp', nullable: true })
  order_date: Date;

  @ManyToOne(() => Customer, (customer) => customer.orders, { 
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;


  @OneToMany(() => OrderPosition, (op) => op.order)
  positions: OrderPosition[];
}
