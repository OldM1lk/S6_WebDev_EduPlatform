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
  teacherId: Types.ObjectId;

  @Prop({
    coverImage: {
      url: String,
      status: {
        type: String,
        enum: ['processing', 'ready', 'failed'],
        default: 'processing',
      },
    },
  })
  coverImage: { url: string; status: string };

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Lesson' }], default: [] })
  lessons: Types.ObjectId[];

  @Prop({ default: 0 })
  enrolledStudentsCount: number;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
