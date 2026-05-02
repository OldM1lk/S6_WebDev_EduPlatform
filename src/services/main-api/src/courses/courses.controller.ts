import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CoursesService } from './courses.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

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
}
