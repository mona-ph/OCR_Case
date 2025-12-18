import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as Tesseract from 'tesseract.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'fs';
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
async exportPdfForUser(userId: string, documentId: string) {
  const doc = await this.prisma.document.findUnique({
    where: { id: documentId },
    include: {
      ocr: true,
      threads: { include: { messages: { orderBy: { createdAt: 'asc' } } } },
    },
  });

  if (!doc) throw new NotFoundException('Document not found');
  if (doc.userId !== userId) throw new ForbiddenException('Access denied');

  // 1) Create PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 2) Embed the original image (page 1)
  const filePath = join(process.cwd(), doc.storagePath);
  const fileBytes = await readFile(filePath);

  const isPng = doc.mimeType === 'image/png';
  const image = isPng
    ? await pdfDoc.embedPng(fileBytes)
    : await pdfDoc.embedJpg(fileBytes);

  const page1 = pdfDoc.addPage();
  const { width, height } = page1.getSize();

  // Scale image to fit page
  const imgDims = image.scale(1);
  const scale = Math.min(width / imgDims.width, height / imgDims.height);
  const scaled = image.scale(scale);

  page1.drawImage(image, {
    x: (width - scaled.width) / 2,
    y: (height - scaled.height) / 2,
    width: scaled.width,
    height: scaled.height,
  });

  // 3) Add OCR + Chat transcript (page 2+)
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
      const testWidth = font.widthOfTextAtSize(test, fontSize);

      if (testWidth > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  const linesToPrint: string[] = [];

  linesToPrint.push(`Document: ${doc.originalName}`);
  linesToPrint.push(`Created: ${doc.createdAt.toISOString()}`);
  linesToPrint.push('');
  linesToPrint.push('=== OCR TEXT ===');
  linesToPrint.push(doc.ocr?.text ?? '(no OCR text)');
  linesToPrint.push('');
  linesToPrint.push('=== CHAT ===');

  for (const thread of doc.threads) {
    for (const m of thread.messages) {
      linesToPrint.push(`[${m.role}] ${m.content}`);
    }
    linesToPrint.push(''); // blank line between threads
  }

  // IMPORTANT: handle Windows CRLF too
  for (const rawLine of linesToPrint.join('\n').split(/\r?\n/)) {
    const wrapped = wrapText(rawLine === '' ? ' ' : rawLine);

    for (const ln of wrapped) {
      if (y < margin) {
        page = pdfDoc.addPage();
        y = page.getSize().height - margin;
      }

      page.drawText(ln, { x: margin, y, size: fontSize, font });
      y -= lineHeight;
    }
  }

  return await pdfDoc.save();
}
}
