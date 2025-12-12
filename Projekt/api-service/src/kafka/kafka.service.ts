import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Subject } from 'rxjs';
import { ProductStats } from '../entities/product-stats.entity';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka = new Kafka({
    clientId: 'amzn-api',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  });

  private reviewsConsumer: Consumer;
  private aggregatesConsumer: Consumer;

  public reviews$ = new Subject<any>();
  public aggregates$ = new Subject<any>();

  constructor(
    @InjectRepository(ProductStats)
    private productStatsRepo: Repository<ProductStats>,
  ) {}

  async onModuleInit() {
    // Consumer für gefilterte Reviews
    this.reviewsConsumer = this.kafka.consumer({ groupId: 'api-reviews' });
    await this.reviewsConsumer.connect();
    await this.reviewsConsumer.subscribe({ topic: 'REVIEWS_FILTERED', fromBeginning: false });
    
    this.reviewsConsumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        if (!message.value) return;
        const review = JSON.parse(message.value.toString());
        this.reviews$.next(review);
      },
    });

    // Consumer für Aggregate
    this.aggregatesConsumer = this.kafka.consumer({ groupId: 'api-aggregates' });
    await this.aggregatesConsumer.connect();
    await this.aggregatesConsumer.subscribe({ topic: 'aggregated-reviews', fromBeginning: false });

    this.aggregatesConsumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        if (!message.value) return;
        const aggregate = JSON.parse(message.value.toString());
        this.aggregates$.next(aggregate);
        await this.updateProductStats(aggregate);
      },
    });

    console.log('Kafka consumers connected');
  }

    private async updateProductStats(aggregate: any) {
        const product_id = aggregate.PRODUCT_ID_VALUE;
        const review_count = aggregate.REVIEW_COUNT;
        const avg_rating = aggregate.AVG_RATING;

        if (!product_id) {
            console.log('Skipping aggregate without product_id:', aggregate);
            return;
        }
        
        let stats = await this.productStatsRepo.findOne({ where: { product_id } });
        
        if (!stats) {
            stats = this.productStatsRepo.create({
            product_id,
            total_reviews: review_count,
            avg_rating: avg_rating,
            });
        } else {
            const totalReviews = stats.total_reviews + review_count;
            const newAvg = (stats.avg_rating * stats.total_reviews + avg_rating * review_count) / totalReviews;
            
            stats.total_reviews = totalReviews;
            stats.avg_rating = newAvg;
            stats.last_updated = new Date();
        }
        
        await this.productStatsRepo.save(stats);
    }

  async onModuleDestroy() {
    await this.reviewsConsumer?.disconnect();
    await this.aggregatesConsumer?.disconnect();
  }
}