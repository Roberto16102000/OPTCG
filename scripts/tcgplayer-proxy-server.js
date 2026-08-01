/**
 * Proxy local para TCGplayer API (evita CORS en el navegador).
 * Sirve web/tcgplayer-prices.html y reenvía a https://api.tcgplayer.com
 *
 * Uso: node scripts/tcgplayer-proxy-server.js
 * Abre: http://localhost:3460/tcgplayer-prices.html
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.TCGPLAYER_PROXY_PORT) || 3460;
const TCG_BASE = 'https://api.tcgplayer.com';
const API_VERSION = 'v1.39.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function proxyToTcgplayer(req, res, targetPath, body) {
  const url = `${TCG_BASE}${targetPath}`;
  const headers = {
    Accept: 'application/json',
  };
  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }
  if (body?.length && (req.method === 'POST' || req.method === 'PUT')) {
    headers['Content-Type'] = req.headers['content-type'] || 'application/json';
  }

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: body?.length ? body : undefined,
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(text);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, errors: [err.message] }));
  }
}

function serveStatic(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (url.pathname === '/api/tcgplayer/token' && req.method === 'POST') {
    const body = await readBody(req);
    const params = new URLSearchParams(body.toString());
    if (!params.get('client_id') && req.headers['content-type']?.includes('json')) {
      try {
        const j = JSON.parse(body.toString());
        if (j.client_id) params.set('client_id', j.client_id);
        if (j.client_secret) params.set('client_secret', j.client_secret);
        params.set('grant_type', 'client_credentials');
      } catch (_) {}
    }
    const tokenBody = params.toString() || body.toString();
    const upstream = await fetch(`${TCG_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: tokenBody.includes('grant_type')
        ? tokenBody
        : `grant_type=client_credentials&${tokenBody}`,
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(text);
    return;
  }

  if (url.pathname.startsWith('/api/tcgplayer/')) {
    const tcgPath = url.pathname.replace('/api/tcgplayer', '') + url.search;
    const body = await readBody(req);
    await proxyToTcgplayer(req, res, tcgPath, body);
    return;
  }

  if (url.pathname === '/api/catalog-cards' && req.method === 'GET') {
    const catalogPath = path.join(ROOT, 'assets', 'data', 'official-catalog.json');
    fs.readFile(catalogPath, 'utf8', (err, raw) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'official-catalog.json not found' }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(raw);
    });
    return;
  }

  let filePath = url.pathname === '/' ? '/web/tcgplayer-prices.html' : url.pathname;
  const resolved = path.normalize(path.join(ROOT, filePath.replace(/^\//, '')));
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  serveStatic(resolved, res);
});

server.listen(PORT, () => {
  console.log(`TCGplayer proxy: http://localhost:${PORT}/web/tcgplayer-prices.html`);
  console.log(`API version: ${API_VERSION}`);
});
