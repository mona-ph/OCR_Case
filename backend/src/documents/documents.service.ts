import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as Tesseract from 'tesseract.js';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';

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
        storagePath: file.path.replace(/\\/g, '/'), // normalize Windows path
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

    return this.prisma.document.findUnique({
      where: { id: doc.id },
      include: { ocr: true },
    });
  }

  listForUser(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        ocr: true,
        threads: { include: { messages: true } },
      },
    });
  }

  async getForUser(userId: string, documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        ocr: true,
        threads: { include: { messages: true } },
      },
    });

    if (!doc) throw new NotFoundException('Document not found');
    if (doc.userId !== userId)
      throw new ForbiddenException('Access denied');

    return doc;
  }

  async getFileForUser(userId: string, documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) throw new NotFoundException('Document not found');
    if (doc.userId !== userId)
      throw new ForbiddenException('Access denied');

    const filePath = join(process.cwd(), doc.storagePath);
    return { doc, filePath };
  }

  // FIXED: delete all documents + related data for the user
  async deleteAllForUser(userId: string) {
    const docs = await this.prisma.document.findMany({
      where: { userId },
      select: { id: true },
    });

    const docIds = docs.map((d) => d.id);
    if (docIds.length === 0) return { deleted: 0 };

    // Order matters (FK safety)
    await this.prisma.chatMessage.deleteMany({
      where: {
        thread: {
          documentId: { in: docIds },
        },
      },
    });

    await this.prisma.chatThread.deleteMany({
      where: {
        documentId: { in: docIds },
      },
    });

    await this.prisma.ocrResult.deleteMany({
      where: {
        documentId: { in: docIds },
      },
    });

    const res = await this.prisma.document.deleteMany({
      where: {
        id: { in: docIds },
      },
    });

    return { deleted: res.count };
  }

  async deleteChatForDocument(userId: string, documentId: string) {
    // Ensure document exists and belongs to user
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, userId: true },
    });

    if (!doc) throw new NotFoundException('Document not found');
    if (doc.userId !== userId) throw new ForbiddenException('Access denied');

    // Delete messages first, then threads
    const threads = await this.prisma.chatThread.findMany({
      where: { documentId },
      select: { id: true },
    });

    const threadIds = threads.map(t => t.id);
    if (threadIds.length === 0) return { deletedThreads: 0, deletedMessages: 0 };

    const deletedMessages = await this.prisma.chatMessage.deleteMany({
      where: { threadId: { in: threadIds } },
    });

    const deletedThreads = await this.prisma.chatThread.deleteMany({
      where: { id: { in: threadIds } },
    });

    return {
      deletedThreads: deletedThreads.count,
      deletedMessages: deletedMessages.count,
    };
  }


  async exportPdfForUser(userId: string, documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        ocr: true,
        threads: {
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!doc) throw new NotFoundException('Document not found');
    if (doc.userId !== userId)
      throw new ForbiddenException('Access denied');

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Page 1: original image
    const filePath = join(process.cwd(), doc.storagePath);
    const fileBytes = await readFile(filePath);

    const image =
      doc.mimeType === 'image/png'
        ? await pdfDoc.embedPng(fileBytes)
        : await pdfDoc.embedJpg(fileBytes);

    const page1 = pdfDoc.addPage();
    const { width, height } = page1.getSize();

    const imgDims = image.scale(1);
    const scale = Math.min(width / imgDims.width, height / imgDims.height);
    const scaled = image.scale(scale);

    page1.drawImage(image, {
      x: (width - scaled.width) / 2,
      y: (height - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    });

    // Page 2+: OCR + chat
    let page = pdfDoc.addPage();
    const margin = 40;
    let y = page.getSize().height - margin;
    const lineHeight = 14;
    const fontSize = 11;
    const maxWidth = page.getSize().width - margin * 2;

    function wrapText(text: string) {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = '';

      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        const width = font.widthOfTextAtSize(test, fontSize);
        if (width > maxWidth) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    const content: string[] = [];
    content.push(`Document: ${doc.originalName}`);
    content.push(`Created: ${doc.createdAt.toISOString()}`);
    content.push('');
    content.push('=== OCR TEXT ===');
    content.push(doc.ocr?.text ?? '(no OCR text)');
    content.push('');
    content.push('=== CHAT ===');

    for (const thread of doc.threads) {
      for (const m of thread.messages) {
        content.push(`[${m.role}] ${m.content}`);
      }
      content.push('');
    }

    for (const rawLine of content.join('\n').split(/\r?\n/)) {
      const wrapped = wrapText(rawLine === '' ? ' ' : rawLine);
      for (const line of wrapped) {
        if (y < margin) {
          page = pdfDoc.addPage();
          y = page.getSize().height - margin;
        }
        page.drawText(line, { x: margin, y, size: fontSize, font });
        y -= lineHeight;
      }
    }

    return pdfDoc.save();
  }
}
