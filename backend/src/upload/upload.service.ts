import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

@Injectable()
export class UploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly maxSize = 10 * 1024 * 1024;
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  validateFile(file: any) {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > this.maxSize) throw new BadRequestException('File size exceeds 10MB limit');
    if (!this.allowedMimeTypes.includes(file.mimetype)) throw new BadRequestException(`File type ${file.mimetype} not allowed`);
  }

  async compressImage(filePath: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      const tempPath = filePath + '.temp';
      await sharp(filePath)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(tempPath);
      fs.renameSync(tempPath, filePath);
    }
  }

  async upload(file: any, userId?: string): Promise<any> {
    this.validateFile(file);

    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadDir, fileName);

    if (file.buffer) {
      fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, filePath);
    }

    if (file.mimetype.startsWith('image/')) {
      await this.compressImage(filePath);
    }

    const stats = fs.statSync(filePath);

    const uploadedFile = await this.prisma.uploadedFile.create({
      data: {
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        size: stats.size,
        path: filePath,
        url: `/uploads/${fileName}`,
        uploadedBy: userId || null,
      },
    });

    return uploadedFile;
  }

  async delete(id: string) {
    const file = await this.prisma.uploadedFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return this.prisma.uploadedFile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getFile(id: string) {
    const file = await this.prisma.uploadedFile.findUnique({ where: { id } });
    if (!file || file.deletedAt) throw new NotFoundException('File not found');
    return file;
  }
}
