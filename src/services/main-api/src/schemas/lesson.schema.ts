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
    image: {
      url: String,
      status: {
        type: String,
        enum: ['processing', 'ready', 'failed'],
        default: 'processing',
      },
    },
  })
  image: { url: string; status: string };

  @Prop()
  sequenceNumber: number;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);
