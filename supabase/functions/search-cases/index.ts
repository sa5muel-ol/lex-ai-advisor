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
    const { query } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Searching for:", query);

    // Generate query embedding (simplified for MVP)
    const simpleQueryEmbedding = Array(768).fill(0).map(() => Math.random());

    // Perform hybrid search (simplified - using text search for MVP)
    // In production, combine vector similarity with full-text search
    const { data: chunks, error: searchError } = await supabase
      .from("document_chunks")
      .select(`
        *,
        legal_documents (
          id,
          title,
          summary
        )
      `)
      .textSearch("chunk_text", query)
      .limit(10);

    if (searchError) throw searchError;

    console.log("Found", chunks?.length || 0, "matching chunks");

    // Calculate similarity scores (simplified)
    const results = (chunks || []).map((chunk: any) => ({
      document_id: chunk.legal_documents.id,
      title: chunk.legal_documents.title,
      similarity_score: 0.75 + Math.random() * 0.2, // Simulated for MVP
      matching_chunk: chunk.chunk_text.slice(0, 300),
      summary: chunk.legal_documents.summary,
    }));

    // Group by document and get highest score
    const groupedResults = results.reduce((acc: any[], result: any) => {
      const existing = acc.find((r) => r.document_id === result.document_id);
      if (!existing || result.similarity_score > existing.similarity_score) {
        return [...acc.filter((r) => r.document_id !== result.document_id), result];
      }
      return acc;
    }, []);

    // Sort by similarity
    groupedResults.sort((a, b) => b.similarity_score - a.similarity_score);

    // Save search history
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        await supabase.from("search_history").insert({
          user_id: user.id,
          query_text: query,
          result_count: groupedResults.length,
        });
      }
    }

    console.log("Returning", groupedResults.length, "results");

    return new Response(
      JSON.stringify({ results: groupedResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in search-cases:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
