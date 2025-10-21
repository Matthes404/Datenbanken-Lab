import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Customer } from './customer.entity';
import { OrderPosition } from './order-position.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp', nullable: true })
  orderDate: Date;

  @ManyToOne(() => Customer, (customer) => customer.orders, { onDelete: 'CASCADE' })
  customer: Customer;

  @OneToMany(() => OrderPosition, (op) => op.order)
  positions: OrderPosition[];
}
