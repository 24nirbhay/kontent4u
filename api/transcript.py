import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

import requests

from api._shared import APIError, get_env, handle_options, verify_user, write_json


SUPADATA_BASE_URL = 'https://api.supadata.ai/v1'


def _supadata_headers():
    api_key = get_env('SUPADATA_API_KEY')
    if not api_key:
        raise APIError(500, 'Missing Supadata API key. Set SUPADATA_API_KEY.')

    return {
        'x-api-key': api_key,
        'Content-Type': 'application/json',
    }


def _parse_supadata_response(response):
    try:
                return response.json()
    except Exception:
                return {'detail': response.text}


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_POST(self):
        try:
            verify_user(self.headers.get('Authorization', ''))
            content_length = int(self.headers.get('Content-Length', '0') or 0)
            raw_body = self.rfile.read(content_length) if content_length else b'{}'
            payload = json.loads(raw_body.decode('utf-8') or '{}')

            url = (payload.get('url') or '').strip()
            if not url:
                raise APIError(400, 'Missing transcript url.')

            request_payload = {
                'url': url,
                'text': bool(payload.get('text', True)),
                'mode': payload.get('mode', 'auto'),
            }

            lang = (payload.get('lang') or '').strip()
            if lang and lang != 'auto':
                request_payload['lang'] = lang

            response = requests.get(
                f'{SUPADATA_BASE_URL}/transcript',
                headers=_supadata_headers(),
                params=request_payload,
                timeout=30,
            )

            data = _parse_supadata_response(response)

            if response.status_code >= 400:
                message = data.get('error', {}).get('message') if isinstance(data, dict) else None
                raise APIError(response.status_code, message or data.get('detail') or 'Transcript request failed.')

            write_json(self, response.status_code, data)
        except APIError as error:
            write_json(self, error.status_code, {'detail': error.detail})
        except json.JSONDecodeError:
            write_json(self, 400, {'detail': 'Invalid JSON payload'})
        except Exception as error:
            write_json(self, 500, {'detail': str(error)})

    def do_GET(self):
        try:
            verify_user(self.headers.get('Authorization', ''))

            parsed_url = urlparse(self.path)
            job_id = parse_qs(parsed_url.query).get('jobId', [''])[0]
            if not job_id or job_id == 'transcript':
                raise APIError(400, 'Missing transcript job id.')

            response = requests.get(
                f'{SUPADATA_BASE_URL}/transcript/{job_id}',
                headers=_supadata_headers(),
                timeout=30,
            )

            data = _parse_supadata_response(response)

            if response.status_code >= 400:
                message = data.get('error', {}).get('message') if isinstance(data, dict) else None
                raise APIError(response.status_code, message or data.get('detail') or 'Transcript job lookup failed.')

            write_json(self, response.status_code, data)
        except APIError as error:
            write_json(self, error.status_code, {'detail': error.detail})
        except Exception as error:
            write_json(self, 500, {'detail': str(error)})