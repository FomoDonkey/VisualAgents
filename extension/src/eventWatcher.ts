import * as fs from 'fs';

export interface RawEvent {
  ts: number;
  phase: string;
  tool: string;
  input: string;
  result: string;
  agent_id: string;
  agent_name: string;
  raw_type: string;
}

/**
 * Watches an events.jsonl file (written by Claude Code hooks)
 * and sends new events to the webview via a callback.
 */
export class EventWatcher {
  private filePath: string;
  private onEvents: (events: RawEvent[]) => void;
  private lastSize = 0;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private fsWatcher: fs.FSWatcher | null = null;

  constructor(filePath: string, onEvents: (events: RawEvent[]) => void) {
    this.filePath = filePath;
    this.onEvents = onEvents;
  }

  start(): void {
    // Initialize position to end of file (don't replay old events)
    try {
      const stat = fs.statSync(this.filePath);
      this.lastSize = stat.size;
    } catch {
      this.lastSize = 0;
    }

    // Try fs.watch first (immediate), fall back to polling
    try {
      this.fsWatcher = fs.watch(this.filePath, () => this.readNewLines());
    } catch {
      // File doesn't exist yet — poll until it does
    }

    // Poll as backup (every 2s) — handles cases where fs.watch misses events
    this.pollInterval = setInterval(() => this.readNewLines(), 2000);
  }

  stop(): void {
    if (this.fsWatcher) {
      this.fsWatcher.close();
      this.fsWatcher = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  forcePoll(): void {
    // Reset to beginning to replay all events
    this.lastSize = 0;
    this.readNewLines();
  }

  private readNewLines(): void {
    try {
      const stat = fs.statSync(this.filePath);
      if (stat.size <= this.lastSize) {
        // File was truncated or no new data
        if (stat.size < this.lastSize) this.lastSize = 0;
        else return;
      }

      // Read only new bytes
      const fd = fs.openSync(this.filePath, 'r');
      const bufSize = stat.size - this.lastSize;
      const buf = Buffer.alloc(bufSize);
      fs.readSync(fd, buf, 0, bufSize, this.lastSize);
      fs.closeSync(fd);

      this.lastSize = stat.size;

      const newContent = buf.toString('utf8');
      const lines = newContent.trim().split('\n').filter(Boolean);
      const events: RawEvent[] = [];

      for (const line of lines) {
        try {
          events.push(JSON.parse(line));
        } catch {
          // Skip malformed lines
        }
      }

      if (events.length > 0) {
        this.onEvents(events);

        // If we didn't have a watcher, try again now that the file exists
        if (!this.fsWatcher) {
          try {
            this.fsWatcher = fs.watch(this.filePath, () => this.readNewLines());
          } catch {}
        }
      }
    } catch {
      // File not found yet — that's fine, we'll keep polling
    }
  }
}
