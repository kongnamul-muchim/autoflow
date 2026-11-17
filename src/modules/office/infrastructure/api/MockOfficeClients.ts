import { IOfficeApiClient, IDocumentFilter } from '../../domain/ports/IOfficeApiClient.js';
import { Document } from '../../domain/valueObjects/Document.js';
import { ILogger } from '../../../../core/domain/ports/ILogger.js';
import { DateRange } from '../../../../core/domain/valueObjects/Types.js';

const MOCK_DOCUMENTS: Document[] = [
  new Document(
    '2025년 6월 넷째주 주간 회의록',
    '참석자: 김팀장, 이대리, 박사원, 최사원\n\n=== 안건 1: 프로젝트 A 진행상황 ===\n- FE 개발 80% 완료 (예정 대비 10% 지연)\n- BE API 95% 완료\n- 내주까지 FE 마무리 목표\n\n=== 안건 2: 시스템 안정화 작업 ===\n- 서버 점검 7/1(화) 02:00-04:00 예정\n- DB 마이그레이션 계획 수립 완료\n\n=== 결정사항 ===\n1. 프로젝트 A 런칭일 7/15(화)로 확정\n2. 추가 인력 1명 채용 공고\n3. 고객사 보고서 매주 금요일 제출',
    'meeting_minutes',
    '김팀장',
    new Date('2026-06-26'),
    ['회의록', '프로젝트A', '주간'],
  ),
  new Document(
    '6월 영업 실적 보고서',
    '=== 6월 영업 실적 ===\n\n[매출 현황]\n- 총 매출: ₩125,000,000 (전월 대비 15% 증가)\n- 영업 이익: ₩32,500,000 (전월 대비 8% 증가)\n- 신규 계약: 12건\n\n[부문별 실적]\n- B2B: ₩78,000,000 (신규 5건)\n- B2C: ₩47,000,000 (신규 7건)\n\n[KPI 달성률]\n- 월 매출 목표: 110% 달성\n- 고객 만족도: 4.2/5.0\n- 계약 전환율: 34%',
    'report',
    '영업팀',
    new Date('2026-06-30'),
    ['영업', '실적', 'KPI'],
  ),
  new Document(
    'AI 기반 업무 자동화 도입 제안서',
    '=== AI 기반 업무 자동화 도입 제안 ===\n\n1. 배경\n   - 반복적 문서 작업으로 인한 생산성 저하\n   - 수기 데이터 입력 오류 발생\n\n2. 제안 솔루션\n   - AI 문서 요약 시스템: 회의록/보고서 자동 요약\n   - 자동 리포트 생성기: 주간/월간 보고서 자동화\n   - 데이터 입력 자동화: 엑셀/CSV 일괄 처리\n\n3. 기대 효과\n   - 업무 시간 40% 절감\n   - 데이터 정확도 99% 이상\n   - 보고서 작성 시간 80% 단축\n\n4. 필요 예산\n   - 초기 구축: ₩50,000,000\n   - 월 운영비: ₩3,000,000',
    'proposal',
    '기획팀',
    new Date('2026-06-15'),
    ['AI', '자동화', '제안서', 'Digital Transformation'],
  ),
  new Document(
    '7월 1일자 내부 메모',
    '=== 공지사항 ===\n\n1. 7월 여름휴가 일정 제출: ~7/5(금)까지\n2. 사옥 이전 관련: 8월 중순 예정, 세부 일정 추후 공지\n3. 하반기 조직 개편안: 7/10(목) 전체 회의에서 발표 예정\n\n=== IT 공지 ===\n- 내일(7/2) 02:00-04:00 DB 점검 있음\n- 점검 시간 동안 일부 시스템 접속 불가',
    'memo',
    '관리부',
    new Date('2026-07-01'),
    ['공지', '내부'],
  ),
];

export class MockErpClient implements IOfficeApiClient {
  readonly source = 'erp';
  constructor(private readonly logger: ILogger) {}

  async fetchDocuments(filter?: IDocumentFilter): Promise<Document[]> {
    this.logger.info('MockErpClient', 'Fetching documents', { filter });
    let docs = [...MOCK_DOCUMENTS];
    if (filter?.type) docs = docs.filter(d => d.type === filter.type);
    if (filter?.limit) docs = docs.slice(0, filter.limit);
    return docs;
  }

  async fetchKpiData(period: DateRange): Promise<Record<string, number>> {
    this.logger.info('MockErpClient', 'Fetching KPI data', { period });
    return {
      totalRevenue: 125000000,
      operatingProfit: 32500000,
      newContracts: 12,
      customerSatisfaction: 42, // 4.2 * 10
      taskCompletionRate: 94,
    };
  }

  async healthCheck(): Promise<boolean> { return true; }
}

export class MockHrClient implements IOfficeApiClient {
  readonly source = 'hr';
  constructor(private readonly logger: ILogger) {}

  async fetchDocuments(filter?: IDocumentFilter): Promise<Document[]> {
    this.logger.info('MockHrClient', 'No documents available');
    return [];
  }

  async fetchKpiData(_period: DateRange): Promise<Record<string, number>> {
    return {
      headcount: 48,
      newHires: 3,
      turnoverRate: 12,
    };
  }

  async healthCheck(): Promise<boolean> { return true; }
}
