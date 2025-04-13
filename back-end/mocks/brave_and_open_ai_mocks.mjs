import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;

// === Util: Simulated delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// === Brave News Mock with Real Data ===
function generateMockBraveNews(query) {
  const newsData = [
    {
      type: "news_result",
      url: "https://en.wikipedia.org/wiki/Tornado_outbreak_and_floods_of_April_2%E2%80%937,_2025",
      title: "Tornado Outbreak and Floods Devastate Southern and Midwestern U.S.",
      description: "A slow-moving weather system caused widespread tornadoes and historic flash flooding across the Southern and Midwestern United States from April 2–7, 2025.",
      age: "6 days ago",
      page_age: "518400",
      page_fetched: new Date().toISOString(),
      breaking: true,
      extra_snippets: [
        "The event resulted in 25 fatalities and over 47 injuries.",
        "More than 318,000 power outages were reported during the disaster."
      ],
      thumbnail: {
        src: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Tornado_damage_example.jpg/120px-Tornado_damage_example.jpg",
        original: "https://upload.wikimedia.org/wikipedia/commons/4/4f/Tornado_damage_example.jpg"
      },
      meta_url: {
        scheme: "https",
        netloc: "en.wikipedia.org",
        hostname: "en.wikipedia.org",
        favicon: "https://en.wikipedia.org/favicon.ico",
        path: "/wiki/Tornado_outbreak_and_floods_of_April_2%E2%80%937,_2025"
      }
    },
    {
      type: "news_result",
      url: "https://en.wikipedia.org/wiki/2025_in_South_Korea",
      title: "South Korea Seizes Record 2-Ton Cocaine Shipment",
      description: "Authorities announced the seizure of two tons of cocaine valued at 1 trillion won from a Norwegian-flagged vessel, marking the largest drug bust in South Korea's history.",
      age: "10 days ago",
      page_age: "864000",
      page_fetched: new Date().toISOString(),
      breaking: false,
      extra_snippets: [
        "The vessel arrived at Gangneung from Mexico via Ecuador, Panama, and China.",
        "The Korea Customs Service led the operation resulting in the seizure."
      ],
      thumbnail: {
        src: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Cocaine_bricks.jpg/120px-Cocaine_bricks.jpg",
        original: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Cocaine_bricks.jpg"
      },
      meta_url: {
        scheme: "https",
        netloc: "en.wikipedia.org",
        hostname: "en.wikipedia.org",
        favicon: "https://en.wikipedia.org/favicon.ico",
        path: "/wiki/2025_in_South_Korea"
      }
    }
  ];

  return {
    type: "news",
    query: {
      original: query,
      altered: query,
      cleaned: query,
      spellcheck_off: false,
      show_strict_warning: false
    },
    results: newsData
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