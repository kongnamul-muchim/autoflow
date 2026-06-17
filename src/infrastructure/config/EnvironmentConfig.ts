import { IConfigService, AppConfig } from '../../domain/ports/IConfigService.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class EnvironmentConfig implements IConfigService {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  get(): AppConfig {
    return this.config;
  }

  getApiKey(platform: string): string | undefined {
    return this.config.apiKeys[platform];
  }

  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  private loadConfig(): AppConfig {
    // Try to load .env file
    this.tryLoadEnvFile();

    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      dataDir: process.env.DATA_DIR || './data',
      apiKeys: {
        cafe24: process.env.CAFE24_API_KEY || '',
        meta: process.env.META_ADS_ACCESS_TOKEN || '',
        naver: process.env.NAVER_AD_API_KEY || '',
        ga4: process.env.GA4_PROPERTY_ID || '',
      },
    };
  }

  private tryLoadEnvFile(): void {
    const envPath = path.resolve(process.cwd(), '.env');
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;
          const key = trimmed.substring(0, eqIdx).trim();
          const value = trimmed.substring(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    } catch {
      // .env file is optional
    }
  }
}
