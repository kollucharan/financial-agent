import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { AdvisorAgent } from './agent/AdvisorAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors()); // Enable CORS for frontend requests
app.use(express.json());

const agents = new Map<string, { agent: AdvisorAgent; history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>; currentPortfolioId: string | null }>();

function getPortfolioFromMessage(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes('diversified') || lower.includes('rahul') || lower.includes('portfolio 1')) {
    return 'PORTFOLIO_001';
  }
  if (lower.includes('banking') || lower.includes('priya') || lower.includes('portfolio 2')) {
    return 'PORTFOLIO_002';
  }
  if (lower.includes('conservative') || lower.includes('arun') || lower.includes('portfolio 3')) {
    return 'PORTFOLIO_003';
  }
  return null;
}

app.post('/chat', async (req, res) => {
  const { message, sessionId, history = [] } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'Message and sessionId required' });
  }

  let session = agents.get(sessionId);
  if (!session) {
    session = {
      agent: new AdvisorAgent(),
      history: [],
      currentPortfolioId: null
    };
    agents.set(sessionId, session);
  }

  // Update history
  session.history = history;

  // Check portfolio switch
  const newPortfolioId = getPortfolioFromMessage(message);
  if (newPortfolioId && newPortfolioId !== session.currentPortfolioId) {
    session.currentPortfolioId = newPortfolioId;
    session.history.push({ role: 'system', content: `Switched to portfolio ${newPortfolioId}` });
  }

  try {
    let response: string;
    if (session.currentPortfolioId) {
      response = await session.agent.chatWithUser(session.currentPortfolioId, message, session.history);
    } else {
      response = await session.agent.chatWithUser('PORTFOLIO_001', message, session.history);
    }

    // Update history
    session.history.push({ role: 'user', content: message });
    session.history.push({ role: 'assistant', content: response });

    // Keep history manageable
    if (session.history.length > 20) {
      session.history.splice(0, 2);
    }

    res.json({
      response,
      portfolioId: session.currentPortfolioId,
      history: session.history
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend API Server running at http://localhost:${PORT}`);
});