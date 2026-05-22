import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  async get(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting ${key} not found`);
    return setting;
  }

  async set(key: string, value: string) {
    return this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async getValue(key: string, defaultValue = ''): Promise<string> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? defaultValue;
  }

  async bulkUpdate(settings: { key: string; value: string }[]) {
    await Promise.all(settings.map((s) => this.set(s.key, s.value)));
    return this.findAll();
  }
}
