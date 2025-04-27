import http from "http";
import { URL } from "url";
import { readFile } from 'fs/promises';


const PORT = process.env.PORT || 3001;

// === Google-like Search Results Mock ===
async function generateMockGoogleSearch(query) {
  const now = Date.now();
  return JSON.parse(await readFile('./mock-google-search-result.json', 'utf8'));;
}

// === Server ===
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // === MOCK: Google Search ===
  if (pathname === "/search" && req.method === "GET") {
    const query = parsedUrl.searchParams.get("q");
    if (!query) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Missing query parameter ?q=" }));
    }

    const mockData = await generateMockGoogleSearch(query);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(mockData, null, 2));

  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

// === Start Server ===
server.listen(PORT, () => {
  console.log(`✅ Mock Google Search API Server running ⬇️
🔍 GET   /search?q=ai        (Google style results)
🌐 http://localhost:${PORT}
`);
});
