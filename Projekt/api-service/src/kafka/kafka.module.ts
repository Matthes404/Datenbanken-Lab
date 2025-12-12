import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaService } from './kafka.service';
import { KafkaController } from './kafka.controller';
import { ProductStats } from '../entities/product-stats.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductStats])],
  controllers: [KafkaController],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}