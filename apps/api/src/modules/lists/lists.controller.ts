import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ListsService } from './lists.service';

@ApiTags('Lists')
@ApiBearerAuth()
@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get()
  findAll(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.listsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listsService.findOne(id);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @Query() query: { page?: number; limit?: number }) {
    return this.listsService.getMembers(id, query);
  }

  @Post(':id/members')
  addMembers(@Param('id') id: string, @Body('contactIds') contactIds: string[]) {
    return this.listsService.addMembers(id, contactIds);
  }

  @Get(':id/contacts')
  getContacts(@Param('id') id: string, @Query() query: { page?: number; limit?: number }) {
    return this.listsService.getContacts(id, query);
  }

  @Post()
  create(@Body() dto: { name: string; description?: string }) {
    return this.listsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { name?: string; description?: string }) {
    return this.listsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.listsService.remove(id);
  }

  @Delete(':id/members')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMembers(@Param('id') id: string, @Body('contactIds') contactIds: string[]) {
    return this.listsService.removeMembers(id, contactIds);
  }

  @Delete(':id/contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeContact(@Param('id') id: string, @Param('contactId') contactId: string) {
    return this.listsService.removeContact(id, contactId);
  }
}
