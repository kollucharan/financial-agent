import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatAgent } from './agent/ChatAgent.js';
import { AdvisorAgent } from './agent/AdvisorAgent.js';
import { AnalyticsEngine } from './services/AnalyticsEngine.js';
import 'dotenv/config';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const sessions = new Map<string, ChatAgent>();
const advisorAgent = new AdvisorAgent();

function getSession(sessionId: string): ChatAgent {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new ChatAgent());
  }
  return sessions.get(sessionId)!;
}

app.get('/api/portfolios', (_req, res) => {
  try {
    const engine = new AnalyticsEngine();
    const data = engine.getPortfoliosData();

    const portfolios = Object.entries(data.portfolios).map(([id, p]) => ({
      id,
      name: p.user_name,
      type: p.portfolio_type,
      value: p.current_value,
      gainLossPercent: p.overall_gain_loss_percent,
      riskProfile: p.risk_profile || 'MODERATE',
      description: p.description || 'Portfolio snapshot'
    }));

    res.json(portfolios);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.get('/api/status', (_req, res) => {
  const status = advisorAgent.getRuntimeStatus();
  res.json({
    api_configured: status.llm_configured,
    tracing_enabled: status.tracing_enabled,
    model: status.model
  });
});

app.post('/api/chat', async (req, res) => {
  const { message, portfolioId, sessionId = 'default' } = req.body as {
    message?: string;
    portfolioId?: string;
    sessionId?: string;
  };

  if (!message || !portfolioId) {
    return res.status(400).json({ error: 'message and portfolioId are required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const agent = getSession(sessionId);

  try {
    await agent.chat(message, portfolioId, token => {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  } finally {
    res.end();
  }
});

app.post('/api/chat/clear', (req, res) => {
  const { sessionId = 'default' } = req.body as { sessionId?: string };
  getSession(sessionId).clearHistory();
  res.json({ ok: true });
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Artha Advisor running at http://localhost:${PORT}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing server or run with a different port.`);
    return;
  }
  console.error('Server startup error:', error.message);
});
