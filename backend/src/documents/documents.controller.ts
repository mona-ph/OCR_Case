import {
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { DocumentsService } from './documents.service';
import { Param, Res } from '@nestjs/common';
import type { Response } from 'express';

function fileName(_req: any, file: Express.Multer.File, cb: any) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  cb(null, `${unique}${extname(file.originalname)}`);
}

function fileFilter(_req: any, file: Express.Multer.File, cb: any) {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new BadRequestException('Only PNG/JPG images are allowed'), false);
  }
  cb(null, true);
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: fileName,
      }),
      fileFilter,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException('File is required');

    return this.documentsService.createAndOcr(user.id, file);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.documentsService.listForUser(user.id);
  }

  @Get(':id')
async getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
  return this.documentsService.getForUser(user.id, id);
}

@Get(':id/file')
async download(@Param('id') id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
  const { doc, filePath } = await this.documentsService.getFileForUser(user.id, id);

  return res.download(filePath, doc.originalName);
}

@Get(':id/export')
async exportPdf(
  @Param('id') id: string,
  @CurrentUser() user: AuthUser,
  @Res() res: Response,
) {
  const pdfBytes = await this.documentsService.exportPdfForUser(user.id, id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="document-export.pdf"');
  return res.send(Buffer.from(pdfBytes));
}
}


