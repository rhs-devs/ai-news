// mockServer.mjs
import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;

// === Util: Simulated delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// === Brave News Mock ===
function generateMockBraveNews(query) {
  return {
    type: "news",
    query: {
      original: query,
      altered: query,
      cleaned: query,
      spellcheck_off: false,
      show_strict_warning: false
    },
    results: [
      {
        type: "news_result",
        url: `https://example.com/article-about-${query}`,
        title: `${query} makes headlines worldwide!`,
        description: `A recent surge of interest in ${query} affects global markets.`,
        age: "2 hours ago",
        page_age: "7200",
        page_fetched: new Date().toISOString(),
        breaking: true,
        extra_snippets: [
          `Here's why ${query} matters...`,
          `${query} could change everything...`
        ],
        thumbnail: {
          src: "https://example.com/thumb.jpg",
          original: "https://cdn.example.com/original-thumb.jpg"
        },
        meta_url: {
          scheme: "https",
          netloc: "example.com",
          hostname: "example.com",
          favicon: "https://example.com/favicon.ico",
          path: `/article-about-${query}`
        }
      },
      {
        type: "news_result",
        url: `https://anothernews.com/story/${query}`,
        title: `Top analysts discuss ${query}`,
        description: `Experts weigh in on what ${query} means for the future.`,
        age: "1 day ago",
        page_age: "86400",
        page_fetched: new Date(Date.now() - 86000000).toISOString(),
        breaking: false,
        extra_snippets: [
          `Analysts predict trends around ${query}`
        ],
        thumbnail: {
          src: "https://anothernews.com/thumb.png",
          original: "https://cdn.anothernews.com/original-thumb.png"
        },
        meta_url: {
          scheme: "https",
          netloc: "anothernews.com",
          hostname: "anothernews.com",
          favicon: "https://anothernews.com/favicon.ico",
          path: `/story/${query}`
        }
      }
    ]
  };
}

// === OpenAI Mock ===
function generateMockCompletion(messages) {
  const userMessage = messages.find(m => m.role === 'user')?.content || "No input";
  const output = `🤖 Mocked GPT response to: "${userMessage}"`;

  return {
    id: `chatcmpl-mock-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "gpt-4-mock",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: output
        },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 8,
      total_tokens: 18
    }
  };
}

// === Server ===
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // === MOCK: Brave News Search ===
  if (pathname === '/search' && req.method === 'GET') {
    const query = parsedUrl.searchParams.get('q');
    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing query parameter ?q=' }));
    }

    await delay(300); // simulate latency
    const mockData = generateMockBraveNews(query);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(mockData, null, 2));

  // === MOCK: OpenAI Chat Completions ===
  } else if (pathname === '/v1/chat/completions' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        if (!parsed.messages || !Array.isArray(parsed.messages)) {
          throw new Error("Missing 'messages' array in request body");
        }

        await delay(150); // simulate generation delay
        const response = generateMockCompletion(parsed.messages);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response, null, 2));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });

  // === Not Found ===
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

// === Start Server ===
server.listen(PORT, () => {
  console.log(`✅ Mock API Server running ⬇️
🔎 GET   /search?q=ai
🤖 POST  /v1/chat/completions
🌐 http://localhost:${PORT}
`);
});