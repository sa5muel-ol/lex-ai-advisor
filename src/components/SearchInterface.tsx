import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FileText, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
      const { data, error } = await supabase.functions.invoke("search-cases", {
        body: { query },
      });

      if (error) throw error;

      setResults(data.results || []);

      toast({
        title: "Search complete",
        description: `Found ${data.results?.length || 0} relevant cases`,
      });
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message,
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
            Semantic Case Search
          </CardTitle>
          <CardDescription>
            Search through legal documents using natural language queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Enter your legal query or case description..."
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
