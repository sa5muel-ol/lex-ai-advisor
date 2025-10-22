import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FileText, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BrowserElasticsearchService, SearchResult } from "@/services/BrowserElasticsearchService";

export const SearchInterface = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [elasticsearchService] = useState(() => new BrowserElasticsearchService());
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);

    try {
      console.log(`Searching Elasticsearch for: "${query}"`);

      // Initialize Elasticsearch if needed
      await elasticsearchService.initializeIndex();

      // Search using Elasticsearch
      const searchResponse = await elasticsearchService.searchDocuments(query, {}, 10);

      console.log(`Found ${searchResponse.results.length} documents`);

      // Transform results to match our display format
      const transformedResults = searchResponse.results.map((result: SearchResult) => ({
        ...result,
        document_id: result.id,
        similarity_score: result.score,
        matching_chunk: result.highlighted_text || result.content?.slice(0, 200) || result.summary || 'No preview available'
      }));

      setResults(transformedResults);

      toast({
        title: "Search complete",
        description: `Found ${transformedResults.length} relevant documents`,
      });

    } catch (error: any) {
      console.error("Elasticsearch search error:", error);
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
    if (score >= 0.8) return <Badge className="bg-green-100 text-green-800">High Match</Badge>;
    if (score >= 0.6) return <Badge className="bg-yellow-100 text-yellow-800">Medium Match</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low Match</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Elastic Search
          </CardTitle>
          <CardDescription>
            Fast text search through your legal documents using Elasticsearch with advanced indexing and highlighting
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
          <h3 className="text-lg font-semibold">Search Results</h3>
          {results.map((result) => (
            <Card key={result.document_id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      {result.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Scale className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Score: {result.similarity_score.toFixed(2)}
                      </span>
                      {getConfidenceBadge(result.similarity_score)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.summary && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Summary:</h4>
                      <p className="text-sm text-gray-600">{result.summary}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-1">Matching Content:</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {result.matching_chunk}
                    </p>
                  </div>
                  {result.legal_entities && result.legal_entities.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Legal Entities:</h4>
                      <div className="flex flex-wrap gap-1">
                        {result.legal_entities.map((entity: any, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {entity.name || entity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.case_citations && result.case_citations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Case Citations:</h4>
                      <div className="flex flex-wrap gap-1">
                        {result.case_citations.map((citation: any, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {citation.case_name || citation}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.legal_concepts && result.legal_concepts.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Legal Concepts:</h4>
                      <div className="flex flex-wrap gap-1">
                        {result.legal_concepts.map((concept: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && query && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No results found</h3>
            <p className="text-gray-500">
              Try adjusting your search terms or check if documents are properly indexed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};