import * as crypto from 'node:crypto';
import { parseJsonObject, toStringArray } from '../../../../core/application/support/jsonResponse.js';
import { IAiService } from '../../../../core/domain/ports/IAiService.js';
import { ILogger } from '../../../../core/domain/ports/ILogger.js';
import { Document, DocumentSummary } from '../../domain/valueObjects/Document.js';
import { SummarizeRequest } from '../dto/DocumentRequest.js';

export class SummarizeDocument {
  constructor(
    private readonly aiService: IAiService,
    private readonly logger: ILogger,
  ) {}

  async execute(request: SummarizeRequest): Promise<DocumentSummary> {
    this.logger.info('SummarizeDocument', 'Starting document summarization', {
      title: request.title,
      type: request.type,
    });

    const doc = new Document(request.title, request.content, request.type as any, request.author);
    const docId = crypto.randomUUID();

    const prompt = [
      `Please analyze the following document and provide:`,
      `1. A concise summary (Korean, 3-5 sentences)`,
      `2. 3-5 key points`,
      `3. Any action items mentioned`,
      ``,
      `Title: ${doc.title}`,
      `Type: ${doc.type}`,
      `Author: ${doc.author || 'Unknown'}`,
      ``,
      `Content:`,
      doc.content,
      ``,
      `Format your response as JSON:`,
      `{`,
      `  "summary": "...",`,
      `  "keyPoints": ["...", "..."],`,
      `  "actionItems": ["...", "..."]`,
      `}`,
    ].join('\n');

    const response = await this.aiService.generateText(prompt, 'You are an expert business document analyst.');

    const raw = parseJsonObject<Record<string, unknown>>(response) ?? {};
    const parsed = {
      summary: typeof raw.summary === 'string' ? raw.summary.trim() : response.replace(/```[a-z]*|```/gi, '').trim().substring(0, 200),
      keyPoints: toStringArray(raw.keyPoints),
      actionItems: toStringArray(raw.actionItems),
    };

    this.logger.info('SummarizeDocument', 'Document summarized successfully', {
      docId,
      wordCount: doc.wordCount,
    });

    return new DocumentSummary(
      docId,
      doc.title,
      parsed.summary || '요약 생성 완료',
      parsed.keyPoints || [],
      parsed.actionItems || [],
    );
  }
}
