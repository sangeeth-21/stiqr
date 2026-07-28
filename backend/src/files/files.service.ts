import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async upload(file: Express.Multer.File, userId?: string, folder = 'general') {
    if (!file) throw new BadRequestException('No file provided');

    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760');
    if (file.size > maxSize) throw new BadRequestException('File too large');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed');
    }

    const uploadDir = path.join(process.env.UPLOAD_DIR || './uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    return this.prisma.uploadedFile.create({
      data: {
        originalName: file.originalname,
        fileName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/${folder}/${file.filename}`,
        uploadedBy: userId,
      },
    });
  }

  async findOne(id: string) {
    const file = await this.prisma.uploadedFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async remove(id: string) {
    const file = await this.findOne(id);
    const filePath = file.path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return this.prisma.uploadedFile.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
