import {
  Controller, Get, Post, Param, Query, Body,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ImportsService } from './imports.service';
import { CurrentUser, RequestUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Imports')
@ApiBearerAuth()
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get()
  findAll(@Query() query: { page?: number; limit?: number }) {
    return this.importsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.importsService.findOne(id);
  }

  @Get(':id/errors')
  getErrors(@Param('id') id: string, @Query() query: { page?: number; limit?: number }) {
    return this.importsService.getErrors(id, query);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
      const allowed = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel', 'application/json', 'text/plain'];
      const allowedExt = ['.csv', '.xlsx', '.xls', '.json', '.txt'];
      const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
      if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'), false);
      }
    },
  }))
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: { listId?: string; dedupeRule?: string; columnMapping?: string },
    @CurrentUser() user: RequestUser,
  ) {
    const columnMapping = dto.columnMapping ? JSON.parse(dto.columnMapping) : {};
    return this.importsService.createImport(file, { ...dto, columnMapping }, user.id);
  }
}
