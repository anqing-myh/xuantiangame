const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../src/server');

async function withServer(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'xuantiangame-'));
  const server = createServer({ dataFile: path.join(directory, 'reactions.json') });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(baseUrl);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('likes can be toggled by a visitor and are counted per game', async () => {
  await withServer(async (baseUrl) => {
    const visitorId = '123e4567-e89b-12d3-a456-426614174000';
    const sendLike = () => fetch(`${baseUrl}/api/games/bigarm/like`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitorId })
    });
    const first = await (await sendLike()).json();
    assert.deepEqual(first, { liked: true, count: 1 });
    const second = await (await sendLike()).json();
    assert.deepEqual(second, { liked: false, count: 0 });
    const summary = await (await fetch(`${baseUrl}/api/likes`)).json();
    assert.equal(summary.likes.bigarm, 0);
    assert.equal(summary.likes.zaizai, 0);
  });
});

test('simultaneous likes from different visitors are both persisted', async () => {
  await withServer(async (baseUrl) => {
    const sendLike = (visitorId) => fetch(`${baseUrl}/api/games/lastdawn/like`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitorId })
    });
    const responses = await Promise.all([
      sendLike('123e4567-e89b-12d3-a456-426614174000'),
      sendLike('123e4567-e89b-12d3-a456-426614174001')
    ]);
    assert.deepEqual(responses.map((response) => response.status), [200, 200]);
    const summary = await (await fetch(`${baseUrl}/api/likes`)).json();
    assert.equal(summary.likes.lastdawn, 2);
  });
});

test('public comment submission is disabled', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: 'zaizai', name: '旅人', content: '你好' })
    });
    assert.equal(response.status, 404);
    const html = await (await fetch(baseUrl)).text();
    assert.doesNotMatch(html, /comment-form|community-section|玩家回音/);
  });
});

test('homepage, background image, and game artwork are served', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(baseUrl)).status, 200);
    for (const asset of ['favicon.svg', 'xuantian.png', 'zaizai.png', 'bigarm.png', 'lastdawn.png']) {
      const assetPath = asset === 'favicon.svg' ? '/favicon.svg' : `/assets/${asset}`;
      const response = await fetch(`${baseUrl}${assetPath}`);
      assert.equal(response.status, 200, asset);
      if (asset.endsWith('.png')) assert.match(response.headers.get('content-type'), /image\/png/);
      if (asset.endsWith('.svg')) assert.match(response.headers.get('content-type'), /image\/svg\+xml/);
    }
  });
});
