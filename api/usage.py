from http.server import BaseHTTPRequestHandler

from api._shared import APIError, get_daily_usage, handle_options, verify_user, write_json


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        try:
            user = verify_user(self.headers.get('Authorization', ''))
            write_json(self, 200, get_daily_usage(user.email))
        except APIError as error:
            write_json(self, error.status_code, {'detail': error.detail})
        except Exception as error:
            write_json(self, 500, {'detail': str(error)})