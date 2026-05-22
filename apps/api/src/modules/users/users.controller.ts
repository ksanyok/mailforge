import {
  Controller, Get, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../../core/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../core/decorators/current-user.decorator';
import { Role } from '@mailforge/shared';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: { name?: string; role?: string; isActive?: boolean },
  ) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @Param('id') id: string,
    @Body() dto: { currentPassword: string; newPassword: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.changePassword(id, dto.currentPassword, dto.newPassword, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.remove(id, user.id);
  }
}
