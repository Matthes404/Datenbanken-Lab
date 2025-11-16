import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';

export enum Gender {
  MALE = 'm',
  FEMALE = 'f',
}

registerEnumType(Gender, {
  name: 'Gender',
});

@ObjectType()
@Entity('customers')
export class Customer {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;
  
  @Field()
  @Column()
  name: string;

  @Field(() => Gender)
  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Field(() => [Order], { nullable: true })
  @OneToMany(() => Order, (order) => order.customer, {
    nullable: true,
  })
  orders: Order[];
}
