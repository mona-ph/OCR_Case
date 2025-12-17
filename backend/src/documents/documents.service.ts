import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as Tesseract from 'tesseract.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async createAndOcr(userId: string, file: Express.Multer.File) {
    // 1) store document metadata
    const doc = await this.prisma.document.create({
      data: {
        userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path.replace(/\\/g, '/'), // normalize windows path
      },
    });

    // 2) OCR (simple synchronous prototype)
    const result = await Tesseract.recognize(file.path, 'eng');
    const text = result.data.text ?? '';

    // 3) store OCR result
    await this.prisma.ocrResult.create({
      data: {
        documentId: doc.id,
        text,
      },
    });

    // return doc + ocr
    return this.prisma.document.findUnique({
      where: { id: doc.id },
      include: { ocr: true },
    });
  }

  listForUser(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { ocr: true, threads: { include: { messages: true } } },
    });
  }

  async getForUser(userId: string, documentId: string) {
  const doc = await this.prisma.document.findUnique({
    where: { id: documentId },
    include: { ocr: true, threads: { include: { messages: true } } },
  });

  if (!doc) throw new NotFoundException('Document not found');
  if (doc.userId !== userId) throw new ForbiddenException('Access denied');

  return doc;
}

async getFileForUser(userId: string, documentId: string) {
  const doc = await this.prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc) throw new NotFoundException('Document not found');
  if (doc.userId !== userId) throw new ForbiddenException('Access denied');

  // safe: only use the storedPath from DB, never from user input
  const filePath = join(process.cwd(), doc.storagePath);

  return { doc, filePath };
}

}
