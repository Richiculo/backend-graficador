import { Module } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { ValidationController } from './validation.controller';

@Module({
  controllers: [ValidationController],
  providers: [ValidationService],
})
export class ValidationModule {}
