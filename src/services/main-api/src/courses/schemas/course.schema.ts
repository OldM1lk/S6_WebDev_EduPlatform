import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CourseDocument = Course & Document;

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacher: Types.ObjectId;

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
  coverImage: {
    originalUrl: string;
    processedUrl: string;
    status: string;
  };

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Lesson' }], default: [] })
  lessons: Types.ObjectId[];

  @Prop({ default: 0 })
  enrolledStudentsCount: number;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
