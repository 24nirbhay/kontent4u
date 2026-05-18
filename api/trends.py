from http.server import BaseHTTPRequestHandler

from api._shared import APIError, get_trends, handle_options, write_json


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        handle_options(self)

    def do_GET(self):
        try:
            write_json(self, 200, get_trends())
        except APIError as error:
            write_json(self, error.status_code, {'detail': error.detail})
        except Exception as error:
            write_json(self, 500, {'detail': str(error)})