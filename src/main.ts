#!/usr/bin/env node
import 'reflect-metadata';
import { createContainer } from './di/container.js';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function main() {
  const { cliController, logger } = createContainer();

  const program = new Command();

  program
    .name('autoflow')
    .description('AI 기반 이커머스 업무 자동화 시스템')
    .version('0.1.0');

  program
    .command('describe')
    .description('AI로 상품 설명 생성')
    .requiredOption('-n, --name <name>', '상품명')
    .requiredOption('-c, --category <category>', '카테고리')
    .option('-d, --description <description>', '원본 설명', '')
    .option('-k, --keywords <keywords>', '키워드 (쉼표 구분)', '')
    .action(async (options) => {
      const result = await cliController.handleDescribeProduct({
        name: options.name,
        category: options.category,
        description: options.description,
        keywords: options.keywords ? options.keywords.split(',').map((s: string) => s.trim()) : [],
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
    .action(async (options) => {
      const platforms = options.platforms.split(',').map((s: string) => s.trim());
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
    .action(async (options) => {
      const result = await cliController.handleSyncData({
        sourcePlatform: options.source,
        targetPlatform: options.target,
      });
      console.log(result.message);
    });

  program
    .command('pipeline:run')
    .description('자동화 파이프라인 실행')
    .requiredOption('-n, --name <name>', '파이프라인 이름')
    .option('-s, --steps <count>', '실행할 태스크 수', '1')
    .action(async (options) => {
      const result = await cliController.handleRunPipeline({
        name: options.name,
        steps: parseInt(options.steps, 10),
      });
      console.log(result.message);
    });

  program
    .command('list')
    .description('저장된 태스크/파이프라인 목록 조회')
    .option('-t, --type <type>', '조회 타입 (tasks | pipelines)', 'tasks')
    .action(async (options) => {
      const { taskRepo, pipelineRepo } = createContainer();

      if (options.type === 'tasks') {
        const tasks = await taskRepo.findAll();
        if (tasks.length === 0) {
          console.log('저장된 태스크가 없습니다.');
          return;
        }
        console.log(`📋 태스크 목록 (${tasks.length}개)`);
        for (const task of tasks) {
          console.log(`  [${task.status}] ${task.name} (${task.type}) - ${task.createdAt.toISOString()}`);
        }
      } else if (options.type === 'pipelines') {
        const pipelines = await pipelineRepo.findAll();
        if (pipelines.length === 0) {
          console.log('저장된 파이프라인이 없습니다.');
          return;
        }
        console.log(`📋 파이프라인 목록 (${pipelines.length}개)`);
        for (const pipeline of pipelines) {
          console.log(`  [${pipeline.status}] ${pipeline.name}`);
        }
      }
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
