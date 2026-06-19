import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MainApiModule } from './services/main-api/src/app.module';

@Module({
  imports: [MainApiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
