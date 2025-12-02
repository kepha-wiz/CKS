import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// -------------------------
// System prompt / formatting
// -------------------------
const SYSTEM_PROMPT = `You are CKS AI, a professional AI assistant created by CKS-Tech. You provide visually appealing, well-structured responses with proper formatting.

Guidelines:
- Use emojis and bullet points for clarity
- Include bold headers
- Use line breaks for readability
- Integrate search results naturally if available
- Provide sources at the bottom`;


// -------------------------
// Search with fallback
// -------------------------
async function searchWithFallback(query: string) {
  const methods = [];

  // Method 1: Serper API
  if (process.env.SERPER_API_KEY) {
    methods.push(async () => {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num: 5 }),
      });
      if (!res.ok) throw new Error(`Serper failed: ${res.status}`);
      const data = await res.json();
      return (data.organic || []).map((item: any, idx: number) => ({
        title: item.title,
        url: item.link || item.displayed_link || 'https://example.com',
        snippet: item.snippet || '',
        position: idx + 1,
      }));
    });
  }

  // Method 2: Fallback
  methods.push(async () => [
    {
      title: `About "${query}"`,
      url: 'https://example.com',
      snippet: 'External search not available. Showing local fallback info.',
      position: 1,
    },
  ]);

  for (const method of methods) {
    try {
      const results = await method();
      if (Array.isArray(results) && results.length > 0) return results;
    } catch (err) {
      console.warn('Search method failed:', err);
      continue;
    }
  }

  return [];
}

// -------------------------
// Format helpers
// -------------------------
function formatSearchContext(results: any[]) {
  if (!results || results.length === 0) return '';
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\n${r.snippet ? r.snippet + '\n' : ''}Source: ${r.url}`
    )
    .join('\n\n');
}

function formatSources(results: any[]) {
  if (!results || results.length === 0) return '';
  return (
    '\n\n---\n\n**🔗 Sources:**\n' +
    results
      .map(
        (r, i) =>
          `[${i + 1}] [${r.title}](${r.url}) - ${r.snippet?.slice(0, 120)}${
            r.snippet?.length > 120 ? '...' : ''
          }`
      )
      .join('\n')
  );
}

// -------------------------
// Local AI fallback
// -------------------------
function localAIGenerate(userMessage: string, searchResults: any[]) {
  return `💡 Quick answer about "${userMessage}"

• **Direct answer:** I couldn't access the external AI service right now, but here's a helpful summary.

• **What it is:** Explanation about "${userMessage}".
• **How it matters:** Practical implications.
• **Next steps:** You can refine your question, add context, or try a search.

**Details & Context:**
- Fallback generated locally when external AI/search is unavailable.

${formatSources(searchResults)}

**Suggested follow-up questions:**
1. Could you give more context about "${userMessage}"?
2. Do you want examples or step-by-step guidance?
3. Would you like me to attempt a web search?`;
}

// -------------------------
// Main POST route
// -------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const message = body?.message?.trim();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1) Get search results
    const searchResults = await searchWithFallback(message);
    const searchContext = formatSearchContext(searchResults);

    // 2) Try ZAI AI
    let aiContent: string | null = null;
    if (process.env.ZAI_ENABLED === '1') {
      try {
        const zai = await ZAI.create();
        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: searchContext
              ? `Context from web search:\n\n${searchContext}\n\nUser question: ${message}`
              : message,
          },
        ];
        const completion = await zai.chat.completions.create({
          messages,
          temperature: 0.7,
          max_tokens: 1200,
        });
        aiContent = completion?.choices?.[0]?.message?.content ?? null;
      } catch (err) {
        console.warn('ZAI failed:', err);
        aiContent = null;
      }
    }

    // 3) Final response
    const finalResponse = aiContent ? aiContent + formatSources(searchResults) : localAIGenerate(message, searchResults);

    return NextResponse.json({
      response: finalResponse,
      sources: searchResults,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Chat API unexpected error:', err);
    return NextResponse.json({
      response:
        "I apologize, but I'm experiencing technical difficulties at the moment. Please try again later.",
      sources: [],
      timestamp: new Date().toISOString(),
      error: err?.message || String(err),
    });
  }
}

// -------------------------
// Optional GET route (health check)
// -------------------------
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'CKS Chat API is running',
    timestamp: new Date().toISOString(),
  });
}
