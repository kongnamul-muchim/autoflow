import express from 'express';
import { runWithAiOverride, currentAiOverride } from '../../infrastructure/ai/requestAiConfig.js';
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

  // 어떤 프로바이더·모델·호스트로 붙어 있는지, 설정에 문제가 있는지까지 그대로 노출한다.
  // 키 값은 절대 포함하지 않는다.
  const aiInfo = (): Record<string, unknown> => {
    const probe = aiService as unknown as {
      providerInfo?: () => { provider: string; model: string; baseHost: string; protocol: string; warning?: string };
      providerName?: () => string;
    };
    if (typeof probe.providerInfo === 'function') return { ...probe.providerInfo() };
    const name = typeof probe.providerName === 'function' ? probe.providerName() : 'unknown';
    return { provider: name };
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

  // ── 방문자 자기 키(BYOK) ──
  // 헤더로 온 키는 이 요청 처리 동안만 메모리에 존재한다. 저장하지 않고, 로그에도 원문을 남기지 않는다.
  // base URL 은 헤더로 받지 않는다. 클라이언트가 base 를 정할 수 있으면 서버가 임의 주소로
  // 요청을 보내는 SSRF 통로가 되기 때문이다. base 는 서버 env 만 신뢰한다.
  app.use((req, _res, next) => {
    const key = (req.get('x-ai-key') || '').trim();
    if (!key || key.length > 400) return next();
    const override = {
      key,
      provider: (req.get('x-ai-provider') || '').trim().toLowerCase() || undefined,
      model: (req.get('x-ai-model') || '').trim() || undefined,
    };
    runWithAiOverride(override, () => next());
  });

  // 어떤 모드로 응답했는지 기계가 읽을 수 있게 헤더로도 알린다(본문 형태를 건드리지 않기 위해).
  app.use((_req, res, next) => {
    const send = res.json.bind(res);
    res.json = (body: unknown) => {
      try {
        const override = currentAiOverride();
        res.setHeader('X-AI-Mode', aiMode());
        res.setHeader('X-AI-Provider', (override?.provider || aiInfo().provider || 'unknown') as string);
        if (override) res.setHeader('X-AI-Key-Source', 'caller');
      } catch {
        // 헤더를 못 붙여도 응답은 나가야 한다
      }
      return send(body);
    };
    next();
  });

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
    const info = aiInfo();
    res.json({
      status: 'ok',
      module: MODULE,
      version: '0.2.0',
      aiMode: aiMode(),
      aiProvider: info.provider ?? 'unknown',
      aiModel: info.model,
      aiBaseHost: info.baseHost,
      aiWarning: info.warning,
    });
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

  app.locals.aiInfo = aiInfo;
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

  // 잘못된 AI 설정은 첫 요청이 올 때까지 숨어 있으면 안 된다. 기동 로그에 바로 남긴다.
  const ai = (app.locals.aiInfo?.() ?? {}) as { provider?: string; model?: string; baseHost?: string; warning?: string };
  console.log(`🤖 AI: ${ai.provider ?? '-'} / ${ai.model ?? '-'} / ${ai.baseHost ?? '-'}`);
  if (ai.warning) console.warn(`⚠️  AI 설정 확인 필요: ${ai.warning}`);
});

export { createApp };
