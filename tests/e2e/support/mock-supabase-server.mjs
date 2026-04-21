import http from 'node:http';

const port = Number.parseInt(process.env.MOCK_SUPABASE_PORT ?? '54321', 10);
const host = process.env.MOCK_SUPABASE_HOST ?? '127.0.0.1';
const sessionsByAccessToken = new Map();
const sessionsByRefreshToken = new Map();

function json(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      resolve(raw);
    });
    request.on('error', reject);
  });
}

function buildSession(seed) {
  const user = {
    id: `supabase-${seed.email}`,
    aud: 'authenticated',
    role: 'authenticated',
    email: seed.email,
    email_confirmed_at: new Date().toISOString(),
    user_metadata: {
      full_name: seed.fullName,
      name: seed.fullName
    },
    app_metadata: {}
  };

  return {
    access_token: seed.accessToken,
    refresh_token: seed.refreshToken,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user
  };
}

function readBearerToken(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization !== 'string') {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    return json(response, 200, { ok: true });
  }

  if (request.method === 'POST' && url.pathname === '/register') {
    const rawBody = await readBody(request);
    const payload = rawBody ? JSON.parse(rawBody) : {};

    if (!payload.accessToken || !payload.refreshToken || !payload.email) {
      return json(response, 400, { error: 'Missing registration payload' });
    }

    const session = buildSession({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      email: payload.email,
      fullName: payload.fullName ?? payload.email
    });

    sessionsByAccessToken.set(session.access_token, session);
    sessionsByRefreshToken.set(session.refresh_token, session);

    return json(response, 200, { ok: true });
  }

  if (url.pathname === '/auth/v1/user' && (request.method === 'GET' || request.method === 'POST')) {
    const token = readBearerToken(request);
    if (!token || !sessionsByAccessToken.has(token)) {
      return json(response, 401, { error: 'Invalid token' });
    }

    return json(response, 200, sessionsByAccessToken.get(token).user);
  }

  if (url.pathname === '/auth/v1/token' && request.method === 'POST') {
    const rawBody = await readBody(request);
    const params = new URLSearchParams(rawBody);
    const refreshToken = params.get('refresh_token');
    const session = refreshToken ? sessionsByRefreshToken.get(refreshToken) : null;

    if (!session) {
      return json(response, 401, { error: 'Invalid refresh token' });
    }

    return json(response, 200, session);
  }

  return json(response, 404, { error: 'Not found', path: url.pathname });
});

server.listen(port, host, () => {
  process.stdout.write(`[mock-supabase] listening on http://${host}:${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
}
