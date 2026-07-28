import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocalizationService {
  constructor(private prisma: PrismaService) {}

  async createTranslation(data: any) {
    return this.prisma.translation.upsert({
      where: {
        language_key: {
          language: data.language,
          key: data.key,
        },
      },
      update: { value: data.value, namespace: data.namespace },
      create: data,
    });
  }

  async bulkCreateTranslations(data: any) {
    const { language, namespace, translations } = data;
    const records = translations.map((t: any) => ({
      language,
      namespace,
      key: t.key,
      value: t.value,
    }));

    return this.prisma.translation.createMany({
      data: records,
    });
  }

  async listTranslations(query: any) {
    const { language, namespace, page = 1, limit = 100 } = query;
    const where: any = {};

    if (language) where.language = language;
    if (namespace) where.namespace = namespace;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.translation.findMany({ where, skip, take: limit, orderBy: { key: 'asc' } }),
      this.prisma.translation.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTranslation(id: string) {
    const translation = await this.prisma.translation.findFirst({ where: { id } });
    if (!translation) throw new NotFoundException('Translation not found');
    return translation;
  }

  async deleteTranslation(id: string) {
    await this.getTranslation(id);
    return this.prisma.translation.delete({ where: { id } });
  }

  async listLanguages() {
    const result = await this.prisma.translation.groupBy({
      by: ['language'],
      _count: { language: true },
    });
    return result.map((item) => ({ language: item.language, count: item._count.language }));
  }

  async exportByLanguage(language: string) {
    const translations = await this.prisma.translation.findMany({
      where: { language },
      select: { key: true, value: true },
    });

    const result: Record<string, string> = {};
    translations.forEach((t) => {
      result[t.key] = t.value;
    });
    return result;
  }

  async getStats() {
    const byLanguage = await this.prisma.translation.groupBy({
      by: ['language'],
      _count: { language: true },
    });

    const total = await this.prisma.translation.count();

    return {
      total,
      byLanguage: byLanguage.map((item) => ({ language: item.language, count: item._count.language })),
    };
  }
}
