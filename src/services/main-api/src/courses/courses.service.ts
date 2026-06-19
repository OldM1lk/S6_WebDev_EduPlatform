import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { Lesson, LessonDocument } from './schemas/lesson.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async clearCoursesListCache(): Promise<void> {
    await this.cacheManager.del('all_courses');
  }

  private async clearCourseCache(courseId: string): Promise<void> {
    await this.cacheManager.del(`course_${courseId}`);
  }

  private async invalidateCache(courseId?: string): Promise<void> {
    await this.clearCoursesListCache();
    if (courseId) {
      await this.clearCourseCache(courseId);
    }
  }

  async findAll(): Promise<CourseDocument[]> {
    const cachedCourses =
      await this.cacheManager.get<CourseDocument[]>('all_courses');
    if (cachedCourses) {
      return cachedCourses;
    }

    const courses = await this.courseModel
      .find()
      .populate('teacher', 'name email')
      .exec();

    await this.cacheManager.set('all_courses', courses, 60 * 5);

    return courses;
  }

  async findById(courseId: string): Promise<CourseDocument> {
    const cachedCourse = await this.cacheManager.get<CourseDocument>(
      `course_${courseId}`,
    );
    if (cachedCourse) {
      return cachedCourse;
    }

    const course = await this.courseModel
      .findById(courseId)
      .populate('teacher', 'name email')
      .populate('lessons')
      .exec();

    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    await this.cacheManager.set(`course_${courseId}`, course, 60 * 5);

    return course;
  }

  async create(
    teacherId: string,
    title: string,
    description: string,
  ): Promise<CourseDocument> {
    const course = new this.courseModel({
      title,
      description,
      teacher: teacherId,
      lessons: [],
    });
    const savedCourse = await course.save();

    await this.clearCoursesListCache();

    return savedCourse;
  }

  async update(
    courseId: string,
    userId: string,
    updateData: { title?: string; description?: string },
  ): Promise<CourseDocument> {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    if (course.teacher.toString() !== userId) {
      throw new ForbiddenException('Вы не являетесь владельцем этого курса');
    }

    if (updateData.title) course.title = updateData.title;
    if (updateData.description) course.description = updateData.description;
    const updatedCourse = await course.save();

    await this.invalidateCache(courseId);

    return updatedCourse;
  }

  async delete(courseId: string, userId: string): Promise<void> {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    if (course.teacher.toString() !== userId) {
      throw new ForbiddenException('Вы не являетесь владельцем этого курса');
    }

    await this.lessonModel.deleteMany({ course: courseId });
    await this.courseModel.findByIdAndDelete(courseId);

    await this.invalidateCache(courseId);
  }

  async enroll(courseId: string, studentId: string): Promise<CourseDocument> {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    const student = await this.userModel.findById(studentId);
    if (!student) {
      throw new NotFoundException('Студент не найден');
    }

    const alreadyEnrolled = student.enrolledCourses.some(
      (id) => id.toString() === courseId,
    );
    if (alreadyEnrolled) {
      throw new ForbiddenException('Вы уже записаны на этот курс');
    }

    student.enrolledCourses.push(course._id);
    await student.save();

    course.enrolledStudentsCount += 1;
    const updatedCourse = await course.save();

    await this.invalidateCache(courseId);

    return updatedCourse;
  }

  async findLessonsByCourse(courseId: string): Promise<LessonDocument[]> {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Курс не найден');
    }
    return this.lessonModel.find({ course: courseId }).exec();
  }

  async addLesson(
    courseId: string,
    userId: string,
    title: string,
    content: string,
  ): Promise<LessonDocument> {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    if (course.teacher.toString() !== userId) {
      throw new ForbiddenException(
        'Только владелец курса может добавлять уроки',
      );
    }

    const lesson = new this.lessonModel({
      title,
      content,
      course: courseId,
    });
    const savedLesson = await lesson.save();

    course.lessons.push(savedLesson._id);
    await course.save();

    await this.invalidateCache(courseId);

    return savedLesson;
  }

  async updateLesson(
    lessonId: string,
    userId: string,
    updateData: { title?: string; content?: string },
  ): Promise<LessonDocument> {
    const lesson = await this.lessonModel.findById(lessonId);
    if (!lesson) {
      throw new NotFoundException('Урок не найден');
    }

    const course = await this.courseModel.findById(lesson.course);
    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    if (course.teacher.toString() !== userId) {
      throw new ForbiddenException(
        'Только владелец курса может обновлять уроки',
      );
    }

    if (updateData.title) lesson.title = updateData.title;
    if (updateData.content) lesson.content = updateData.content;
    const updatedLesson = await lesson.save();

    await this.invalidateCache(course._id.toString());

    return updatedLesson;
  }

  async deleteLesson(lessonId: string, userId: string): Promise<void> {
    const lesson = await this.lessonModel.findById(lessonId);
    if (!lesson) {
      throw new NotFoundException('Урок не найден');
    }

    const course = await this.courseModel.findById(lesson.course);
    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    if (course.teacher.toString() !== userId) {
      throw new ForbiddenException('Только владелец курса может удалять уроки');
    }

    course.lessons = course.lessons.filter((id) => id.toString() !== lessonId);
    await course.save();
    await this.lessonModel.findByIdAndDelete(lessonId);

    await this.invalidateCache(course._id.toString());
  }

  async uploadLessonImage(
    lessonId: string,
    userId: string,
    filePath: string,
  ): Promise<LessonDocument> {
    const lesson = await this.lessonModel.findById(lessonId);
    if (!lesson) {
      throw new NotFoundException('Урок не найден');
    }

    const course = await this.courseModel.findById(lesson.course);
    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    if (course.teacher.toString() !== userId) {
      throw new ForbiddenException(
        'Только владелец курса может загружать изображения для уроков',
      );
    }

    lesson.image = {
      originalUrl: filePath,
      processedUrl: '',
      status: 'processing',
    };
    await lesson.save();

    await this.invalidateCache(course._id.toString());

    return lesson;
  }
}
