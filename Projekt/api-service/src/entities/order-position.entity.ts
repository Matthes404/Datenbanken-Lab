import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity()
export class OrderPosition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  quantity: number;

  @Column('int')
  buyingPrice: number;

  @ManyToOne(() => Order, (order) => order.positions, { onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Product, (product) => product.positions)
  product: Product;
}
