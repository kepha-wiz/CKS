import { NextRequest, NextResponse } from "next/server";

/* -------------------------
   SYSTEM PROMPT / FORMATTING
   ------------------------- */
const SYSTEM_PROMPT = `You are CKS AI, a professional AI assistant created by CKS-Tech. You provide visually appealing, well-structured responses with proper formatting.

Guidelines:
- Use emojis to make responses engaging
- Use bullet points (•) and numbered lists for clarity
- Use **bold text** for emphasis and headers
- Proper spacing and line breaks for readability
- Create visual hierarchy with formatting
`;

/* -------------------------
   SEARCH + FALLBACK LOGIC
   ------------------------- */
async function searchWithFallback(query: string) {
  const methods = [];

  if (process.env.SERPER_API_KEY) {
    methods.push(async () => {
      const apiKey = process.env.SERPER_API_KEY;
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
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

  // Local fallback
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
    } catch (err) {
      console.warn("Search method failed:", err?.message || err);
      continue;
    }
  }

  return [];
}

function formatSearchContext(results: any[]) {
  if (!results || results.length === 0) return "";
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\n${r.snippet ? r.snippet + "\n" : ""}Source: ${
          r.url
        }`
    )
    .join("\n\n");
}

function formatSources(results: any[]) {
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
   LOCAL FALLBACK GENERATOR
   ------------------------- */
function localAIGenerate(userMessage: string, searchResults: any[]) {
  const title = `💡 Quick answer about "${userMessage}"\n\n`;
  const directAnswer = `• **Direct answer:** I couldn't access an external AI service right now, but here's a concise, helpful summary based on the input and local knowledge.\n\n`;
  const bullets = [
    `• **What it is:** A short explanation related to "${userMessage}".`,
    `• **How it matters:** Practical implications or reasons this is useful.`,
    `• **Next steps:** What the user can try next (e.g., search more, clarify, or provide more context).`,
  ].join("\n");

  const details = `\n\n**Details & Context:**\n- This fallback reply is generated locally when external AI/search services are not configured.\n- Provide more detail or a specific angle (e.g., "history", "examples", "code") and I'll expand.\n`;

  const sourcesPart = formatSources(searchResults);

  const followUps = `\n\n**Suggested follow-up questions:**\n1. Could you give more specific details or context about "${userMessage}"?\n2. Do you want examples, code, or a step-by-step guide?\n3. Would you like me to attempt a web search (if you add a SERPER_API_KEY)?`;

  return `${title}${directAnswer}${bullets}${details}${sourcesPart}${followUps}`;
}

/* -------------------------
   MAIN ROUTE
   ------------------------- */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const message = body?.message ?? null;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 1) Get search results
    const searchResults = await searchWithFallback(message);
    const searchContext = formatSearchContext(searchResults);

    // 2) If Hugging Face token is available, use it
    let aiContent: string | null = null;

    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const response = await fetch(
          "https://api-inference.huggingface.co/models/gpt2", // Replace with a suitable HF model
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: searchContext
                ? `Context:\n${searchContext}\n\nQuestion: ${message}`
                : message,
              parameters: { max_new_tokens: 250 },
            }),
          }
        );

        const data = await response.json();
        aiContent = data?.[0]?.generated_text || null;
      } catch (err) {
        console.warn("Hugging Face API failed:", err);
        aiContent = null;
      }
    }

    // 3) Use local fallback if HF failed
    const finalResponse = aiContent
      ? aiContent + formatSources(searchResults)
      : localAIGenerate(message, searchResults);

    return NextResponse.json({
      response: finalResponse,
      sources: searchResults,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Chat API unexpected error:", err);

    return NextResponse.json({
      response:
        "I apologize, but I'm experiencing technical difficulties at the moment. Please try again later.",
      sources: [],
      timestamp: new Date().toISOString(),
      error: err?.message || String(err),
    });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    message: "CKS Chat API is running",
    timestamp: new Date().toISOString(),
  });
}
