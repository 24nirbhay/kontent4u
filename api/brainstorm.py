import json
from http.server import BaseHTTPRequestHandler

from api._shared import APIError, build_brainstorm_response, handle_options, write_json


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', '0') or 0)
            raw_body = self.rfile.read(content_length) if content_length else b'{}'
            payload = json.loads(raw_body.decode('utf-8') or '{}')
            authorization = self.headers.get('Authorization', '')

            write_json(self, 200, build_brainstorm_response(payload, authorization))
        except APIError as error:
            write_json(self, error.status_code, {'detail': error.detail})
        except json.JSONDecodeError:
            write_json(self, 400, {'detail': 'Invalid JSON payload'})
        except Exception as error:
            write_json(self, 500, {'detail': str(error)})