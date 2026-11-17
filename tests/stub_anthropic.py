#!/usr/bin/env python3
"""LLM 스텁. 실제 키 없이 '실호출 경로'와 '지저분한 응답 파싱'을 검증하는 용도.

- POST /v1/messages        → Anthropic 형식
- POST /v1/chat/completions → OpenAI 호환 형식 (DeepSeek·Gemini·vLLM 등)
OpenAI 쪽 응답은 일부러 ```json 펜스로 감싸 보낸다. 실제 모델이 흔히 그렇게 준다.
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

PRODUCT = {
    "title": "초경량 무선 청소기 1.2kg",
    "description": "1.2kg 무게와 20000Pa 흡입력으로 좁은 틈까지 가볍게 청소합니다.",
    "keywords": ["무선청소기", "경량", "흡입력", "가전", "원룸청소"],
    "sellingPoints": ["1.2kg 초경량", "20000Pa 흡입력", "원터치 먼지통"],
    "seoDescription": "1.2kg 초경량 무선 청소기. 20000Pa 흡입력으로 구석까지 깔끔하게.",
}

DOC = {
    "summary": "일정 준수율 94%, 예산 집행률 87% 를 기록한 주간 회의록입니다.",
    "keyPoints": ["일정 준수율 94%", "예산 13% 절감"],
    "actionItems": ["다음 분기 계획 수립"],
}


class H(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("content-length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        prompt = json.dumps(body, ensure_ascii=False)

        if self.path.endswith("/chat/completions"):
            payload_obj = DOC if any(k in prompt for k in ("문서", "요약", "summar", "keyPoints")) else PRODUCT
            # 실제 모델처럼 코드 펜스로 감싸서 보낸다 (파서 스트레스 테스트)
            text = "```json\n" + json.dumps(payload_obj, ensure_ascii=False, indent=2) + "\n```"
            payload = json.dumps({
                "choices": [{"message": {"role": "assistant", "content": text}}],
                "model": body.get("model", ""),
            }, ensure_ascii=False).encode()
        else:
            payload_obj = DOC if any(k in prompt for k in ("문서", "요약", "summar", "keyPoints")) else PRODUCT
            payload = json.dumps({
                "content": [{"type": "text", "text": json.dumps(payload_obj, ensure_ascii=False)}],
            }, ensure_ascii=False).encode()

        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


HTTPServer(("127.0.0.1", 4999), H).serve_forever()
