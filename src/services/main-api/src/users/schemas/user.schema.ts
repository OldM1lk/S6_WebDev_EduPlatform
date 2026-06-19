import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: ['student', 'teacher'] })
  role: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Course' }], default: [] })
  enrolledCourses: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
