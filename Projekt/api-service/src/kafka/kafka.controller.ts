import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { KafkaService } from './kafka.service';

@Controller('events')
export class KafkaController {
  constructor(private readonly kafkaService: KafkaService) {}

  @Sse('reviews')
  streamReviews(): Observable<MessageEvent> {
    return this.kafkaService.reviews$.pipe(
      map((review) => ({ data: review })),
    );
  }

  @Sse('aggregates')
  streamAggregates(): Observable<MessageEvent> {
    return this.kafkaService.aggregates$.pipe(
      map((aggregate) => ({ data: aggregate })),
    );
  }
}