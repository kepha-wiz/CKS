import { NextRequest, NextResponse } from "next/server";

/* -------------------------
   SEARCH FUNCTION
------------------------- */
async function searchWithFallback(query: string) {
  // Only Serper API for search
  if (process.env.SERPER_API_KEY) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: 8 }), // Increased to 8 for better synthesis
      });

      if (!res.ok) throw new Error(`Serper API failed: ${res.status}`);

      const data = await res.json();
      return (data.organic || []).map((item: any, idx: number) => ({
        title: item.title || `Result ${idx + 1}`,
        url: item.link || item.displayed_link || "https://example.com",
        snippet: item.snippet || "",
        position: idx + 1,
      }));
    } catch (err) {
      console.warn("Serper search failed:", err);
    }
  }

  // If search fails, return empty array
  return [];
}

/* -------------------------
   INTELLIGENT SYNTHESIS
------------------------- */
function synthesizeFromSearch(query: string, searchResults: any[]) {
  if (!searchResults || searchResults.length === 0) {
    return `🔍 I couldn't find specific information about "${query}". This could be due to:\n\n• The query being very specific or recent\n• Limited information available on this topic\n• Possible spelling or phrasing issues\n\nTry rephrasing your question or provide more context.`;
  }

  // Extract key information from search results
  const topResults = searchResults.slice(0, 5);
  
  // Identify common themes and extract key facts
  const keyFacts = extractKeyFacts(topResults);
  const themes = identifyThemes(topResults);
  
  // Determine the type of query to customize response
  const queryType = determineQueryType(query);
  
  // Build contextual introduction
  const intro = generateIntroduction(query, queryType, themes);
  
  // Build main content with synthesized information
  const mainContent = generateMainContent(query, queryType, keyFacts, topResults);
  
  // Build conclusion with additional insights
  const conclusion = generateConclusion(query, queryType, themes);
  
  // Build sources section
  const sources = searchResults
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] [${r.title}](${r.url})`)
    .join("\n");

  return `${intro}\n\n${mainContent}\n\n${conclusion}\n\n---\n\n**🔗 Sources:**\n${sources}`;
}

/* -------------------------
   HELPER FUNCTIONS FOR INTELLIGENT SYNTHESIS
------------------------- */
function extractKeyFacts(results: any[]) {
  // Extract key facts from search results
  const facts = [];
  
  // Look for numerical data, dates, specific claims
  results.forEach(result => {
    const snippet = result.snippet;
    
    // Extract years/dates
    const years = snippet.match(/\b(19|20)\d{2}\b/g);
    if (years && years.length > 0) {
      facts.push(`Date reference: ${years.join(", ")}`);
    }
    
    // Extract percentages
    const percentages = snippet.match(/\b\d+%\b/g);
    if (percentages && percentages.length > 0) {
      facts.push(`Statistical data: ${percentages.join(", ")}`);
    }
    
    // Extract measurements
    const measurements = snippet.match(/\b\d+\s*(km|mi|kg|lb|°C|°F|ft|m|cm|mm)\b/gi);
    if (measurements && measurements.length > 0) {
      facts.push(`Measurements: ${measurements.join(", ")}`);
    }
  });
  
  return facts;
}

function identifyThemes(results: any[]) {
  // Identify common themes across search results
  const themes = new Set();
  
  // Common theme keywords
  const themeKeywords = {
    "Technology": ["technology", "software", "app", "digital", "computer", "online", "website"],
    "Science": ["research", "study", "scientist", "experiment", "discovery", "analysis"],
    "Business": ["company", "business", "market", "economy", "financial", "revenue", "profit"],
    "Health": ["health", "medical", "treatment", "disease", "symptoms", "doctor", "hospital"],
    "Entertainment": ["movie", "music", "game", "show", "entertainment", "celebrity"],
    "Sports": ["sport", "game", "team", "player", "match", "championship", "score"],
    "Education": ["education", "school", "university", "student", "learning", "course"],
    "Politics": ["government", "policy", "political", "election", "vote", "law"],
    "History": ["history", "historical", "ancient", "past", "century", "decade"],
  };
  
  results.forEach(result => {
    const text = `${result.title} ${result.snippet}`.toLowerCase();
    
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        themes.add(theme);
      }
    });
  });
  
  return Array.from(themes);
}

function determineQueryType(query: string) {
  const lowerQuery = query.toLowerCase();
  
  // Check for question types
  if (lowerQuery.startsWith("what is") || lowerQuery.startsWith("define")) {
    return "definition";
  } else if (lowerQuery.startsWith("how to") || lowerQuery.includes("how do")) {
    return "howto";
  } else if (lowerQuery.startsWith("why") || lowerQuery.includes("reason")) {
    return "explanation";
  } else if (lowerQuery.includes("compare") || lowerQuery.includes("vs") || lowerQuery.includes("versus")) {
    return "comparison";
  } else if (lowerQuery.includes("review") || lowerQuery.includes("rating") || lowerQuery.includes("opinion")) {
    return "review";
  } else if (lowerQuery.includes("history") || lowerQuery.includes("origin")) {
    return "historical";
  } else if (lowerQuery.includes("news") || lowerQuery.includes("recent") || lowerQuery.includes("latest")) {
    return "news";
  } else if (lowerQuery.includes("benefit") || lowerQuery.includes("advantage") || lowerQuery.includes("pro")) {
    return "benefits";
  } else if (lowerQuery.includes("disadvantage") || lowerQuery.includes("con") || lowerQuery.includes("risk")) {
    return "drawbacks";
  } else {
    return "general";
  }
}

function generateIntroduction(query: string, queryType: string, themes: string[]) {
  const themeText = themes.length > 0 ? ` This topic relates to ${themes.join(", ")} fields.` : "";
  
  switch (queryType) {
    case "definition":
      return `📚 **Understanding ${query}**\n\nHere's what you need to know about this topic.${themeText}`;
    case "howto":
      return `🛠️ **How to ${query.replace("how to", "").trim()}**\n\nHere's a comprehensive approach based on current information.${themeText}`;
    case "explanation":
      return `🔍 **Why ${query.replace("why", "").trim()}**\n\nHere are the key factors and explanations.${themeText}`;
    case "comparison":
      return `⚖️ **Comparing ${query}**\n\nHere's how these options stack up against each other.${themeText}`;
    case "review":
      return `⭐ **Review of ${query}**\n\nHere's what the information reveals about this topic.${themeText}`;
    case "historical":
      return `📜 **Historical context of ${query}**\n\nHere's the background and development over time.${themeText}`;
    case "news":
      return `📰 **Latest on ${query}**\n\nHere's the most current information available.${themeText}`;
    case "benefits":
      return `✅ **Benefits of ${query}**\n\nHere are the advantages and positive aspects.${themeText}`;
    case "drawbacks":
      return `⚠️ **Potential drawbacks of ${query}**\n\nHere are the limitations and considerations.${themeText}`;
    default:
      return `💡 **About ${query}**\n\nHere's what I found based on current information.${themeText}`;
  }
}

function generateMainContent(query: string, queryType: string, keyFacts: string[], results: any[]) {
  let content = "";
  
  // Add key facts if available
  if (keyFacts.length > 0) {
    content += `**Key Information:**\n${keyFacts.map(fact => `• ${fact}`).join("\n")}\n\n`;
  }
  
  // Synthesize main points from top results
  const mainPoints = results.slice(0, 3).map(result => {
    // Clean up the snippet for better readability
    let snippet = result.snippet;
    
    // Remove redundant phrases
    snippet = snippet.replace(/click here for more information/gi, "");
    snippet = snippet.replace(/read more/gi, "");
    snippet = snippet.replace(/learn more/gi, "");
    
    // Format as a bullet point
    return `• ${snippet}`;
  });
  
  if (mainPoints.length > 0) {
    content += `**Main Points:**\n${mainPoints.join("\n")}`;
  }
  
  // Add query-specific content
  switch (queryType) {
    case "howto":
      content += "\n\n**Steps to Consider:**\n• Research the specific requirements for your situation\n• Gather necessary resources or tools\n• Follow established best practices\n• Consider potential challenges and how to address them";
      break;
    case "explanation":
      content += "\n\n**Factors to Consider:**\n• Context and circumstances\n• Historical background\n• Current trends and developments\n• Expert opinions and research";
      break;
    case "comparison":
      content += "\n\n**Comparison Factors:**\n• Features and capabilities\n• Performance and efficiency\n• Cost and value\n• User experiences and reviews";
      break;
  }
  
  return content;
}

function generateConclusion(query: string, queryType: string, themes: string[]) {
  let conclusion = "";
  
  switch (queryType) {
    case "definition":
      conclusion = "This definition should provide a solid foundation for understanding the topic. For more specific information, consider exploring particular aspects that interest you.";
      break;
    case "howto":
      conclusion = "Following these steps should help you achieve your goal. Remember that specific situations may require adjustments to this general approach.";
      break;
    case "explanation":
      conclusion = "These factors help explain the reasoning behind the topic. Keep in mind that complex issues often have multiple contributing factors.";
      break;
    case "comparison":
      conclusion = "This comparison should help you make an informed decision. Consider your specific needs and priorities when choosing between options.";
      break;
    case "review":
      conclusion = "This review provides an overview based on available information. Personal experiences may vary, so consider multiple perspectives.";
      break;
    case "historical":
      conclusion = "This historical context helps understand how the topic developed over time. Current practices and understanding are often built on this foundation.";
      break;
    case "news":
      conclusion = "This information reflects the current state of knowledge. For rapidly evolving topics, check for more recent updates as they become available.";
      break;
    case "benefits":
      conclusion = "These benefits highlight the positive aspects of the topic. Consider how they align with your specific needs and goals.";
      break;
    case "drawbacks":
      conclusion = "These considerations help identify potential challenges. Being aware of them allows for better planning and risk management.";
      break;
    default:
      conclusion = "This information provides a comprehensive overview of the topic. For more specific details, consider exploring particular aspects that interest you.";
  }
  
  return conclusion;
}

/* -------------------------
   POST ROUTE
------------------------- */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Perform search
    const searchResults = await searchWithFallback(message);

    // Generate intelligent response from search results
    const finalResponse = synthesizeFromSearch(message, searchResults);

    return NextResponse.json({
      response: finalResponse,
      sources: searchResults,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({
      response: "I apologize, but something went wrong. Please try again later.",
      sources: [],
      timestamp: new Date().toISOString(),
      error: err?.message || String(err),
    });
  }
}

/* -------------------------
   GET ROUTE (Health Check)
------------------------- */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    message: "CKS Chat API is running",
    timestamp: new Date().toISOString(),
  });
}
