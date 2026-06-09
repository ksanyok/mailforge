import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(
    @Query() query: {
      page?: number; limit?: number; search?: string;
      status?: string; listId?: string; tagId?: string;
      sortBy?: string; sortOrder?: 'asc' | 'desc';
    },
  ) {
    return this.contactsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.contactsService.create(dto);
  }

  @Patch('bulk')
  bulkAction(@Body() dto: any) {
    return this.contactsService.bulkAction(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body('content') content: string) {
    return this.contactsService.addNote(id, content);
  }

  @Post('verify-email')
  verifyEmail(@Body('email') email: string) {
    return this.contactsService.verifyEmailMx(email);
  }

  @Post('verify-list/:listId')
  verifyList(@Param('listId') listId: string) {
    return this.contactsService.verifyContactsList(listId);
  }
}
