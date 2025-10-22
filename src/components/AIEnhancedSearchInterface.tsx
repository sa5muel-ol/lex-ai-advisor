import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FileText, Scale, Brain, Lightbulb, Target, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AIEnhancedSearchService, AIEnhancedSearchResult } from "@/services/AIEnhancedSearchService";
import { SearchFilters } from "@/services/BrowserElasticsearchService";
import { GCPMetadataSyncService } from "@/services/GCPMetadataSyncService";
import { SupabaseToElasticsearchSyncService } from "@/services/SupabaseToElasticsearchSyncService";

export const AIEnhancedSearchInterface = () => {
  const [query, setQuery] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AIEnhancedSearchResult | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiSearchService] = useState(() => new AIEnhancedSearchService());
  const [gcpSyncService] = useState(() => new GCPMetadataSyncService());
  const [supabaseSyncService] = useState(() => new SupabaseToElasticsearchSyncService());
  const [syncing, setSyncing] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<{elasticsearch: boolean; gemini: boolean}>({elasticsearch: false, gemini: false});

  const { toast } = useToast();

  useEffect(() => {
    // Initialize the service and sync documents
    const initializeAndSync = async () => {
      try {
        // Initialize Elasticsearch
        await aiSearchService.initialize();
        
        // Check if sync is needed and sync documents from GCP to Supabase
        const gcpSyncStatus = await gcpSyncService.getSyncStatus();
        if (gcpSyncStatus.syncIssues > 0) {
          console.log(`GCP sync needed: ${gcpSyncStatus.syncIssues} files need attention`);
          setSyncing(true);
          try {
            const syncResult = await gcpSyncService.syncGCPToSupabase();
            
            toast({
              title: "GCP Sync Complete",
              description: `Synced ${syncResult.success} documents from GCP to Supabase.`,
            });
          } catch (error) {
            console.error('GCP sync failed:', error);
            toast({
              title: "GCP Sync Failed",
              description: "Failed to sync documents from GCP to Supabase.",
              variant: "destructive",
            });
          } finally {
            setSyncing(false);
          }
        } else {
          console.log('GCP documents are already synced to Supabase');
        }

        // Check if sync is needed from Supabase to Elasticsearch
        const elasticsearchSyncStatus = await supabaseSyncService.getSyncStatus();
        if (elasticsearchSyncStatus.syncIssues > 0) {
          console.log(`Elasticsearch sync needed: ${elasticsearchSyncStatus.syncIssues} documents need indexing`);
          setSyncing(true);
          try {
            const syncResult = await supabaseSyncService.syncSupabaseToElasticsearch();
            
            toast({
              title: "Elasticsearch Sync Complete",
              description: `Indexed ${syncResult.success} documents from Supabase to Elasticsearch.`,
            });
          } catch (error) {
            console.error('Elasticsearch sync failed:', error);
            toast({
              title: "Elasticsearch Sync Failed",
              description: "Failed to sync documents from Supabase to Elasticsearch.",
              variant: "destructive",
            });
          } finally {
            setSyncing(false);
          }
        } else {
          console.log('Documents are already synced to Elasticsearch');
        }
        
        // Update service status
        const status = aiSearchService.isInitialized();
        setServiceStatus(status);
        
      } catch (error) {
        console.error('Failed to initialize AI search service:', error);
        toast({
          title: "Service Initialization",
          description: "AI search service initialized with limited functionality. Elasticsearch connection may be unavailable.",
          variant: "default",
        });
      }
    };

    initializeAndSync();
  }, []);

  // Manual sync function
  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const syncResult = await gcpSyncService.syncGCPToSupabase();
      toast({
        title: "Document Sync Complete",
        description: `Successfully synced ${syncResult.success} documents from GCP to Supabase. ${syncResult.failed > 0 ? `${syncResult.failed} failed.` : ''}`,
      });
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync documents from GCP to Supabase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Manual Elasticsearch sync function
  const handleManualElasticsearchSync = async () => {
    setSyncing(true);
    try {
      const syncResult = await supabaseSyncService.syncSupabaseToElasticsearch();
      
      toast({
        title: "Elasticsearch Sync Complete",
        description: `Successfully indexed ${syncResult.success} documents from Supabase to Elasticsearch. ${syncResult.failed > 0 ? `${syncResult.failed} failed.` : ''}`,
      });
    } catch (error) {
      console.error('Manual Elasticsearch sync failed:', error);
      toast({
        title: "Elasticsearch Sync Failed",
        description: "Failed to sync documents from Supabase to Elasticsearch. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Test Gemini connection
  const testGeminiConnection = async () => {
    try {
      const geminiService = new (await import('@/services/GeminiService')).GeminiService();
      const testQuery = "Test query for Gemini API";
      const enhancedQuery = await geminiService.enhanceQuery(testQuery);
      
      toast({
        title: "Gemini API Test",
        description: `Gemini API is working! Enhanced query: "${enhancedQuery.slice(0, 50)}..."`,
      });
      
      // Update service status
      const status = aiSearchService.isInitialized();
      setServiceStatus(status);
      
    } catch (error) {
      console.error('Gemini test failed:', error);
      toast({
        title: "Gemini API Test Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Listen for settings changes to reinitialize services when API keys are updated
  useEffect(() => {
    const handleSettingsUpdate = (e: CustomEvent) => {
      console.log('Settings updated, reinitializing services...');
      aiSearchService.reinitialize();
      
      toast({
        title: "Settings Updated",
        description: "AI services have been reinitialized with new settings.",
      });
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
  }, [aiSearchService]);

  const handleIntelligentSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    
    try {
      // Check if services are properly initialized
      const serviceStatus = aiSearchService.isInitialized();
      
      if (!serviceStatus.gemini) {
        toast({
          title: "Gemini API Not Configured",
          description: "Please configure your Gemini API key in Settings to use AI features.",
          variant: "default",
        });
      }
      
      const searchResults = await aiSearchService.intelligentSearch(query, context, filters);
      
      setResults(searchResults);
      
      toast({
        title: "Search Complete",
        description: `Found ${searchResults.results.length} relevant documents${searchResults.results.length === 0 ? '. Try starting Elasticsearch or check your configuration.' : ' with AI insights'}`,
      });
           } catch (error: any) {
             console.error('Search error:', error);
             
             // Show more specific error messages
             let errorMessage = "Search completed with limited functionality.";
             if (error.message?.includes('Gemini')) {
               errorMessage = "Gemini API error. Please check your API key and model availability.";
             } else if (error.message?.includes('Elasticsearch')) {
               errorMessage = "Elasticsearch connection error. Please ensure Elasticsearch is running.";
             }
             
             toast({
               title: "Search Limited",
               description: errorMessage,
               variant: "default",
             });
      
      // Show placeholder results when services are unavailable
      setResults({
        results: [],
        aiInsights: {
          themes: ['Service Unavailable'],
          precedents: ['Elasticsearch or Gemini API not configured'],
          arguments: [],
          risks: [],
          recommendations: ['Please configure Elasticsearch and Gemini API key for full functionality']
        },
        strategy: {
          primary_arguments: ['Configuration required'],
          supporting_precedents: [],
          counterarguments: [],
          next_steps: ['Set up Elasticsearch and Gemini API'],
          risk_assessment: 'Unable to assess without proper configuration'
        },
        enhancedQuery: query,
        facets: { file_types: [], courts: [], date_ranges: [] },
        total: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = async (newQuery: string) => {
    setQuery(newQuery);
    if (newQuery.length > 2) {
      try {
        const suggestions = await aiSearchService.getSuggestions(newQuery);
        setSuggestions(suggestions);
      } catch (error) {
        console.error('Error getting suggestions:', error);
      }
    } else {
      setSuggestions([]);
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge className="bg-green-100 text-green-800">High Match</Badge>;
    if (score >= 0.6) return <Badge className="bg-yellow-100 text-yellow-800">Medium Match</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low Match</Badge>;
  };

  return (
    <div className="space-y-6 px-0 sm:px-4 sm:max-w-6xl sm:mx-auto">
      {/* AI-Enhanced Search Bar */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Brain className="w-5 h-5 text-purple-600" />
            <span className="hidden sm:inline">AI Search (AI + Elasticsearch)</span>
            <span className="sm:hidden">AI Search</span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Intelligent search through your GCP-stored documents using AI analysis + Elasticsearch
          </CardDescription>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${serviceStatus.elasticsearch ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-muted-foreground">
                Elasticsearch: {serviceStatus.elasticsearch ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${serviceStatus.gemini ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-muted-foreground">
                Gemini 2.5 Flash: {serviceStatus.gemini ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Ask AI about your legal documents..."
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  className="pr-10"
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => {
                          setQuery(suggestion);
                          setSuggestions([]);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleIntelligentSearch} disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                    <span className="hidden sm:inline">AI Analyzing...</span>
                    <span className="sm:hidden">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">AI Search</span>
                    <span className="sm:hidden">Search</span>
                  </>
                )}
              </Button>
            </div>
            
            {/* Sync buttons - responsive layout */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleManualSync}
                disabled={syncing}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Syncing...</span>
                    <span className="sm:hidden">Sync GCP</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Sync GCP → Supabase</span>
                    <span className="sm:hidden">Sync GCP</span>
                  </>
                )}
              </Button>
              <Button 
                onClick={handleManualElasticsearchSync}
                disabled={syncing}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Indexing...</span>
                    <span className="sm:hidden">Sync ES</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Sync Supabase → Elasticsearch</span>
                    <span className="sm:hidden">Sync ES</span>
                  </>
                )}
              </Button>
              <Button 
                onClick={testGeminiConnection}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Test Gemini</span>
                <span className="sm:hidden">Test</span>
              </Button>
            </div>
          </div>
          
          <Textarea
            placeholder="Additional context (optional)..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* AI Insights Panel */}
      {results?.aiInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              AI Legal Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.aiInsights.themes && results.aiInsights.themes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1">
                    <Scale className="w-4 h-4" />
                    Key Legal Themes
                  </h4>
                  <div className="space-y-1">
                    {results.aiInsights.themes.map((theme, index) => (
                      <Badge key={index} variant="secondary" className="mr-1 mb-1">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {results.aiInsights.precedents && results.aiInsights.precedents.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Relevant Precedents
                  </h4>
                  <div className="space-y-1">
                    {results.aiInsights.precedents.map((precedent, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {precedent}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.aiInsights.arguments && results.aiInsights.arguments.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    Legal Arguments
                  </h4>
                  <div className="space-y-1">
                    {results.aiInsights.arguments.map((argument, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {argument}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {results.aiInsights.risks && results.aiInsights.risks.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-1 text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  Potential Risks
                </h4>
                <ul className="space-y-1">
                  {results.aiInsights.risks.map((risk, index) => (
                    <li key={index} className="text-sm text-red-700">• {risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.aiInsights.recommendations && results.aiInsights.recommendations.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-1 text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  AI Recommendations
                </h4>
                <ul className="space-y-1">
                  {results.aiInsights.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-green-700">• {recommendation}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legal Strategy Panel */}
      {results?.strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              AI-Generated Legal Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.strategy.primary_arguments && results.strategy.primary_arguments.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Primary Arguments</h4>
                <ul className="space-y-1">
                  {results.strategy.primary_arguments.map((argument, index) => (
                    <li key={index} className="text-sm text-muted-foreground">• {argument}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.strategy.supporting_precedents && results.strategy.supporting_precedents.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Supporting Precedents</h4>
                <ul className="space-y-1">
                  {results.strategy.supporting_precedents.map((precedent, index) => (
                    <li key={index} className="text-sm text-muted-foreground">• {precedent}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.strategy.next_steps && results.strategy.next_steps.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Recommended Next Steps</h4>
                <ul className="space-y-1">
                  {results.strategy.next_steps.map((step, index) => (
                    <li key={index} className="text-sm text-muted-foreground">• {step}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.strategy.risk_assessment && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold mb-2 text-yellow-800">Risk Assessment</h4>
                <p className="text-sm text-yellow-700">{results.strategy.risk_assessment}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Search Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Scale className="w-6 h-6 text-primary" />
              Search Results ({results.total})
            </h2>
            {results.enhancedQuery && results.enhancedQuery !== query && (
              <Badge variant="outline" className="text-xs">
                Enhanced: "{results.enhancedQuery}"
              </Badge>
            )}
          </div>
          
          {results.results.map((result, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {result.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      AI Confidence: {(result.ai_confidence * 100).toFixed(1)}% | 
                      Score: {result.score.toFixed(2)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{result.file_type}</Badge>
                    {getConfidenceBadge(result.ai_confidence)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.summary && (
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2">AI Summary</h4>
                    <p className="text-sm text-muted-foreground">{result.summary}</p>
                  </div>
                )}
                
                {result.legal_entities && result.legal_entities.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Legal Entities</h4>
                    <div className="flex flex-wrap gap-1">
                      {result.legal_entities.map((entity, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {entity.type}: {entity.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.highlighted_text && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Relevant Excerpt</h4>
                    <p className="text-sm text-muted-foreground italic border-l-4 border-primary pl-4">
                      "{result.highlighted_text}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results && results.results.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No results found. Try a different query or add more context.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

