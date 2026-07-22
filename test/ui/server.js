/* Minimal static server for the production webpack output used by Playwright. */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const port = Number(process.env.BMJ_UI_TEST_PORT || '4173');

const docsRoot = path.resolve(__dirname, '../../docs');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function fileForRequest(url) {
  const pathname = decodeURIComponent(new URL(url, 'http://127.0.0.1').pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(docsRoot, relativePath);
  return filePath.startsWith(`${docsRoot}${path.sep}`) ? filePath : null;
}

http.createServer((request, response) => {
  const filePath = fileForRequest(request.url || '/');
  if (!filePath) {
    response.writeHead(403).end();
    return;
  }
  fs.readFile(filePath, (error, body) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(body);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Block-MiniJava test server listening on http://127.0.0.1:${port}`);
});
