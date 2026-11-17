export type DocumentType = 'meeting_minutes' | 'report' | 'proposal' | 'memo' | 'invoice' | 'other';

export class Document {
  constructor(
    public readonly title: string,
    public readonly content: string,
    public readonly type: DocumentType = 'other',
    public readonly author?: string,
    public readonly date: Date = new Date(),
    public readonly tags: string[] = [],
    public readonly id?: string,
  ) {
    if (!title) throw new Error('Document title is required');
  }

  get wordCount(): number {
    return this.content.split(/\s+/).filter(Boolean).length;
  }

  get summary(): string {
    return this.content.length > 100 ? this.content.substring(0, 100) + '...' : this.content;
  }
}

export class DocumentSummary {
  constructor(
    public readonly documentId: string,
    public readonly title: string,
    public readonly summary: string,
    public readonly keyPoints: string[],
    public readonly actionItems: string[],
    public readonly generatedAt: Date = new Date(),
  ) {}
}
