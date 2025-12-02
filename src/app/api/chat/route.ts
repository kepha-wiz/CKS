// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";

/* -------------------------
   SYSTEM PROMPT / FORMATTING
   ------------------------- */
const SYSTEM_PROMPT = `You are CKS AI, a professional AI assistant created by CKS-Tech. You provide visually appealing, well-structured responses with proper formatting.

Guidelines (for formatting in the response):
- Use emojis to make responses engaging and scannable
- Use bullet points (•) and numbered lists for clarity
- Use **bold text** for emphasis and headers
- Use proper spacing and line breaks for readability
- Create visual hierarchy with different formatting elements

When web search results are available, include a Sources section at the bottom.

Keep replies concise, helpful, and polite.`;

/* -------------------------
   SEARCH + FALLBACK LOGIC
   ------------------------- */
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

async function searchWithFallback(query: string): Promise<SearchResult[]> {
  const methods: (() => Promise<SearchResult[]>)[] = [];

  if (process.env.SERPER_API_KEY) {
    methods.push(async () => {
      const apiKey = process.env.SERPER_API_KEY;
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: 5 }),
      });
      if (!res.ok) throw new Error(`Serper failed: ${res.status}`);
      const data = await res.json();
      return (data.organic || []).map((item: any, idx: number) => ({
        title: item.title || `Result ${idx + 1}`,
        url: item.link || item.displayed_link || "https://example.com",
        snippet: item.snippet || "",
        position: idx + 1,
      }));
    });
  }

  if (process.env.ZAI_ENABLED === "1") {
    methods.push(async () => {
      try {
        const ZAI = await import("z-ai-web-dev-sdk");
        const zai = await ZAI.default.create();
        const result = await zai.functions.invoke("web_search", { query, num: 5 });
        if (!result) throw new Error("ZAI returned no results");
        return result.map((item: any, idx: number) => ({
          title: item.name || `Result ${idx + 1}`,
          url: item.url || "https://example.com",
          snippet: item.snippet || "",
          position: idx + 1,
        }));
      } catch (err) {
        throw err;
      }
    });
  }

  methods.push(async () => [
    {
      title: `About "${query}"`,
      url: "https://example.com",
      snippet:
        "External search is not configured or temporarily unavailable. This is a local fallback summary.",
      position: 1,
    },
  ]);

  for (const method of methods) {
    try {
      const results = await method();
      if (Array.isArray(results) && results.length > 0) return results;
    } catch (err: any) {
      console.warn("Search method failed:", err?.message || err);
      continue;
    }
  }

  return [];
}

/* -------------------------
   FORMATTERS
   ------------------------- */
function formatSearchContext(results: SearchResult[]): string {
  if (!results || results.length === 0) return "";
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\n${r.snippet ? r.snippet + "\n" : ""}Source: ${r.url}`
    )
    .join("\n\n");
}

function formatSources(results: SearchResult[]): string {
  if (!results || results.length === 0) return "";
  return (
    "\n\n---\n\n**🔗 Sources:**\n" +
    results
      .map(
        (r, i) =>
          `[${i + 1}] [${r.title}](${r.url}) - ${
            (r.snippet || "").slice(0, 120)
          }${(r.snippet || "").length > 120 ? "..." : ""}`
      )
      .join("\n")
  );
}

/* -------------------------
   SIMPLE LOCAL "AI" FALLBACK
   ------------------------- */
function localAIGenerate(userMessage: string, searchResults: SearchResult[]): string {
  const title = `💡 Quick answer about "${userMessage}"\n\n`;
  const directAnswer =
    "• **Direct answer:** I couldn't access an external AI service right now, but here's a concise, helpful summary based on the input and local knowledge.\n\n";
  const bullets = [
    `• **What it is:** A short explanation related to "${userMessage}".`,
    `• **How it matters:** Practical implications or reasons this is useful.`,
    `• **Next steps:** What the user can try next (e.g., search more, clarify, or provide more context).`,
  ].join("\n");

  const details = `\n\n**Details & Context:**\n- This fallback reply is generated locally when external AI/search services are not configured.\n- Provide more detail or a specific angle (e.g., "history", "examples", "code") and I'll expand.\n`;

  const sourcesPart = formatSources(searchResults);

  const followUps = `\n\n**Suggested follow-up questions:**\n1. Could you give me more specific details or context about "${userMessage}"?\n2. Do you want examples, code, or a step-by-step guide?\n3. Would you like me to attempt a web search (if you add a SERPER_API_KEY)?`;

  return `${title}${directAnswer}${bullets}${details}${sourcesPart}${followUps}`;
}

/* -------------------------
   MAIN ROUTE
   ------------------------- */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    const message = body?.message ?? null;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const searchResults = await searchWithFallback(message);
    const searchContext = formatSearchContext(searchResults);

    let aiContent: string | null = null;
    if (process.env.ZAI_ENABLED === "1") {
      try {
        const ZAI = await import("z-ai-web-dev-sdk");
        if (ZAI?.default) {
          const zaiClient = await ZAI.default.create();
          const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: searchContext
                ? `Context from web search:\n\n${searchContext}\n\nUser question: ${message}`
                : message,
            },
          ];
          const completion = await zaiClient.chat.completions.create({
            messages,
            temperature: 0.7,
            max_tokens: 1200,
          });
          aiContent = completion?.choices?.[0]?.message?.content ?? null;
        }
      } catch {
        aiContent = null;
      }
    }

    const finalResponse = aiContent
      ? aiContent + formatSources(searchResults)
      : localAIGenerate(message, searchResults);

    return NextResponse.json({
      response: finalResponse,
      sources: searchResults,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Chat API unexpected error:", err?.message || err);
    return NextResponse.json({
      response:
        "I apologize, but I'm experiencing technical difficulties at the moment. Please try again later.",
      sources: [],
      timestamp: new Date().toISOString(),
      error: err?.message || String(err),
    });
  }
}
