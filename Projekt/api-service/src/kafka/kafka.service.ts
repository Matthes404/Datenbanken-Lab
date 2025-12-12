import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Subject } from 'rxjs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka = new Kafka({
    clientId: 'amzn-api',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
  });

  private reviewsConsumer: Consumer;
  private aggregatesConsumer: Consumer;

  // Subjects für SSE streaming
  public reviews$ = new Subject<any>();
  public aggregates$ = new Subject<any>();

  async onModuleInit() {
    // Consumer für gefilterte Reviews
    this.reviewsConsumer = this.kafka.consumer({ groupId: 'api-reviews' });
    await this.reviewsConsumer.connect();
    await this.reviewsConsumer.subscribe({ topic: 'REVIEWS_FILTERED', fromBeginning: false });
    
    this.reviewsConsumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        if (!message.value) return; // Message darf nicht NULL sein
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
        if (!message.value) return; // Message darf nicht NULL sein
        const aggregate = JSON.parse(message.value.toString());
        this.aggregates$.next(aggregate);
      },
    });

    console.log('Kafka consumers connected');
  }

  async onModuleDestroy() {
    await this.reviewsConsumer?.disconnect();
    await this.aggregatesConsumer?.disconnect();
  }
}