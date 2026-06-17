import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CoursesService } from './courses.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { KafkaProducer } from '../kafka/kafka.producer';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly kafkaProducer: KafkaProducer,
  ) {}

  @Get()
  async findAll() {
    return this.coursesService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.coursesService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('teacher')
  @Post()
  async create(
    @Req() req,
    @Body() body: { title: string; description: string },
  ) {
    return this.coursesService.create(
      req.user.userId,
      body.title,
      body.description,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('teacher')
  @Put(':id')
  async update(@Param('id') id: string, @Req() req, @Body() body: any) {
    return this.coursesService.update(id, req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('teacher')
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    await this.coursesService.delete(id, req.user.userId);
    return { message: 'Курс успешно удалён' };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('student')
  @Post(':id/enroll')
  async enroll(@Param('id') id: string, @Req() req) {
    return this.coursesService.enroll(id, req.user.userId);
  }

  @Get(':courseId/lessons')
  async findLessons(@Param('courseId') courseId: string) {
    return this.coursesService.findLessonsByCourse(courseId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('teacher')
  @Post(':courseId/lessons')
  async addLesson(
    @Param('courseId') courseId: string,
    @Req() req,
    @Body() body: { title: string; content: string },
  ) {
    return this.coursesService.addLesson(
      courseId,
      req.user.userId,
      body.title,
      body.content,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('teacher')
  @Put('lessons/:lessonId')
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Req() req,
    @Body() body: any,
  ) {
    return this.coursesService.updateLesson(lessonId, req.user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('teacher')
  @Delete('lessons/:lessonId')
  async deleteLesson(@Param('lessonId') lessonId: string, @Req() req) {
    await this.coursesService.deleteLesson(lessonId, req.user.userId);
    return { message: 'Урок успешно удалён' };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('teacher')
  @Post(':id/cover')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/original',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + path.extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\//)) {
          return cb(new Error('Только изображения'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadCover(
    @Param('id') courseId: string,
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const course = await this.coursesService.findById(courseId);
    if (course.teacher._id.toString() === req.user.userId) {
      fs.unlinkSync(file.path);
      throw new ForbiddenException(
        'Только владелец курса может загружать обложку',
      );
    }

    course.coverImage = {
      originalUrl: file.path,
      processedUrl: '',
      status: 'processing',
    };
    await course.save();

    await this.kafkaProducer.sendImageUploaded({
      imageId: course._id.toString(),
      originalPath: file.path,
      fileName: file.filename,
      type: 'course_cover',
    });

    return {
      message: 'Изображение загружено и отправлено на обработку',
      courseId,
    };
  }

  @Get('images/:fileName')
  getImage(@Param('fileName') fileName: string, @Res() res: express.Response) {
    const filePath = path.join(process.cwd(), 'uploads', 'processed', fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Изображение не найдено' });
    }

    res.sendFile(filePath);
  }
}
