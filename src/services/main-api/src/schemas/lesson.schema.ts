import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LessonDocument = Lesson & Document;

@Schema({ timestamps: true })
export class Lesson {
  @Prop({ required: true })
  title: string;

  @Prop()
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({
    type: {
      originalUrl: { type: String, default: '' },
      processedUrl: { type: String, default: '' },
      status: {
        type: String,
        enum: ['none', 'processing', 'ready'],
        default: 'none',
      },
    },
    default: {},
  })
  image: {
    originalUrl: string;
    processedUrl: string;
    status: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);
