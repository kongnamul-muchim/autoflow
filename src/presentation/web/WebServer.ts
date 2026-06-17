import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createContainer } from '../../di/container.js';
import { WebController } from './WebController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../../../public');
const PORT = parseInt(process.env.AUTOFLOW_PORT || '4002', 10);

function createApp() {
  const { logger, ...services } = createContainer();
  const webController = new WebController(
    services.createProductDescription,
    services.generateMarketingReport,
    services.syncExternalData,
    services.runAutomationPipeline,
    logger,
  );

  const app = express();

  app.use(cors());
  app.use(express.json());

  // Static files
  app.use(express.static(PUBLIC_DIR));

  // ── API Routes ──

  // 상품 설명 생성
  app.post('/api/describe', async (req, res) => {
    try {
      const { name, category, description, keywords, audience, tone } = req.body;
      if (!name || !category) {
        res.status(400).json({ success: false, message: '상품명(name)과 카테고리(category)는 필수입니다.' });
        return;
      }
      const result = await webController.describeProduct({ name, category, description, keywords, audience, tone });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '서버 오류' });
    }
  });

  // 마케팅 리포트 생성
  app.post('/api/report', async (req, res) => {
    try {
      const { platforms } = req.body;
      const result = await webController.generateReport({ platforms });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '서버 오류' });
    }
  });

  // 데이터 동기화
  app.post('/api/sync', async (req, res) => {
    try {
      const { source, target } = req.body;
      if (!source || !target) {
        res.status(400).json({ success: false, message: 'source와 target은 필수입니다.' });
        return;
      }
      const result = await webController.syncData({ source, target });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '서버 오류' });
    }
  });

  // 파이프라인 실행
  app.post('/api/pipeline', async (req, res) => {
    try {
      const { name, steps } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: '파이프라인 이름(name)은 필수입니다.' });
        return;
      }
      const result = await webController.runPipeline({ name, steps: parseInt(steps || '1', 10) });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: '서버 오류' });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: '0.1.0' });
  });

  // SPA fallback (Express v5)
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  return app;
}

// ── Start Server ──
const dataDir = path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AutoFlow Web Server running on http://0.0.0.0:${PORT}`);
  console.log(`📂 Serving static files from ${PUBLIC_DIR}`);
});

export { createApp };
