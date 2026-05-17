import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducer implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'main-api',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async sendImageUploaded(imageData: {
    imageId: string;
    originalPath: string;
    fileName: string;
    type: 'course_cover' | 'lesson_image';
  }) {
    await this.producer.send({
      topic: 'image.uploaded',
      messages: [
        {
          key: imageData.imageId,
          value: JSON.stringify(imageData),
        },
      ],
    });
  }
}
