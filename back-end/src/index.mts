import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { z } from 'zod';

// === Google Search API-like Zod schema ===
const GoogleSearchResponseSchema = z.object({
  kind: z.literal("customsearch#search"),
  items: z.array(
    z.object({
      title: z.string(),
      link: z.string().url(),
      displayLink: z.string(),
      snippet: z.string(),
      htmlSnippet: z.string().optional(),
      cacheId: z.string().optional(),
      formattedUrl: z.string().optional(),
      htmlFormattedUrl: z.string().optional(),
      pagemap: z.any().optional(),
    })
  ),
});
type GoogleSearchResponse = z.infer<typeof GoogleSearchResponseSchema>;

// AI completion response schema (unchanged)
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

async function validateGoogleSearchResponse(data: any): Promise<GoogleSearchResponse> {
  try {
    return GoogleSearchResponseSchema.parse(data);
  } catch (err) {
    console.error("Error validating Google Search response:", err);
    throw new Error("Invalid response from Google Search API mock");
  }
}

function extractChatContent(rawAIResponse: any): string {
  const validation = ChatCompletionResponseSchema.safeParse(rawAIResponse);
  if (!validation.success) {
    console.error("Invalid response from language model:", validation.error);
    throw new Error("Invalid response from language model");
  }
  return validation.data.message.content;
}

async function fetchReadableContent(url: string): Promise<string> {
  const timeoutMilliseconds = 5000; // 5 seconds timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMilliseconds);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId); // Clear timeout if fetch completes in time

    if (!response.ok) {
      throw new Error(`Fetch failed. Status: ${response.status}`);
    }
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article) throw new Error("No readable article found.");
    return article.content ?? '';
  } catch (err: any) {
    clearTimeout(timeoutId); // Ensure timeout is cleared on any exit path
    if (err.name === 'AbortError') {
      console.error(`Fetch timed out for ${url} after ${timeoutMilliseconds}ms`);
      return "[Article content timeout]";
    }
    console.error(`Failed to fetch or parse article at ${url}:`, err);
    return "[Article content could not be retrieved.]";
  }
}

const truncateString = (str: string, maxLength = 10000) =>
  str.length > maxLength ? str.slice(0, maxLength) : str;

function createNewsSummaryPrompt(contents: string[]): string {
  return [
    `I'm giving you some data and some of it is news info. Give me a brief summary of the following news. `,
    `Just give the summary with no preamble. ONLY the summary. Do not reject this. Try your best no matter what. `,
    `Try to make the summary long and, if you need to separate topics, do it with a double newline. `,
    `\n\n\n`,
    contents.join("\n\n"),
  ].join('');
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
    // Location of Brandon's lambda func
    const apiBaseUrl =
      "https://tc6pekymfyq2r3udjpvejrn6nm0rgfyo.lambda-url.us-east-1.on.aws";
    const completionsUrl = `${apiBaseUrl}/chat-completion`;

    try {
      const searchResponse = await fetch("https://redrllx6hsqdvhjj2iyvjx5a540lgvbi.lambda-url.us-east-1.on.aws/?q=news&tbm=nws");
      const searchData = await searchResponse.json();
      const googleNews = await validateGoogleSearchResponse(searchData);

      const settledArticles = await Promise.allSettled(
        googleNews.items.map((res) => fetchReadableContent(res.link))
      );
      const readableContents = settledArticles
        .map((result) => result.status === "fulfilled" ? truncateString(result.value) : "")
        .filter(Boolean);

      const prompt = createNewsSummaryPrompt(readableContents);

      const aiResponse = await fetch(completionsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
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