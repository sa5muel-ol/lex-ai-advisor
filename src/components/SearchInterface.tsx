import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FileText, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BrowserElasticsearchService } from "@/services/BrowserElasticsearchService";

interface SearchResult {
  document_id: string;
  title: string;
  similarity_score: number;
  matching_chunk: string;
  summary?: string;
}

export const SearchInterface = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);

    try {
      // Direct Supabase database search on legal_documents
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      console.log(`Searching for: "${query}"`);

      // Search in legal_documents using text search on extracted_text and title
      const { data: documents, error: searchError } = await supabase
        .from('legal_documents')
        .select('*')
        .or(`title.ilike.%${query}%,extracted_text.ilike.%${query}%,summary.ilike.%${query}%`)
        .limit(10);

      if (searchError) {
        console.error("Search error:", searchError);
        throw searchError;
      }

      console.log(`Found ${documents?.length || 0} documents`);

      // Transform results to match our interface
      const transformedResults: SearchResult[] = (documents || []).map((doc: any) => {
        // Find the best matching excerpt from extracted_text
        const text = doc.extracted_text || '';
        const queryLower = query.toLowerCase();
        const textLower = text.toLowerCase();
        
        let matchingChunk = '';
        let similarityScore = 0.5; // Base score
        
        // Find the first occurrence of the query
        const queryIndex = textLower.indexOf(queryLower);
        if (queryIndex !== -1) {
          // Extract 300 characters around the match
          const start = Math.max(0, queryIndex - 150);
          const end = Math.min(text.length, queryIndex + query.length + 150);
          matchingChunk = text.substring(start, end);
          similarityScore = 0.8; // Higher score for direct match
        } else {
          // Fallback: take first 300 characters
          matchingChunk = text.substring(0, 300);
          similarityScore = 0.6; // Lower score for no direct match
        }

        // Boost score if title matches
        if (doc.title && doc.title.toLowerCase().includes(queryLower)) {
          similarityScore = Math.min(similarityScore + 0.2, 1.0);
        }

        // Boost score if summary matches
        if (doc.summary && doc.summary.toLowerCase().includes(queryLower)) {
          similarityScore = Math.min(similarityScore + 0.1, 1.0);
        }

        return {
          document_id: doc.id,
          title: doc.title || doc.file_name || "Legal Document",
          similarity_score: similarityScore,
          matching_chunk: matchingChunk || "No content available",
          summary: doc.summary || "No summary available",
        };
      });

      setResults(transformedResults);

      toast({
        title: "Search complete",
        description: `Found ${transformedResults.length} relevant documents`,
      });

    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge className="bg-success text-success-foreground">High Match</Badge>;
    if (score >= 0.6) return <Badge className="bg-warning text-warning-foreground">Medium Match</Badge>;
    return <Badge className="bg-destructive text-destructive-foreground">Low Match</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Basic Search (Supabase)
          </CardTitle>
          <CardDescription>
            Fast text search through your GCP-stored legal documents using Supabase database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search your legal documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            Search Results
          </h2>
          {results.map((result, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {result.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Similarity Score: {(result.similarity_score * 100).toFixed(1)}%
                    </CardDescription>
                  </div>
                  {getConfidenceBadge(result.similarity_score)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.summary && (
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-foreground mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{result.summary}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-2">Relevant Excerpt</h4>
                  <p className="text-sm text-muted-foreground italic border-l-4 border-primary pl-4">
                    "{result.matching_chunk}"
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && query && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No results found. Try a different query.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
