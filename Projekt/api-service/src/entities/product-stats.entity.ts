import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('product_stats')
export class ProductStats {
  @PrimaryColumn()
  product_id: string;

  @Column({ default: 0 })
  total_reviews: number;

  @Column({ type: 'float', default: 0 })
  avg_rating: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated: Date;
}