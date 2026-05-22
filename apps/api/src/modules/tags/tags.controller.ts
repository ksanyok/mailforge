import {
  Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TagsService } from './tags.service';

@ApiTags('Tags')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll() { return this.tagsService.findAll(); }

  @Post()
  create(@Body() dto: { name: string; color?: string }) {
    return this.tagsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { name?: string; color?: string }) {
    return this.tagsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}
