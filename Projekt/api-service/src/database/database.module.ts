import { DynamicModule, Module } from '@nestjs/common'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule, ConfigService } from '@nestjs/config'

// Entities (Postgres)
import { Customer } from '../entities/customer.entity'
import { Product } from '../entities/product.entity'
import { Order } from '../entities/order.entity'
import { OrderPosition } from '../entities/order-position.entity'

// Schemas (MongoDB)
import { CustomerDocument, CustomerSchema } from '../schemas/customer.schema'
import { ProductDocument, ProductSchema } from '../schemas/product.schema'
import { OrderDocument, OrderSchema } from '../schemas/order.schema'

// Repository Interfaces
import { PRODUCT_REPOSITORY } from '../repositories/interfaces/product.repository.interface'
import { ORDER_REPOSITORY } from '../repositories/interfaces/order.repository.interface'
import { ANALYTICS_REPOSITORY } from '../repositories/interfaces/analytics.repository.interface'


// Postgres Repositories
import { PostgresProductRepository } from '../repositories/postgres/product.repository'
import { PostgresOrderRepository } from '../repositories/postgres/order.repository'
import { PostgresAnalyticsRepository } from '../repositories/postgres/analytics.repository'

// MongoDB Repositories
import { MongoProductRepository } from '../repositories/mongodb/product.repository'
import { MongoOrderRepository } from '../repositories/mongodb/order.repository'
import { MongoAnalyticsRepository } from '../repositories/mongodb/analytics.repository'

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const dbType = process.env.DB_TYPE || 'postgres'

    if (dbType === 'mongodb') {
      return {
        module: DatabaseModule,
        imports: [
          MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (config: ConfigService) => ({
              uri: config.get('MONGODB_URI'),
            }),
            inject: [ConfigService],
          }),
          MongooseModule.forFeature([
            { name: CustomerDocument.name, schema: CustomerSchema },
            { name: ProductDocument.name, schema: ProductSchema },
            { name: OrderDocument.name, schema: OrderSchema },
          ]),
        ],
        providers: [
          { provide: PRODUCT_REPOSITORY, useClass: MongoProductRepository },
          { provide: ORDER_REPOSITORY, useClass: MongoOrderRepository },
          { provide: ANALYTICS_REPOSITORY, useClass: MongoAnalyticsRepository},
        ],
        exports: [
          PRODUCT_REPOSITORY,
          ORDER_REPOSITORY,
          ANALYTICS_REPOSITORY,
          MongooseModule,
        ],
        global: true,
      }
    }

    // Default: Postgres
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: (config: ConfigService): TypeOrmModuleOptions => {
            return {
            type: 'postgres',
            host: config.get<string>('POSTGRES_HOST'),
            port: config.get<number>('POSTGRES_PORT'),
            username: config.get<string>('POSTGRES_USER'),
            password: config.get<string>('POSTGRES_PASSWORD'),
            database: config.get<string>('POSTGRES_DB'),
            entities: [Customer, Product, Order, OrderPosition],
            synchronize: false,
            }
        },
        inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([Customer, Product, Order, OrderPosition]),
      ],
      providers: [
        { provide: PRODUCT_REPOSITORY, useClass: PostgresProductRepository },
        { provide: ORDER_REPOSITORY, useClass: PostgresOrderRepository },
        { provide: ANALYTICS_REPOSITORY, useClass: PostgresAnalyticsRepository},
      ],
      exports: [
        PRODUCT_REPOSITORY,
        ORDER_REPOSITORY,
        ANALYTICS_REPOSITORY,
        TypeOrmModule,
      ],
      global: true,
    }
  }
}