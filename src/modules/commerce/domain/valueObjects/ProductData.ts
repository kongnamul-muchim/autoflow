export class ProductContentRequest {
  constructor(
    public readonly name: string,
    public readonly category: string,
    public readonly rawDescription: string,
    public readonly keywords: string[],
    public readonly targetAudience?: string,
    public readonly tone?: string,
  ) {}
}

export class ProductContentResult {
  constructor(
    public readonly title: string,
    public readonly description: string,
    public readonly keywords: string[],
    public readonly sellingPoints: string[],
    public readonly seoDescription: string,
    public readonly rawResponse: string,
  ) {}
}

export class ProductData {
  constructor(
    public readonly name: string,
    public readonly category: string,
    public readonly price: number,
    public readonly description: string,
    public readonly keywords: string[],
    public readonly images: string[] = [],
    public readonly id?: string,
  ) {
    if (!name) throw new Error('name is required');
    if (price < 0) throw new Error('price must be non-negative');
  }

  get formattedPrice(): string {
    return `\u20A9${this.price.toLocaleString()}`;
  }
}
