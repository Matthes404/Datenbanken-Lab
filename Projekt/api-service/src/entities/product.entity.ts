import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { OrderPosition } from './order-position.entity';

@Entity()
export class Product {
  @PrimaryColumn()
  id: string; // product id is string according to your model

  @Column()
  title: string;

  @Column()
  category: string;

  @Column('int')
  price: number;

  @Column('int')
  inStock: number;

  @OneToMany(() => OrderPosition, (op) => op.product)
  positions: OrderPosition[];
}
