export interface AppConfig {
  nodeEnv: string;
  anthropicApiKey: string;
  dataDir: string;
  apiKeys: Record<string, string>;
}

export interface IConfigService {
  get(): AppConfig;
  getApiKey(platform: string): string | undefined;
  isDevelopment(): boolean;
  isProduction(): boolean;
}
