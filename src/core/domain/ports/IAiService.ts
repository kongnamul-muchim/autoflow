export interface IAiService {
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
}
