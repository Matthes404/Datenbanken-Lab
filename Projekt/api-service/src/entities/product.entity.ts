import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { OrderPosition } from './order-position.entity';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
@Entity('products')
export class Product {
  @Field(() => ID)
  @PrimaryColumn('varchar')
  id: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column()
  category: string;

  @Field(() => Int)
  @Column('int')
  price: number;

  @Field(() => Int)
  @Column('int')
  in_stock: number;

  @Field(() => [OrderPosition], { nullable: true })
  @OneToMany(() => OrderPosition, (op) => op.product, {
    nullable: true,
  })
  positions: OrderPosition[];
}
