const express = require('express');
const { Kafka } = require('kafkajs');
const mongoose = require('mongoose');
const { processImage } = require('./processor');

const app = express();
const PORT = process.env.PORT || 3001;

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://admin:password@localhost:27017/eduplatform?authSource=admin';

const coverImageSchema = new mongoose.Schema(
  {
    originalUrl: String,
    processedUrl: String,
    status: {
      type: String,
      enum: ['none', 'processing', 'ready'],
      default: 'none',
    },
  },
  { _id: false },
);

const courseSchema = new mongoose.Schema({
  coverImage: coverImageSchema,
});

const lessonImageSchema = new mongoose.Schema(
  {
    originalUrl: String,
    processedUrl: String,
    status: {
      type: String,
      enum: ['none', 'processing', 'ready'],
      default: 'none',
    },
  },
  { _id: false },
);

const lessonSchema = new mongoose.Schema({
  image: lessonImageSchema,
});

const Course = mongoose.model('Course', courseSchema);
const Lesson = mongoose.model('Lesson', lessonSchema);

const kafka = new Kafka({
  clientId: 'image-worker',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'image-processor' });
const producer = kafka.producer();

async function updateImageStatus(imageId, type, processedPath) {
  try {
    if (type === 'course_cover') {
      await Course.findByIdAndUpdate(imageId, {
        'coverImage.processedUrl': processedPath,
        'coverImage.status': 'ready',
      });
    } else if (type === 'lesson_image') {
      await Lesson.findByIdAndUpdate(imageId, {
        'image.processedUrl': processedPath,
        'image.status': 'ready',
      });
    }
    console.log(`Статус обновлён на ready для ${type}: ${imageId}`);
  } catch (error) {
    console.error(`Ошибка обновления статуса:`, error);
  }
}

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Image Worker подключён к MongoDB');

    await producer.connect();
    console.log('Kafka producer подключён');

    await consumer.connect();
    await consumer.subscribe({ topic: 'image.uploaded', fromBeginning: false });
    console.log('Image Worker подписан на топик image.uploaded');

    await consumer.run({
      eachMessage: async ({ message }) => {
        const data = JSON.parse(message.value.toString());
        console.log('Получена задача на обработку:', data);

        try {
          const processedPath = await processImage(
            data.originalPath,
            `processed_${data.fileName}`,
          );

          await updateImageStatus(data.imageId, data.type, processedPath);

          await producer.send({
            topic: 'image.processed',
            messages: [
              {
                key: data.imageId,
                value: JSON.stringify({
                  imageId: data.imageId,
                  type: data.type,
                  processedUrl: processedPath,
                  status: 'ready',
                }),
              },
            ],
          });
          console.log(
            'Подтверждение отправлено в image.processed:',
            data.fileName,
          );
        } catch (error) {
          console.error('Ошибка обработки:', error);
        }
      },
    });

    app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'image-worker' });
    });

    app.listen(PORT, () => {
      console.log(`Image Worker запущен на порту ${PORT}`);
    });
  } catch (error) {
    console.error('Ошибка запуска Image Worker:', error);
    process.exit(1);
  }
}

start();
