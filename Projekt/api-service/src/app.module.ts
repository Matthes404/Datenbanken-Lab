import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { Customer } from './entities/customer.entity';
import { Order } from './entities/order.entity';
import { Product } from './entities/product.entity';
import { OrderPosition } from './entities/order-position.entity';
import { OrderModule } from './order/order.module';
import { ProductModule } from './product/product.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
      /*  console.log('DB vars', {
          host: configService.get('DB_HOST'),
          user: configService.get('DB_USER'),
          pass: configService.get('DB_PASS'),
          typeOfPass: typeof (configService.get('DB_PASS')),
        });*/
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: Number(configService.get<number>('DB_PORT') ?? 5432),
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASS'),
          database: configService.get<string>('DB_NAME'),
          entities: [Customer, Order, Product, OrderPosition],
          synchronize: false,
        };
      },
    }),
    // GraphQL mit Apollo-Driver und autoSchemaFile
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
      path: '/graphql',
    }),
    OrderModule,
    ProductModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
