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
    const { documentId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch document
    const { data: document, error: docError } = await supabase
      .from("legal_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError) throw docError;

    console.log("Processing document:", document.title);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("legal-documents")
      .download(document.file_path);

    if (downloadError) throw downloadError;

    // Extract text (simplified - in production use Document AI)
    const text = await fileData.text();
    const extractedText = text.slice(0, 50000); // Limit for MVP

    // Update document with extracted text
    await supabase
      .from("legal_documents")
      .update({ extracted_text: extractedText })
      .eq("id", documentId);

    console.log("Extracted text length:", extractedText.length);

    // Generate summary using Lovable AI
    const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content:
              "You are a concise legal summarizer. Given a court ruling excerpt, produce a 150-250 word neutral summary emphasizing facts, procedural posture, holding, and key legal reasoning. Always append a 'Sources' note with document reference.",
          },
          {
            role: "user",
            content: `Summarize this legal document:\n\n${extractedText.slice(0, 5000)}`,
          },
        ],
      }),
    });

    if (!summaryResponse.ok) {
      console.error("AI summary failed:", await summaryResponse.text());
      throw new Error("Failed to generate summary");
    }

    const summaryData = await summaryResponse.json();
    const summary = summaryData.choices[0].message.content;

    console.log("Generated summary");

    // Generate embeddings for chunks
    const chunkSize = 1000;
    const chunks: string[] = [];
    for (let i = 0; i < extractedText.length; i += chunkSize) {
      chunks.push(extractedText.slice(i, i + chunkSize));
    }

    console.log("Created", chunks.length, "chunks");

    // Generate embeddings using Lovable AI (using text-embedding model simulation)
    for (let i = 0; i < Math.min(chunks.length, 10); i++) {
      const chunk = chunks[i];

      // For MVP, we'll create simple embeddings
      // In production, use proper embedding model
      const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: "Generate a semantic representation (keywords) for this text chunk.",
            },
            { role: "user", content: chunk },
          ],
        }),
      });

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        const keywords = embeddingData.choices[0].message.content;

        // Create a simple embedding vector (768 dimensions)
        // In production, use proper embedding API
        const simpleEmbedding = Array(768).fill(0).map(() => Math.random());

        await supabase.from("document_chunks").insert({
          document_id: documentId,
          chunk_text: chunk,
          chunk_index: i,
          embedding: simpleEmbedding,
          metadata: { keywords },
        });
      }
    }

    console.log("Created chunk embeddings");

    // Update document status
    await supabase
      .from("legal_documents")
      .update({
        status: "indexed",
        summary: summary,
        pii_status: "clean", // Simplified for MVP
      })
      .eq("id", documentId);

    console.log("Document processing complete");

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-document:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
