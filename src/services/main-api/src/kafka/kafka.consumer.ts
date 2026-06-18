import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';

@Injectable()
export class KafkaConsumer implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'main-api',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    });
    this.consumer = this.kafka.consumer({ groupId: 'main-api-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();

    await this.consumer.subscribe({
      topic: 'image.processed',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        if (topic === 'image.processed') {
          if (message.value) {
            const data = JSON.parse(message.value.toString());
            console.log('Получено подтверждение обработки:', data);
          }
        }
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
