import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { OrderPosition } from './order-position.entity';

@Entity('products')
export class Product {
  @PrimaryColumn('varchar')
  id: string;

  @Column()
  title: string;

  @Column()
  category: string;

  @Column('int')
  price: number;

  @Column('int')
  in_stock: number;

  @OneToMany(() => OrderPosition, (op) => op.product, {
    nullable: true,
  })
  positions: OrderPosition[];
}
