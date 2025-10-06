import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, similarCases } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch document details
    const { data: document, error: docError } = await supabase
      .from("legal_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError) throw docError;

    console.log("Generating strategy for:", document.title);

    // Build context from similar cases
    const caseContext = similarCases
      .map(
        (c: any) => `
Case: ${c.title}
Similarity: ${(c.similarity_score * 100).toFixed(1)}%
Excerpt: ${c.matching_chunk}
`
      )
      .join("\n---\n");

    // Generate strategy using Lovable AI with tool calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a legal assistant that generates suggested argument approaches for counsel based on provided case facts and similar precedents. Provide 2-3 distinct strategy options, each with: (1) short label (e.g., 'Statute-based challenge'), (2) 4-6 action bullets, (3) supporting citations (doc id + paragraph), and (4) key risks/weaknesses. End with a disclaimer: 'This is not legal advice. Consult a licensed attorney.'`,
          },
          {
            role: "user",
            content: `Based on this case and similar precedents, suggest legal strategies:

Current Case: ${document.title}
Summary: ${document.summary || "No summary available"}

Similar Precedents:
${caseContext}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_strategies",
              description: "Generate 2-3 distinct legal strategy options",
              parameters: {
                type: "object",
                properties: {
                  strategies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        description: { type: "string" },
                        actions: {
                          type: "array",
                          items: { type: "string" },
                        },
                        citations: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              document_id: { type: "string" },
                              excerpt: { type: "string" },
                            },
                          },
                        },
                        risks: { type: "string" },
                        confidence: {
                          type: "number",
                          minimum: 0,
                          maximum: 1,
                        },
                      },
                      required: ["label", "description", "actions", "citations", "risks", "confidence"],
                    },
                  },
                },
                required: ["strategies"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_strategies" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI strategy generation failed:", errorText);
      throw new Error("Failed to generate strategy");
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data));

    // Extract strategies from tool call
    const toolCall = data.choices[0].message.tool_calls?.[0];
    let strategies;

    if (toolCall) {
      const functionArgs = JSON.parse(toolCall.function.arguments);
      strategies = functionArgs.strategies;
    } else {
      // Fallback if no tool call
      strategies = [
        {
          label: "Precedent-Based Argument",
          description: "Leverage similar case outcomes",
          actions: [
            "Identify key factual similarities with precedents",
            "Highlight favorable holdings from matched cases",
            "Distinguish unfavorable precedents",
          ],
          citations: similarCases.slice(0, 2).map((c: any) => ({
            document_id: c.document_id,
            excerpt: c.matching_chunk.slice(0, 100),
          })),
          risks: "Opposing counsel may distinguish based on different facts",
          confidence: 0.75,
        },
      ];
    }

    // Store strategies in database
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        for (const strategy of strategies) {
          await supabase.from("legal_strategies").insert({
            document_id: documentId,
            user_id: user.id,
            strategy_type: strategy.label,
            strategy_text: JSON.stringify(strategy),
            supporting_citations: strategy.citations,
            confidence_score: strategy.confidence,
          });
        }
      }
    }

    console.log("Generated", strategies.length, "strategies");

    return new Response(
      JSON.stringify({ strategies }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-strategy:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
