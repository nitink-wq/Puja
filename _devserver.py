import http.server, socketserver
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
with socketserver.TCPServer(("", 8123), Handler) as httpd:
    httpd.serve_forever()
