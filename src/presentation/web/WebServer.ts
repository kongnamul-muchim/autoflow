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
const MODULE = process.env.AUTOFLOW_MODULE || 'commerce';

async function createApp() {
  const container = await createContainer(MODULE);
  const { logger, module: activeModule, registry, runAutomationPipeline, taskRepo, aiService } = container;

  // 지금 mock 인지 실제 API 인지 서버가 직접 알린다. 화면·포트폴리오 문구를 이 값에 묶는다.
  const aiMode = (): 'live' | 'sample' | 'degraded' => {
    const probe = aiService as unknown as { aiStatus?: () => 'live' | 'sample' | 'degraded' };
    if (typeof probe.aiStatus === 'function') return probe.aiStatus();
    return 'sample';
  };

  const aiProvider = (): string => {
    const probe = aiService as unknown as { providerName?: () => string };
    return typeof probe.providerName === 'function' ? probe.providerName() : 'unknown';
  };

  const webController = new WebController(
    activeModule,
    registry,
    runAutomationPipeline,
    taskRepo,
    logger,
  );

  const app = express();

  app.use(cors());
  app.use(express.json());

  // Module-aware root: serve correct HTML before express.static grabs index.html
  app.get('/', (req, res, next) => {
    if (MODULE === 'office') {
      return res.sendFile(path.join(PUBLIC_DIR, 'office.html'));
    }
    next();
  });

  // Static files
  app.use(express.static(PUBLIC_DIR));

  // ── Shared API Routes ──

  // Module info
  app.get('/api/module', async (_req, res) => {
    const info = await webController.getModuleInfo();
    res.json(info);
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', module: MODULE, version: '0.2.0', aiMode: aiMode(), aiProvider: aiProvider() });
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

  // ── Commerce Module Routes ──
  if (MODULE === 'commerce') {
    app.post('/api/describe', async (req, res) => {
      try {
        const { name, category, description, keywords, audience, tone } = req.body;
        if (!name || !category) {
          res.status(400).json({ success: false, message: '상품명(name)과 카테고리(category)는 필수입니다.' });
          return;
        }
        const result = await webController.describeProduct({ name, category, description, keywords, audience, tone });
        res.json({ ...result, aiMode: aiMode() });
      } catch (error) {
        res.status(500).json({ success: false, message: '서버 오류' });
      }
    });

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
  }

  // ── Office Module Routes ──
  if (MODULE === 'office') {
    app.post('/api/summarize', async (req, res) => {
      try {
        const { title, content, type, author } = req.body;
        if (!title || !content) {
          res.status(400).json({ success: false, message: '문서 제목(title)과 내용(content)은 필수입니다.' });
          return;
        }
        const result = await webController.summarizeDocument({ title, content, type, author });
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: '서버 오류' });
      }
    });

    app.post('/api/entry', async (req, res) => {
      try {
        const { source, records } = req.body;
        if (!source) {
          res.status(400).json({ success: false, message: '데이터 출처(source)는 필수입니다.' });
          return;
        }
        const result = await webController.batchDataEntry({ source, records: records || [] });
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: '서버 오류' });
      }
    });
  }

  // 리포트 API (모듈별로 다르게 동작)
  app.post('/api/report', async (req, res) => {
    try {
      if (MODULE === 'office') {
        const { periodType, department, period } = req.body;
        const result = await webController.generateOfficeReport({
          periodType: periodType || period || 'weekly',
          department,
        });
        res.json(result);
      } else {
        const { platforms } = req.body;
        const result = await webController.generateReport({ platforms });
        res.json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, message: '서버 오류' });
    }
  });

  // SPA fallback
  app.get('/{*path}', (_req, res) => {
    const htmlFile = MODULE === 'office' ? 'office.html' : 'index.html';
    res.sendFile(path.join(PUBLIC_DIR, htmlFile));
  });

  return app;
}

// ── Start Server ──
const dataDir = path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const app = await createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AutoFlow Web Server running on http://0.0.0.0:${PORT}`);
  console.log(`📂 Module: ${MODULE}`);
  console.log(`📂 Serving static files from ${PUBLIC_DIR}`);
});

export { createApp };
