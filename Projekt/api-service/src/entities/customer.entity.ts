import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from './order.entity';

export enum Gender {
  MALE = 'm',
  FEMALE = 'f',
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @OneToMany(() => Order, (order) => order.customer, {
    nullable: true,
  })
  orders: Order[];
}
