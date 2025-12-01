import { DynamicModule, Module } from '@nestjs/common'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule, ConfigService } from '@nestjs/config'
import neo4j, { Driver } from 'neo4j-driver'


// Entities (Postgres)
import { Customer } from '../entities/customer.entity'
import { Product } from '../entities/product.entity'
import { Order } from '../entities/order.entity'
import { OrderPosition } from '../entities/order-position.entity'

// Schemas (MongoDB)
import { CustomerDocument, CustomerSchema } from '../schemas/customer.schema'
import { ProductDocument, ProductSchema } from '../schemas/product.schema'
import { OrderDocument, OrderSchema } from '../schemas/order.schema'
import { CategoryStatsDocument, CategoryStatsSchema } from '../schemas/category-stats.schema'

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

// Neo4j Repositories 
import { Neo4jProductRepository } from '../repositories/neo4j/product.repository'
import { Neo4jOrderRepository } from '../repositories/neo4j/order.repository'
import { Neo4jAnalyticsRepository } from '../repositories/neo4j/analytics.repository'

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
            { name: CategoryStatsDocument.name, schema: CategoryStatsSchema },
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

    // --------- Neo4j (Graph-DB) ----------
    if (dbType === 'neo4j') {
      return {
        module: DatabaseModule,
        imports: [ConfigModule],
        providers: [
          // Neo4j-Driver als globaler Provider
          {
            provide: 'NEO4J_DRIVER',
            useFactory: (config: ConfigService): Driver => {
              const uri = config.get<string>('NEO4J_URI') ?? 'bolt://neo4j:7687'
              const user = config.get<string>('NEO4J_USER') ?? 'neo4j'
              const pass = config.get<string>('NEO4J_PASSWORD') ?? 'password'
              return neo4j.driver(uri, neo4j.auth.basic(user, pass))
            },
            inject: [ConfigService],
          },

          // Repositories für Graph-DB
          { provide: PRODUCT_REPOSITORY, useClass: Neo4jProductRepository },
          { provide: ORDER_REPOSITORY, useClass: Neo4jOrderRepository },
          { provide: ANALYTICS_REPOSITORY, useClass: Neo4jAnalyticsRepository },
        ],
        exports: [
          PRODUCT_REPOSITORY,
          ORDER_REPOSITORY,
          ANALYTICS_REPOSITORY,
          'NEO4J_DRIVER',
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