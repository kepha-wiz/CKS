import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// System prompt for professional AI responses with visual appeal
const SYSTEM_PROMPT = `You are CKS AI, a professional AI assistant created by CKS-Tech. You provide visually appealing, well-structured responses with proper formatting.

## Your Response Guidelines:

### 🎯 **Visually Appealing Format**
- Use emojis to make responses engaging and scannable
- Use bullet points (•) and numbered lists for clarity
- Use **bold text** for emphasis and headers
- Use proper spacing and line breaks for readability
- Create visual hierarchy with different formatting elements

### 🔍 **When Web Search Results Are Available**
- Integrate search information naturally into your response
- Reference sources using numbered format like [1], [2], etc.
- Provide clickable source links at the end in a clean format
- Combine multiple sources for comprehensive answers

### 📝 **Response Structure**
1. **Catchy Title**: Start with an engaging header and emoji
2. **Direct Answer**: Provide clear, direct response
3. **Key Points**: Use bullet points (•) for main information
4. **Details & Context**: Add relevant information with proper formatting
5. **Sources**: List all references with clickable links
6. **Follow-up**: Suggest 2-3 relevant follow-up questions when appropriate

### 🔗 **Source Format**
At the end of your response, include:
---
**🔗 Sources:**
[1] [Title of Source](URL) - Brief description
[2] [Title of Source](URL) - Brief description

### ✨ **Visual Elements to Use**
- Emojis for section headers and emphasis: 🎯, 🔍, 📊, 💡, ✨, 🚀, etc.
- Bullet points: • for lists
- Bold text: **important points**
- Numbered lists for sequential information
- Line breaks for better readability
- Horizontal rules (---) to separate sections

### 🚫 **What to Avoid**
- Don't use raw asterisks without proper markdown formatting
- Don't create walls of text - break it up visually
- Don't say "As an AI assistant..." or similar phrases
- Don't use complex markdown tables (keep it simple)

Remember: Make your responses visually appealing, easy to read, and engaging while maintaining professionalism.`;

async function searchWithFallback(query: string) {
  // Try multiple search methods
  const searchMethods = [
    // Method 1: Serper API
    async () => {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num: 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`Serper API failed: ${response.status}`);
      }

      const data = await response.json();
      return data.organic?.map((item: any, index: number) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        position: index + 1,
      })) || [];
    },

    // Method 2: ZAI Web Search
    async () => {
      const zai = await ZAI.create();
      const searchResult = await zai.functions.invoke("web_search", {
        query: query,
        num: 5
      });

      return searchResult.map((item: any, index: number) => ({
        title: item.name,
        url: item.url,
        snippet: item.snippet,
        position: index + 1,
      }));
    },

    // Method 3: Fallback mock data
    async () => {
      return [
        {
          title: "Information about " + query,
          url: "https://example.com",
          snippet: "No search results available at the moment. Please try again later.",
          position: 1
        }
      ];
    }
  ];

  // Try each method until one succeeds
  for (const method of searchMethods) {
    try {
      const results = await method();
      if (results && results.length > 0) {
        return results;
      }
    } catch (error) {
      console.warn('Search method failed:', error);
      continue;
    }
  }

  // Return empty array if all methods fail
  return [];
}

function formatSearchContext(searchResults: any[]) {
  if (!searchResults || searchResults.length === 0) {
    return '';
  }

  return searchResults.map((result, index) => 
    `[${index + 1}] ${result.title}\n${result.snippet}\nSource: ${result.url}`
  ).join('\n\n');
}

function formatSources(sources: any[]) {
  if (!sources || sources.length === 0) {
    return '';
  }

  return '\n\n---\n\n**🔗 Sources:**\n' + sources.map((source, index) => 
    `[${index + 1}] [${source.title}](${source.url}) - ${source.snippet?.substring(0, 100)}...`
  ).join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Perform web search
    const searchResults = await searchWithFallback(message);
    const searchContext = formatSearchContext(searchResults);

    // Create AI messages
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      }
    ];

    // Add search context if available
    if (searchContext) {
      messages.push({
        role: 'user',
        content: `Context from web search:\n\n${searchContext}\n\nUser question: ${message}`
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }

    // Get AI response
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response at the moment.';
    
    // Add sources to the response
    const finalResponse = aiResponse + formatSources(searchResults);

    return NextResponse.json({
      response: finalResponse,
      sources: searchResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Fallback response
    return NextResponse.json({
      response: 'I apologize, but I\'m experiencing technical difficulties at the moment. Please try again later.',
      sources: [],
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}