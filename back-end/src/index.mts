

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


// --- Constants ---
const HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const sampleNewsReport = `
In a historic development that marks a significant milestone in clean energy innovation, researchers at the International Institute for Sustainable Technology (IIST) have unveiled a revolutionary method for producing affordable and efficient hydrogen fuel. Announced at a global energy summit in Geneva, the breakthrough is expected to accelerate the transition away from fossil fuels and reduce global carbon emissions over the next decade.

According to Dr. Lillian Carter, the lead scientist on the project, the new technique utilizes sunlight and seawater through a novel photocatalytic process that significantly lowers production costs while maintaining energy output. "We’ve long known the potential of hydrogen fuel, but until now, scalability and affordability have held us back," said Dr. Carter. "This discovery changes everything."

The technology has been under development for over six years and was funded through a collaboration between multiple governments, private sector innovators, and environmental non-profits. Industry experts believe mass adoption could begin as early as 2027, as testing and pilot programs are fast-tracked globally.

Already, major automotive companies and public transportation authorities have expressed strong interest in adopting hydrogen-powered alternatives. Shares in renewable energy firms surged following the announcement, with investors anticipating a major shift in global energy markets.

Environmental advocacy groups have praised the discovery, calling it a major step forward in the battle against climate change. "If implemented responsibly and equitably, this could be the single biggest thing to happen in decades," said Ava Nguyen, director of the Green Future Coalition.

As the world looks for sustainable solutions in the face of worsening climate impacts, this development brings hope for a cleaner, safer, and more energy-secure future.
`.trim();

// --- Lambda Handler ---
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
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        data: {
          type: 'news-report',
          attributes: {
            content: sampleNewsReport
          }
        }
      }),
    };
  }

  return {
    statusCode: 404,
    headers: HEADERS,
    body: JSON.stringify({
      error: "path not found"
    }),
  };
};