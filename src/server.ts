 import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatAgent } from './agent/ChatAgent.js';
import { AnalyticsEngine } from './services/AnalyticsEngine.js';
import 'dotenv/config';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// One ChatAgent per "session" — keyed by a simple session ID
const sessions = new Map<string, ChatAgent>();

function getSession(sessionId: string): ChatAgent {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new ChatAgent());
  }
  return sessions.get(sessionId)!;
}

// List portfolios
app.get('/api/portfolios', (req, res) => {
  const engine = new AnalyticsEngine();
  const data = engine.getPortfoliosData();
  const portfolios = Object.entries(data.portfolios).map(([id, p]) => ({
    id,
    name: p.user_name,
    type: p.portfolio_type,
    value: p.current_value,
    gainLossPercent: p.overall_gain_loss_percent,
  }));
  res.json(portfolios);
});

// Streaming chat endpoint using SSE
app.post('/api/chat', async (req, res) => {
  const { message, portfolioId, sessionId = 'default' } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const agent = getSession(sessionId);

  try {
    await agent.chat(message, portfolioId, (token :string) => {
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

// Clear conversation history
app.post('/api/chat/clear', (req, res) => {
  const { sessionId = 'default' } = req.body;
  getSession(sessionId).clearHistory();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Artha Advisor running at http://localhost:${PORT}\n`);
});