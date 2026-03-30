import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

const EVENTS_FILE = path.resolve(__dirname, '..', 'events.jsonl');

/**
 * Vite plugin that adds /api/events endpoint.
 * Frontend polls this to get new Claude Code events.
 */
export function visualAgentsApi(): Plugin {
  return {
    name: 'visualagents-api',
    configureServer(server) {
      // GET /api/events?since=<timestamp> — returns new events
      server.middlewares.use('/api/events', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const since = parseInt(url.searchParams.get('since') || '0', 10);

        try {
          if (!fs.existsSync(EVENTS_FILE)) {
            res.end(JSON.stringify({ events: [], lastTs: since }));
            return;
          }

          const content = fs.readFileSync(EVENTS_FILE, 'utf8');
          const lines = content.trim().split('\n').filter(Boolean);
          const events = [];
          let lastTs = since;

          for (const line of lines) {
            try {
              const ev = JSON.parse(line);
              if (ev.ts > since) {
                events.push(ev);
                if (ev.ts > lastTs) lastTs = ev.ts;
              }
            } catch {}
          }

          res.end(JSON.stringify({ events, lastTs }));
        } catch {
          res.end(JSON.stringify({ events: [], lastTs: since }));
        }
      });

      // POST /api/event — direct event injection (for testing)
      server.middlewares.use('/api/event', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        res.setHeader('Access-Control-Allow-Origin', '*');
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const event = JSON.parse(body);
            event.ts = event.ts || Date.now();
            fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');
            res.end(JSON.stringify({ ok: true }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'bad json' }));
          }
        });
      });

      // DELETE /api/events — clear events file
      server.middlewares.use('/api/clear', (_req, res) => {
        try { fs.writeFileSync(EVENTS_FILE, ''); } catch {}
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ ok: true }));
      });
    },
  };
}
