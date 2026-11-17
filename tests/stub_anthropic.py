#!/usr/bin/env python3
"""Anthropic /v1/messages 스텁. 키 주입 경로가 실제로 도는지 확인하는 용도."""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json


class H(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('content-length', 0))
        body = json.loads(self.rfile.read(length) or b'{}')
        got_key = self.headers.get('x-api-key', '')
        model = body.get('model', '')
        prompt = json.dumps(body.get('messages', []), ensure_ascii=False)[:80]
        text = json.dumps({
            "title": f"STUB 응답 (model={model})",
            "description": f"키 주입 경로 확인용 스텁 응답. x-api-key 수신={bool(got_key)}, prompt={prompt}",
            "keywords": ["stub", "live-path"],
            "sellingPoints": ["실제 HTTP 호출 발생"],
            "seoDescription": "stub",
        }, ensure_ascii=False)
        payload = json.dumps({"content": [{"type": "text", "text": text}]}).encode()
        self.send_response(200)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *a):
        pass


HTTPServer(('127.0.0.1', 4999), H).serve_forever()
