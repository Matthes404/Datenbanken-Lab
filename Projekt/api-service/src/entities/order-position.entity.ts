import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity('order_positions')
export class OrderPosition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  quantity: number;

  @Column('int')
  buying_price: number;

  @ManyToOne(() => Order, (order) => order.positions, { 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product, (product) => product.positions, {
    nullable: true,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
