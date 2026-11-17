export class CreateProductRequest {
  constructor(
    public readonly name: string,
    public readonly category: string,
    public readonly rawDescription: string = '',
    public readonly keywords: string[] = [],
    public readonly targetAudience?: string,
    public readonly tone?: string,
  ) {}
}
