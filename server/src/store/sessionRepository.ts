import type { StorySession } from "../models/types.js";

export interface SessionRepository {
  create(session: StorySession): Promise<StorySession>;
  get(id: string): Promise<StorySession | null>;
  update(id: string, session: StorySession): Promise<StorySession>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, StorySession>();

  async create(session: StorySession): Promise<StorySession> {
    const copy = structuredClone(session);
    this.sessions.set(copy.id, copy);
    return structuredClone(copy);
  }

  async get(id: string): Promise<StorySession | null> {
    const session = this.sessions.get(id);
    return session ? structuredClone(session) : null;
  }

  async update(id: string, session: StorySession): Promise<StorySession> {
    if (!this.sessions.has(id)) {
      throw new Error(`Session not found: ${id}`);
    }
    const copy = structuredClone(session);
    copy.id = id;
    this.sessions.set(id, copy);
    return structuredClone(copy);
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async clear(): Promise<void> {
    this.sessions.clear();
  }
}
