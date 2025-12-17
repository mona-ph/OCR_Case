import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatsService {
  constructor(private prisma: PrismaService) {}

  // Ensures doc exists and belongs to the user
  private async assertDocumentOwnership(userId: string, documentId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.userId !== userId) throw new ForbiddenException('Access denied');
    return doc;
  }

  // Ensures thread exists and belongs to the user
  private async assertThreadOwnership(userId: string, threadId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { document: { include: { ocr: true } } },
    });

    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.userId !== userId) throw new ForbiddenException('Access denied');

    return thread;
  }

  async createThread(userId: string, documentId: string) {
    await this.assertDocumentOwnership(userId, documentId);

    return this.prisma.chatThread.create({
      data: { userId, documentId },
    });
  }

  async addUserMessageAndReply(userId: string, threadId: string, content: string) {
    const thread = await this.assertThreadOwnership(userId, threadId);

    // 1) store user message
    const userMsg = await this.prisma.chatMessage.create({
      data: {
        threadId,
        role: ChatRole.user,
        content,
      },
    });

    // 2) generate assistant reply (placeholder for now)
    // Later we’ll call the LLM using OCR text as context.
    const ocrText = thread.document.ocr?.text ?? '';
    const assistantContent =
      `I received your message.\n\n` +
      `Document OCR preview:\n` +
      `${ocrText.slice(0, 300)}${ocrText.length > 300 ? '...' : ''}`;

    // 3) store assistant message
    const assistantMsg = await this.prisma.chatMessage.create({
      data: {
        threadId,
        role: ChatRole.assistant,
        content: assistantContent,
      },
    });

    return { userMsg, assistantMsg };
  }

  async getThread(userId: string, threadId: string) {
    await this.assertThreadOwnership(userId, threadId);

    return this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, document: { include: { ocr: true } } },
    });
  }
}
