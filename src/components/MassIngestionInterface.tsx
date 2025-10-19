import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CourtListenerService } from '@/services/CourtListenerService';
import { SettingsService } from '@/services/SettingsService';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Download, Search, Database, FileText, Clock, AlertTriangle, Eye, CheckSquare, Square } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface Court {
  id: string;
  full_name: string;
  short_name: string;
}

interface DocumentType {
  id: string;
  name: string;
}

interface IngestionStats {
  total: number;
  downloaded: number;
  processed: number;
  failed: number;
}

export const MassIngestionInterface: React.FC = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [courts, setCourts] = useState<Court[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedCourt, setSelectedCourt] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [maxDocuments, setMaxDocuments] = useState(100);
  const [isIngesting, setIsIngesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<IngestionStats>({ total: 0, downloaded: 0, processed: 0, failed: 0 });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = SettingsService.loadSettings();
    if (settings.courtListenerApiKey) {
      setApiKey(settings.courtListenerApiKey);
      await initializeService(settings.courtListenerApiKey);
    }
  };

  const initializeService = async (key: string) => {
    try {
      const service = new CourtListenerService(key);
      const [courtsData, docTypesData] = await Promise.all([
        service.getCourts(),
        service.getDocumentTypes()
      ]);
      setCourts(courtsData || []);
      setDocumentTypes(docTypesData || []);
    } catch (error) {
      console.error('Failed to initialize Court Listener service:', error);
    }
  };

  const handleApiKeySave = async () => {
    SettingsService.saveSettings({ courtListenerApiKey: apiKey });
    await initializeService(apiKey);
    toast({
      title: "API Key Saved",
      description: "Court Listener API key has been saved and service initialized.",
    });
  };

  const searchDocuments = async () => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your Court Listener API key first.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const service = new CourtListenerService(apiKey);
      const filters = {
        query: searchQuery || undefined,
        court: selectedCourt || undefined,
        document_type: selectedDocType || undefined,
        date_filed_after: dateRange.from || undefined,
        date_filed_before: dateRange.to || undefined,
        page_size: Math.min(maxDocuments, 1000)
      };

      const results = await service.searchDocuments(filters);
      
      // Filter to only show PDF documents with actual downloadable content
      const availableResults = results.filter(doc => 
        doc.opinions && doc.opinions.length > 0 && 
        doc.opinions.some(opinion => 
          opinion.download_url && 
          opinion.download_url.trim() !== '' &&
          (opinion.download_url.toLowerCase().includes('.pdf') || 
           opinion.download_url.toLowerCase().includes('pdf') ||
           opinion.type?.toLowerCase().includes('pdf'))
        )
      );
      
      setSearchResults(availableResults);
      setStats(prev => ({ ...prev, total: availableResults.length }));
      
      toast({
        title: "Search Complete",
        description: `Found ${availableResults.length} PDF documents with downloadable content (${results.length} total found).`,
      });
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Failed to search documents. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleDocumentSelect = (docId: string, selected: boolean) => {
    const newSelected = new Set(selectedDocuments);
    if (selected) {
      newSelected.add(docId);
    } else {
      newSelected.delete(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === searchResults.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(searchResults.map(doc => doc.cluster_id || doc.id)));
    }
  };

  const handlePreviewDocument = (doc: any) => {
    setPreviewDocument(doc);
    setIsPreviewOpen(true);
  };

  const startIngestion = async () => {
    if (selectedDocuments.size === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select documents to ingest first.",
        variant: "destructive",
      });
      return;
    }

    const documentsToIngest = searchResults.filter(doc => 
      selectedDocuments.has(doc.cluster_id || doc.id)
    );

    setIsIngesting(true);
    setProgress(0);
    setStats({ total: documentsToIngest.length, downloaded: 0, processed: 0, failed: 0 });

    try {
      const service = new CourtListenerService(apiKey, supabase);
      
      // Process documents in batches
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < documentsToIngest.length; i += batchSize) {
        batches.push(documentsToIngest.slice(i, i + batchSize));
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length}`);
        
        await service.ingestDocuments(batch);
        
        const processed = Math.min((i + 1) * batchSize, searchResults.length);
        setProgress((processed / searchResults.length) * 100);
        setStats(prev => ({ ...prev, processed }));
        
        // Small delay between batches to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      toast({
        title: "Ingestion Complete",
        description: `Attempted to process ${searchResults.length} documents. Only successfully downloaded PDFs were ingested. Check console for details.`,
      });
    } catch (error) {
      toast({
        title: "Ingestion Failed",
        description: "Failed to ingest documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsIngesting(false);
    }
  };

  const getRecentDocuments = async () => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your Court Listener API key first.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const service = new CourtListenerService(apiKey);
      const results = await service.getRecentDocuments(maxDocuments);
      
      // Filter to only show PDF documents with actual downloadable content
      const availableResults = results.filter(doc => 
        doc.opinions && doc.opinions.length > 0 && 
        doc.opinions.some(opinion => 
          opinion.download_url && 
          opinion.download_url.trim() !== '' &&
          (opinion.download_url.toLowerCase().includes('.pdf') || 
           opinion.download_url.toLowerCase().includes('pdf') ||
           opinion.type?.toLowerCase().includes('pdf'))
        )
      );
      
      setSearchResults(availableResults);
      setStats(prev => ({ ...prev, total: availableResults.length }));
      
      toast({
        title: "Recent Documents Loaded",
        description: `Found ${availableResults.length} PDF documents with downloadable content (${results.length} total from last 30 days).`,
      });
    } catch (error) {
      toast({
        title: "Failed to Load Recent Documents",
        description: "Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Court Listener PACER Integration
          </CardTitle>
          <CardDescription>
            Mass ingest legal documents from federal courts via Court Listener's PACER API
          </CardDescription>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Download Status</AlertTitle>
            <AlertDescription>
              Documents will be downloaded via backend proxy when available. 
              If the proxy server is not running, placeholder documents with metadata will be created instead.
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">Court Listener API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Court Listener API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button onClick={handleApiKeySave} disabled={!apiKey}>
                Save
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Get your API key from{' '}
              <a href="https://www.courtlistener.com/api/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Court Listener API
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Search Documents</TabsTrigger>
          <TabsTrigger value="recent">Recent Documents</TabsTrigger>
          <TabsTrigger value="ingestion">Mass Ingestion</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-query">Search Query</Label>
                <Input
                  id="search-query"
                  type="text"
                  placeholder="e.g., 'patent infringement' OR 'class action'"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="court">Court</Label>
                  <Select value={selectedCourt} onValueChange={setSelectedCourt}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a court" />
                    </SelectTrigger>
                    <SelectContent>
                      {courts.map((court) => (
                        <SelectItem key={court.id} value={court.id}>
                          {court.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-type">Document Type</Label>
                  <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-from">Date From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-to">Date To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-docs">Max Documents</Label>
                  <Input
                    id="max-docs"
                    type="number"
                    min="1"
                    max="1000"
                    value={maxDocuments}
                    onChange={(e) => setMaxDocuments(parseInt(e.target.value) || 100)}
                  />
                </div>
              </div>

              <Button onClick={searchDocuments} disabled={isSearching || !apiKey} className="w-full">
                {isSearching ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search Documents
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Documents (Last 30 Days)
              </CardTitle>
              <CardDescription>
                Quickly load the most recent legal documents from all courts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recent-max">Max Documents</Label>
                  <Input
                    id="recent-max"
                    type="number"
                    min="1"
                    max="1000"
                    value={maxDocuments}
                    onChange={(e) => setMaxDocuments(parseInt(e.target.value) || 100)}
                  />
                </div>

                <Button onClick={getRecentDocuments} disabled={isSearching || !apiKey} className="w-full">
                  {isSearching ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Loading Recent Documents...
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Load Recent Documents
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingestion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Mass Ingestion
              </CardTitle>
              <CardDescription>
                Download and process documents into your legal research platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {searchResults.length > 0 && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    {selectedDocuments.size > 0 ? (
                      <>Ready to ingest <Badge variant="secondary">{selectedDocuments.size}</Badge> selected PDF documents</>
                    ) : (
                      <>Select PDF documents from search results to ingest them</>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {isIngesting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Total: {stats.total}</div>
                    <div>Processed: {stats.processed}</div>
                    <div>Downloaded: {stats.downloaded}</div>
                    <div>Failed: {stats.failed}</div>
                  </div>
                </div>
              )}

              <Button 
                onClick={startIngestion} 
                disabled={isIngesting || selectedDocuments.size === 0 || !apiKey}
                className="w-full"
              >
                {isIngesting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Ingesting Documents...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Ingest Selected Documents ({selectedDocuments.size})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  {searchResults.length} PDF documents with downloadable content • {selectedDocuments.size} selected
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedDocuments.size === searchResults.length ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((doc) => {
                const docId = doc.cluster_id || doc.id;
                const isSelected = selectedDocuments.has(docId);
                
                return (
                  <div key={docId} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleDocumentSelect(docId, checked as boolean)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{doc.caseName || doc.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {doc.court} • {doc.dateFiled || doc.date_filed}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Available</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewDocument(doc)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Document Preview
            </DialogTitle>
            <DialogDescription>
              Preview document details before ingestion
            </DialogDescription>
          </DialogHeader>
          
          {previewDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-2">Case Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Case Name:</strong> {previewDocument.caseName || previewDocument.description}</div>
                    <div><strong>Court:</strong> {previewDocument.court}</div>
                    <div><strong>Date Filed:</strong> {previewDocument.dateFiled || previewDocument.date_filed}</div>
                    <div><strong>Docket Number:</strong> {previewDocument.docketNumber || previewDocument.docket_number}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-2">Document Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Cluster ID:</strong> {previewDocument.cluster_id}</div>
                    <div><strong>Citations:</strong> {previewDocument.citation?.join(', ') || 'N/A'}</div>
                    <div><strong>Cite Count:</strong> {previewDocument.citeCount || 0}</div>
                    <div><strong>Status:</strong> {previewDocument.status}</div>
                  </div>
                </div>
              </div>

              {previewDocument.opinions && previewDocument.opinions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-foreground mb-2">Available Documents</h4>
                  <div className="space-y-2">
                    {previewDocument.opinions.map((opinion: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Opinion {index + 1}</div>
                            <div className="text-sm text-muted-foreground">
                              Type: {opinion.type} • SHA1: {opinion.sha1}
                            </div>
                          </div>
                          <Badge variant="default">Available</Badge>
                        </div>
                        {opinion.download_url && (
                          <div className="mt-2">
                            <a 
                              href={opinion.download_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View Original Document →
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    const docId = previewDocument.cluster_id || previewDocument.id;
                    handleDocumentSelect(docId, true);
                    setIsPreviewOpen(false);
                    toast({
                      title: "Document Selected",
                      description: "Document has been selected for ingestion.",
                    });
                  }}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select for Ingestion
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

