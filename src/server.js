const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const GAME_IDS = new Set(['zaizai', 'bigarm', 'lastdawn']);
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon'
};

function createServer({ dataFile = process.env.DATA_FILE || path.join(ROOT, 'data', 'reactions.json') } = {}) {
  const limits = new Map();
  let writeQueue = Promise.resolve();

  async function readData() {
    try {
      const data = JSON.parse(await fs.promises.readFile(dataFile, 'utf8'));
      return { likes: data.likes && typeof data.likes === 'object' ? data.likes : {} };
    } catch (error) {
      if (error.code === 'ENOENT') return { likes: {} };
      throw error;
    }
  }

  function updateData(updater) {
    const operation = writeQueue.then(async () => {
      const data = await readData();
      const result = updater(data);
      await fs.promises.mkdir(path.dirname(dataFile), { recursive: true });
      const temporaryFile = `${dataFile}.${process.pid}.tmp`;
      await fs.promises.writeFile(temporaryFile, JSON.stringify(data, null, 2), 'utf8');
      await fs.promises.rename(temporaryFile, dataFile);
      return result;
    });
    writeQueue = operation.catch(() => {});
    return operation;
  }

  function sendJson(response, status, data) {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(JSON.stringify(data));
  }

  async function readBody(request) {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 8_192) throw Object.assign(new Error('请求内容过长'), { status: 413 });
    }
    try {
      return JSON.parse(body || '{}');
    } catch {
      throw Object.assign(new Error('请求格式无效'), { status: 400 });
    }
  }

  function isRateLimited(request, bucket, maximum, intervalMs) {
    const now = Date.now();
    const address = process.env.TRUST_PROXY === '1'
      ? (request.headers['x-real-ip'] || request.socket.remoteAddress || 'unknown')
      : (request.socket.remoteAddress || 'unknown');
    const key = `${bucket}:${address}`;
    const record = limits.get(key);
    if (!record || now - record.startedAt >= intervalMs) {
      limits.set(key, { startedAt: now, count: 1 });
      return false;
    }
    record.count += 1;
    return record.count > maximum;
  }

  async function handleApi(request, response, url) {
    if (request.method === 'GET' && url.pathname === '/api/likes') {
      const data = await readData();
      const likes = Object.fromEntries([...GAME_IDS].map((id) => [id, data.likes[id]?.count || 0]));
      sendJson(response, 200, { likes });
      return true;
    }

    const likeMatch = url.pathname.match(/^\/api\/games\/([a-z]+)\/like$/);
    if (request.method === 'POST' && likeMatch) {
      const gameId = likeMatch[1];
      if (!GAME_IDS.has(gameId)) {
        sendJson(response, 404, { error: '没有找到这个互动项目。' });
        return true;
      }
      if (isRateLimited(request, `like:${gameId}`, 60, 60 * 60 * 1000)) {
        sendJson(response, 429, { error: '操作有点频繁，请稍后再来。' });
        return true;
      }
      const body = await readBody(request);
      const visitorId = typeof body.visitorId === 'string' && /^[a-f0-9-]{36}$/i.test(body.visitorId)
        ? body.visitorId
        : null;
      if (!visitorId) {
        sendJson(response, 400, { error: '无法识别当前设备，请刷新页面后重试。' });
        return true;
      }
      const result = await updateData((data) => {
        const gameLikes = data.likes[gameId] || { count: 0, visitors: [] };
        const visitors = new Set(gameLikes.visitors || []);
        const liked = !visitors.has(visitorId);
        if (liked) visitors.add(visitorId);
        else visitors.delete(visitorId);
        data.likes[gameId] = { count: visitors.size, visitors: [...visitors] };
        return { liked, count: visitors.size };
      });
      sendJson(response, 200, result);
      return true;
    }
    return false;
  }

  async function serveStatic(request, response, url) {
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      sendJson(response, 400, { error: '请求路径无效。' });
      return;
    }
    if (pathname === '/') pathname = '/index.html';
    const base = pathname.startsWith('/assets/') ? ROOT : PUBLIC;
    const relative = pathname.startsWith('/assets/') ? pathname.slice(1) : pathname.slice(1);
    const file = path.resolve(base, relative);
    if (!file.startsWith(`${base}${path.sep}`)) {
      sendJson(response, 403, { error: '禁止访问。' });
      return;
    }
    try {
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) throw Object.assign(new Error('not a file'), { code: 'ENOENT' });
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      });
      fs.createReadStream(file).pipe(response);
    } catch (error) {
      sendJson(response, error.code === 'ENOENT' ? 404 : 500, { error: '没有找到这个页面。' });
    }
  }

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) {
        if (await handleApi(request, response, url)) return;
        sendJson(response, 404, { error: '接口不存在。' });
        return;
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendJson(response, 405, { error: '不支持的请求方式。' });
        return;
      }
      await serveStatic(request, response, url);
    } catch (error) {
      sendJson(response, error.status || 500, { error: error.status ? error.message : '服务器暂时开了个小差。' });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, '127.0.0.1', () => {
    process.stdout.write(`玄天工作站已启动：http://127.0.0.1:${port}\n`);
  });
}

module.exports = { createServer };
