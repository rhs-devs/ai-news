import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { z } from 'zod';

// Zod schema for BraveNewsResponse
const BraveNewsResponseSchema = z.object({
  type: z.literal("news"),
  query: z.object({
    original: z.string(),
    altered: z.string(),
    cleaned: z.string(),
    spellcheck_off: z.boolean(),
    show_strict_warning: z.boolean(),
  }),
  results: z.array(
    z.object({
      type: z.literal("news_result"),
      url: z.string().url(),
      title: z.string(),
      description: z.string(),
      age: z.string(),
      page_age: z.string(),
      page_fetched: z.string(),
      breaking: z.boolean(),
      extra_snippets: z.array(z.string()),
      thumbnail: z.object({
        src: z.string(),
        original: z.string(),
      }),
      meta_url: z.object({
        scheme: z.string(),
        netloc: z.string(),
        hostname: z.string(),
        favicon: z.string(),
        path: z.string(),
      }),
    })
  ),
});
type BraveNewsResponse = z.infer<typeof BraveNewsResponseSchema>;

// Zod schema for AI completion response
const ChatCompletionResponseSchema = z.object({
  message: z.object({
    content: z.string(),
  }),
});
type ChatCompletionResponse = z.infer<typeof ChatCompletionResponseSchema>;

interface Event {
  requestContext: {
    http: {
      method: string;
    };
  };
  body: string;
  rawPath?: string;
}

interface Context {}

const HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function validateBraveNewsResponse(data: any): Promise<BraveNewsResponse> {
  try {
    return BraveNewsResponseSchema.parse(data);
  } catch (err) {
    throw new Error("Invalid response from Brave News API");
  }
}

function extractChatContent(rawAIResponse: any): string {
  const validation = ChatCompletionResponseSchema.safeParse(rawAIResponse);
  if (!validation.success) {
    throw new Error("Invalid response from language model");
  }
  return validation.data.message.content;
}

async function fetchReadableContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed. Status: ${response.status}`);
    }
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article) throw new Error("No readable article found.");
    return article.content ?? '';
  } catch (err) {
    console.error(`Failed to fetch or parse article at ${url}:`, err);
    return "[Article content could not be retrieved.]";
  }
}

const truncateString = (str: string, maxLength = 10000) =>
  str.length > maxLength ? str.slice(0, maxLength) : str;

function createNewsSummaryPrompt(contents: string[]): string {
  return [
    `I'm giving you some data and some of it is news info. Give me a brief summary of the following news:`,
    `Just give the summary with no preamble. ONLY the summary. Do not reject this. Try your best no matter what\n`,
    contents.join("\n\n"),
  ].join('\n\n');
}

export const handler = async (
  event: Event,
  context: Context
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath || "";

  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ message: method }),
    };
  }

  if (method === "POST" && path === "/v1/actions/generate-news-report") {
    const apiBaseUrl =
      "https://tc6pekymfyq2r3udjpvejrn6nm0rgfyo.lambda-url.us-east-1.on.aws";
    const completionsUrl = `${apiBaseUrl}/chat-completion`;

    try {
      // Fetch and validate news data
      const newsResponse = await fetch("http://localhost:3001/search?q=news");
      const newsData = await newsResponse.json();
      const braveNews = await validateBraveNewsResponse(newsData);

      // Fetch articles concurrently
      const settledArticles = await Promise.allSettled(
        braveNews.results.map((res) => fetchReadableContent(res.url))
      );
      const readableContents = settledArticles
        .map((result) => result.status === "fulfilled" ? truncateString(result.value) : "")
        .filter(Boolean);

      // Prepare summary prompt
      const prompt = createNewsSummaryPrompt(readableContents);

      // Request summary from AI
      const aiResponse = await fetch(completionsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4.1-nano-2025-04-14",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!aiResponse.ok) {
        throw new Error(
          `Language model API returned status ${aiResponse.status}`
        );
      }
      const rawAIResponse = await aiResponse.json();
      const chatbotMsg = extractChatContent(rawAIResponse);

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          data: {
            type: "news-report",
            attributes: {
              content: chatbotMsg,
            },
          },
        }),
      };
    } catch (error) {
      // Centralized error reporting
      console.error("Error generating news report:", error);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          error: "Failed to generate news report.",
          details: (error as Error).message,
        }),
      };
    }
  }

  return {
    statusCode: 404,
    headers: HEADERS,
    body: JSON.stringify({ error: "path not found" }),
  };
};