import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrderService } from './order.service';
import { StreamOrderDto } from './dto/stream-order.dto';

@Injectable()
export class OrderEventsListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderEventsListener.name);
  private socket?: WebSocket;
  private reconnectHandle?: NodeJS.Timeout;
  private disabled = false;
  private readonly debugMode: boolean;

  constructor(
    private readonly orderService: OrderService,
    private readonly configService: ConfigService,
  ) {
    this.debugMode =
      (this.configService
        .get<string>('ORDERS_STREAM_DEBUG', 'false')
        ?.toLowerCase() ?? 'false') === 'true';
  }

  onModuleInit() {
    const enabledConfig = this.configService.get<string>(
      'ORDERS_STREAM_ENABLED',
      'true',
    );
    if (enabledConfig === 'false') {
      this.logger.log('Orders WebSocket stream disabled via configuration.');
      this.disabled = true;
      return;
    }
    this.connect();
  }

  onModuleDestroy() {
    this.disabled = true;
    this.cleanup(true);
  }

  private connect() {
    if (this.disabled) {
      return;
    }

    const url =
      this.configService.get<string>('ORDERS_STREAM_URL') ??
      'wss://db.iue.haw-kiel.de/ndbk-events/orders';
    this.logger.log(`Connecting to order event stream at ${url}`);
    this.socket = new WebSocket(url);

    this.socket.on('open', () => {
      this.logger.log('Connected to order events stream.');
    });

    this.socket.on('message', (message) => {
      void this.handleMessage(message.toString());
    });

    this.socket.on('close', () => {
      this.logger.warn('Order events stream closed. Reconnecting in 5s...');
      this.cleanup();
      this.scheduleReconnect();
    });

    this.socket.on('error', (error) => {
      this.logger.error(
        `Order events stream error: ${(error as Error).message}`,
        (error as Error).stack,
      );
    });
  }

  private scheduleReconnect() {
    if (this.disabled) {
      return;
    }
    if (this.reconnectHandle) {
      clearTimeout(this.reconnectHandle);
    }
    this.reconnectHandle = setTimeout(() => this.connect(), 5000);
  }

  private cleanup(stopReconnectTimer = false) {
    if (stopReconnectTimer && this.reconnectHandle) {
      clearTimeout(this.reconnectHandle);
      this.reconnectHandle = undefined;
    }
    if (this.socket) {
      this.socket.removeAllListeners();
      if (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      ) {
        this.socket.close();
      }
      this.socket = undefined;
    }
  }

  private async handleMessage(payload: string) {
    try {
      const parsed = JSON.parse(payload);
      if (this.debugMode) {
        this.logger.warn(
          `ORDERS_STREAM_DEBUG=true → payload only, skipping persistence: ${payload}`,
        );
        return;
      }

      const dto = plainToInstance(StreamOrderDto, parsed);
      const errors = await validate(dto, {
        whitelist: true,
        forbidUnknownValues: true,
      });
      if (errors.length) {
        this.logger.warn(
          `Discarded invalid order payload received via WebSocket: ${JSON.stringify(
            errors.map((error) => error.constraints ?? error.children),
          )}`,
        );
        return;
      }

      await this.orderService.createFromStream(dto);
      this.logger.debug('Persisted order from WebSocket event.');
    } catch (error) {
      this.logger.error(
        `Failed to process order event: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
