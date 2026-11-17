#!/usr/bin/env node
import { createContainer } from './di/container.js';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function main() {
  const program = new Command();

  program
    .name('autoflow')
    .description('AI 기반 업무 자동화 시스템 — 모듈형 아키텍처')
    .version('0.2.0')
    .option('-m, --module <name>', '실행할 모듈 (commerce | office)', 'commerce');

  // Parse options first
  program.parseOptions(process.argv);
  const options = program.opts();

  const container = await createContainer(options.module);
  const { CliController } = await import('./presentation/cli/CliController.js');
  const cliController = new CliController(
    container.module,
    container.registry,
    container.runAutomationPipeline,
    container.taskRepo,
    container.pipelineRepo,
    container.logger,
  );
  const { logger, module: activeModule } = container;
  const isCommerce = options.module === 'commerce';
  const isOffice = options.module === 'office';

  // ── Commerce Module Commands ──
  if (isCommerce) {
    program
      .command('describe')
      .description('AI로 상품 설명 생성')
      .requiredOption('-n, --name <name>', '상품명')
      .requiredOption('-c, --category <category>', '카테고리')
      .option('-d, --description <description>', '원본 설명', '')
      .option('-k, --keywords <keywords>', '키워드 (쉼표 구분)', '')
      .action(async (cmdOptions: any) => {
        const result = await cliController.handleDescribeProduct({
          name: cmdOptions.name,
          category: cmdOptions.category,
          description: cmdOptions.description,
          keywords: cmdOptions.keywords ? cmdOptions.keywords.split(',').map((s: string) => s.trim()) : [],
        });
        console.log(result.message);
        if (result.data) {
          console.log(cliController.formatProductResult(result.data));
        }
      });

    program
      .command('report:daily')
      .description('일일 마케팅 성과 리포트 생성')
      .option('-p, --platforms <platforms>', '플랫폼 목록 (쉼표 구분)', 'cafe24,meta,naver')
      .action(async (cmdOptions: any) => {
        const platforms = cmdOptions.platforms.split(',').map((s: string) => s.trim());
        const result = await cliController.handleDailyReport({ platforms });
        console.log(result.message);
        if (result.data) {
          console.log(cliController.formatReportResult(result.data));
        }
      });

    program
      .command('sync')
      .description('외부 플랫폼 데이터 동기화')
      .requiredOption('-s, --source <platform>', '소스 플랫폼')
      .requiredOption('-t, --target <platform>', '타겟 플랫폼')
      .action(async (cmdOptions: any) => {
        const result = await cliController.handleSyncData({
          sourcePlatform: cmdOptions.source,
          targetPlatform: cmdOptions.target,
        });
        console.log(result.message);
      });
  }

  // ── Office Module Commands ──
  if (isOffice) {
    program
      .command('document:summarize')
      .description('AI로 문서 요약 생성')
      .requiredOption('-t, --title <title>', '문서 제목')
      .requiredOption('-c, --content <content>', '문서 내용')
      .option('--type <type>', '문서 타입 (meeting_minutes|report|proposal|memo)', 'other')
      .option('-a, --author <author>', '작성자')
      .action(async (cmdOptions: any) => {
        const result = await cliController.handleSummarizeDocument({
          title: cmdOptions.title,
          content: cmdOptions.content,
          type: cmdOptions.type,
          author: cmdOptions.author,
        });
        console.log(result.message);
        if (result.data) {
          console.log(cliController.formatSummaryResult(result.data));
        }
      });

    program
      .command('report:generate')
      .description('주간/월간 업무 리포트 생성')
      .option('-p, --period <type>', '리포트 기간 (daily|weekly|monthly|quarterly)', 'weekly')
      .option('-d, --department <dept>', '부서명')
      .action(async (cmdOptions: any) => {
        const result = await cliController.handleWeeklyReport({
          periodType: cmdOptions.period,
          department: cmdOptions.department,
        });
        console.log(result.message);
        if (result.data) {
          console.log(cliController.formatOfficeReportResult(result.data));
        }
      });

    program
      .command('entry:batch')
      .description('데이터 일괄 입력')
      .requiredOption('-s, --source <source>', '데이터 출처')
      .option('-f, --file <file>', '데이터 파일 경로 (JSON)')
      .action(async (cmdOptions: any) => {
        let records: Array<Record<string, string>> = [];
        if (cmdOptions.file) {
          const fs = await import('node:fs');
          const raw = fs.readFileSync(cmdOptions.file, 'utf-8');
          records = JSON.parse(raw);
        } else {
          records = [
            { name: '홍길동', email: 'hong@test.com', department: '개발팀' },
            { name: '김철수', email: 'kim@test.com', department: '영업팀' },
          ];
        }
        const result = await cliController.handleBatchEntry({
          source: cmdOptions.source,
          records,
        });
        console.log(result.message);
      });
  }

  // ── Shared Commands ──

  program
    .command('pipeline:run')
    .description('자동화 파이프라인 실행')
    .requiredOption('-n, --name <name>', '파이프라인 이름')
    .option('-s, --steps <count>', '실행할 태스크 수', '1')
    .action(async (cmdOptions: any) => {
      const result = await cliController.handleRunPipeline({
        name: cmdOptions.name,
        steps: parseInt(cmdOptions.steps, 10),
      });
      console.log(result.message);
    });

  program
    .command('list')
    .description('저장된 태스크/파이프라인 목록 조회')
    .option('-t, --type <type>', '조회 타입 (tasks | pipelines)', 'tasks')
    .action(async (cmdOptions: any) => {
      const output = await cliController.handleList(cmdOptions.type);
      console.log(output);
    });

  program
    .command('info')
    .description('현재 모듈 정보 조회')
    .action(async () => {
      const info = await cliController.getModuleInfo();
      console.log(info);
    });

  // Parse and run
  await program.parseAsync(process.argv);
}

// ── 시작 ──
const dataDir = path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

main().catch((error) => {
  console.error('AutoFlow 실행 중 오류 발생:', error);
  process.exit(1);
});
