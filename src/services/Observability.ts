import { Langfuse } from 'langfuse';

type TraceRecord = {
  traceId: string;
  name: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  level?: 'DEFAULT' | 'WARNING' | 'ERROR';
};

export class Observability {
  private langfuse: Langfuse | null = null;
  private enabled = false;

  constructor() {
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const baseUrl = process.env.LANGFUSE_BASE_URL;

    if (secretKey && publicKey) {
      const options = {
        secretKey,
        publicKey
      } as { secretKey: string; publicKey: string; baseUrl?: string };

      if (baseUrl) {
        options.baseUrl = baseUrl;
      }

      this.langfuse = new Langfuse(options);
      this.enabled = true;
    }
  }

  public getStatus(): { enabled: boolean } {
    return { enabled: this.enabled };
  }

  public async trace(record: TraceRecord): Promise<void> {
    if (!this.langfuse) {
      return;
    }

    const trace = this.langfuse.trace({
      id: record.traceId,
      name: record.name,
      input: record.input,
      output: record.output,
      metadata: record.metadata
    });

    trace.event({
      name: `${record.name}.event`,
      input: record.input,
      output: record.output,
      level: record.level ?? 'DEFAULT'
    });

    await this.langfuse.flushAsync();
  }
}
