import { Controller, Post, Delete, Get, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FileUploadDto } from './dto/upload.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: any, @CurrentUser('id') userId: string) {
    return this.uploadService.upload(file, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  delete(@Param('id') id: string) {
    return this.uploadService.delete(id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get file info' })
  getFile(@Param('id') id: string) {
    return this.uploadService.getFile(id);
  }
}
