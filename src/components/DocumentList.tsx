import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Loader2, Download, Eye, Trash2, ChevronLeft, ChevronRight, Sparkles, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServiceUrl } from "@/lib/environment";
import { Document, Page, pdfjs } from 'react-pdf';
import { shouldBypassAuth, getCurrentUserId, isGuestUser } from "@/lib/devMode";
import { GeminiService } from "@/services/GeminiService";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Document {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  status: string;
  pii_status: string;
  created_at: string;
  summary?: string;
  extracted_text?: string;
}

export const DocumentList = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [fileType, setFileType] = useState<string>('application/pdf');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const geminiService = new GeminiService();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      let userId: string | null = null;
      
      if (shouldBypassAuth()) {
        // In development or guest mode, use the appropriate user ID
        userId = getCurrentUserId();
        console.log(`${isGuestUser() ? 'Guest' : 'Development'} mode: Using user ID:`, userId);
      } else {
        // Normal authentication flow
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
        console.log('Current authenticated user:', userId);
      }

      if (!userId) {
        console.log('No user ID available, showing empty list');
        setDocuments([]);
        return;
      }

      // Load documents - in dev mode, we'll fetch all documents since RLS might not work
      let query = supabase.from("legal_documents").select("*");
      
      if (shouldBypassAuth()) {
        // In development mode, fetch all documents for easier testing
        console.log('Development mode: Fetching all documents');
      } else {
        // In production, rely on RLS to filter by user
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      
      console.log(`Found ${data?.length || 0} documents`);
      if (data && data.length > 0) {
        console.log('Document user IDs:', [...new Set(data.map(d => d.user_id))]);
      }
      
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast({
        title: "Failed to load documents",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "indexed":
        return <Badge className="bg-success text-success-foreground">Indexed</Badge>;
      case "processing":
        return <Badge className="bg-warning text-warning-foreground">Processing</Badge>;
      case "failed":
        return <Badge className="bg-destructive text-destructive-foreground">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPIIBadge = (status: string) => {
    switch (status) {
      case "clean":
        return <Badge variant="outline" className="bg-success/10 text-success">Clean</Badge>;
      case "detected":
        return <Badge variant="outline" className="bg-warning/10 text-warning">PII Detected</Badge>;
      case "redacted":
        return <Badge variant="outline" className="bg-info/10 text-info">Redacted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Multi-select functions
  const toggleDocumentSelection = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const selectAllDocuments = () => {
    setSelectedDocuments(new Set(documents.map(doc => doc.id)));
  };

  const clearSelection = () => {
    setSelectedDocuments(new Set());
  };

  const deleteSelectedDocuments = async () => {
    if (selectedDocuments.size === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('legal_documents')
        .delete()
        .in('id', Array.from(selectedDocuments));

      if (error) throw error;

      toast({
        title: "Documents deleted",
        description: `Successfully deleted ${selectedDocuments.size} document(s)`,
      });

      setSelectedDocuments(new Set());
      loadDocuments(); // Reload the list
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // AI Summary generation
  const generateSummary = async (doc: Document) => {
    if (!doc.extracted_text) {
      toast({
        title: "Cannot generate summary",
        description: "No extracted text available for this document",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingSummary(doc.id);
    try {
      const summary = await geminiService.generateSummary(doc.extracted_text);
      
      const { error } = await supabase
        .from('legal_documents')
        .update({ summary })
        .eq('id', doc.id);

      if (error) throw error;

      toast({
        title: "Summary generated",
        description: "AI summary has been added to the document",
      });

      loadDocuments(); // Reload to show updated summary
    } catch (error: any) {
      toast({
        title: "Summary generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSummary(null);
    }
  };

  const loadPdfUrl = async (filePath: string, fileType?: string) => {
    try {
      console.log(`Loading GCS file: ${filePath}`);
      
      // All files are now stored in GCS - use proxy server to bypass CORS
      {
        // This is a GCS file - use proxy server to bypass CORS
        const bucketName = import.meta.env.VITE_GCS_BUCKET_NAME || 'lex-legal-documents-bucket';
        
        // Use the filePath as-is (it already contains the correct path)
        let gcsPath = filePath;
        
        console.log(`Using proxy server for GCS file: ${gcsPath}`);
        
        // Use proxy server to download GCS file
        const proxyUrl = getServiceUrl('proxy');
        console.log(`Proxy URL: ${proxyUrl}`);
        const response = await fetch(`${proxyUrl}/gcs-download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath: gcsPath,
            bucketName: bucketName
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Proxy download failed: ${errorData.error || response.statusText}`);
        }
        
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
            setFileType(fileType || blob.type || 'application/pdf'); // Prioritize stored file_type
      }
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Error",
        description: `Failed to load PDF: ${error.message}. Make sure the proxy server is running.`,
        variant: "destructive",
      });
    }
  };

      const handleViewDocument = (doc: Document) => {
        setSelectedDoc(doc);
        setPdfUrl(null);
        setPageNumber(1);
        if (doc.file_path) {
          loadPdfUrl(doc.file_path, doc.file_type);
        }
      };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handleDownload = () => {
    if (pdfUrl && selectedDoc) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = selectedDoc.file_name;
      link.click();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("legal_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-0 sm:px-4 sm:max-w-5xl sm:mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Your Documents</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs sm:text-sm">{documents.length} documents</Badge>
          <Badge variant="secondary" className="text-xs">
            RLS Filtered
          </Badge>
        </div>
      </div>

      {/* Multi-select controls */}
      {documents.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedDocuments.size === documents.length}
              onCheckedChange={(checked) => checked ? selectAllDocuments() : clearSelection()}
            />
            <span className="text-sm font-medium">
              {selectedDocuments.size === documents.length ? 'Deselect All' : 'Select All'}
            </span>
          </div>
          
          {selectedDocuments.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedDocuments.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelectedDocuments}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedDocuments.has(doc.id)}
                      onCheckedChange={() => toggleDocumentSelection(doc.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-start gap-2 text-base sm:text-lg">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="break-words">{doc.title}</span>
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm">
                        <span className="break-all">{doc.file_name}</span> • {new Date(doc.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {getStatusBadge(doc.status)}
                    {getPIIBadge(doc.pii_status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 pt-0">
                {doc.summary && (
                  <div className="bg-secondary/50 rounded-lg p-3 sm:p-4">
                    <h4 className="font-semibold text-xs sm:text-sm text-foreground mb-2">AI Summary</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{doc.summary}</p>
                  </div>
                )}
                
                {/* AI Summary Generation Button */}
                {(!doc.summary || doc.summary === "Unable to generate summary") && doc.extracted_text && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                          {!doc.summary ? "No AI Summary" : "Failed Summary"}
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {!doc.summary ? "Generate an AI summary for this document" : "Retry AI summary generation"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateSummary(doc)}
                        disabled={isGeneratingSummary === doc.id}
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        {isGeneratingSummary === doc.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Summary
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDocument(doc)}
                    className="flex-1 sm:flex-none"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">View Details</span>
                    <span className="sm:hidden">View</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(doc.id)}
                    className="flex-1 sm:flex-none"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedDoc} onOpenChange={(open) => {
        if (!open) {
          if (pdfUrl && pdfUrl.startsWith('blob:')) {
            URL.revokeObjectURL(pdfUrl);
          }
          setPdfUrl(null);
          setSelectedDoc(null);
          setPageNumber(1);
          setNumPages(0);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedDoc?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedDoc?.file_name} • {selectedDoc && new Date(selectedDoc.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="original">Original Document</TabsTrigger>
              <TabsTrigger value="full-text">Extracted Text</TabsTrigger>
              <TabsTrigger value="metadata">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 overflow-auto flex-1">
              <ScrollArea className="h-[50vh] pr-4">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {selectedDoc && getStatusBadge(selectedDoc.status)}
                    {selectedDoc && getPIIBadge(selectedDoc.pii_status)}
                  </div>

                  {selectedDoc?.summary ? (
                    <div>
                      <h4 className="font-semibold text-sm text-foreground mb-2">AI Summary</h4>
                      <div className="bg-secondary/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedDoc.summary}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground">No summary available yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="original" className="mt-4 overflow-auto flex-1">
              {pdfUrl ? (
                <div className="space-y-4 pb-4">
                  <div className="flex items-center justify-between sticky top-0 bg-background z-10 pb-2 border-b">
                    <div className="flex items-center gap-2">
                      {fileType === 'application/pdf' && (
                        <>
                          <Button
                            onClick={() => setPageNumber(page => Math.max(1, page - 1))}
                            disabled={pageNumber <= 1}
                            size="sm"
                            variant="outline"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {pageNumber} of {numPages || '...'}
                          </span>
                          <Button
                            onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
                            disabled={pageNumber >= numPages}
                            size="sm"
                            variant="outline"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    <Button onClick={handleDownload} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download {fileType === 'text/plain' ? 'Text' : 'PDF'}
                    </Button>
                  </div>
                  <div className="flex justify-center bg-muted/30 p-4 rounded-lg">
                    {fileType === 'application/pdf' ? (
                      <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          </div>
                        }
                      >
                        <Page
                          pageNumber={pageNumber}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          className="shadow-lg"
                          width={Math.min(window.innerWidth * 0.7, 800)}
                        />
                      </Document>
                    ) : (
                      <div className="w-full max-w-4xl">
                        <div className="bg-background rounded-lg p-6 border">
                          <h3 className="text-lg font-semibold mb-4">Document Content</h3>
                          <div className="prose prose-sm max-w-none text-foreground">
                            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                              {selectedDoc?.extracted_text || 'Loading content...'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Loading document...</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="full-text" className="mt-4 overflow-auto flex-1">
              <ScrollArea className="h-[50vh] pr-4">
                {selectedDoc?.extracted_text ? (
                  <div className="bg-background rounded-lg p-8 border">
                    <div className="prose prose-sm max-w-none text-foreground">
                      {selectedDoc.extracted_text.split('\n').map((line, idx) => (
                        <p key={idx} className="mb-3 text-sm leading-relaxed">
                          {line || '\u00A0'}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-8 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {selectedDoc?.status === 'processing' 
                        ? 'Document is still being processed...' 
                        : 'No text extracted from this document.'}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="metadata" className="mt-4 overflow-auto flex-1">
              <ScrollArea className="h-[50vh] pr-4">
                <div className="grid gap-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-semibold text-foreground">Document ID:</span>
                      <p className="text-muted-foreground font-mono text-xs mt-1 break-all">{selectedDoc?.id}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">File Type:</span>
                      <p className="text-muted-foreground mt-1">{selectedDoc?.file_name.split('.').pop()?.toUpperCase()}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-semibold text-foreground">Upload Date:</span>
                      <p className="text-muted-foreground mt-1">
                        {selectedDoc && new Date(selectedDoc.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Status:</span>
                      <div className="mt-1">{selectedDoc && getStatusBadge(selectedDoc.status)}</div>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-foreground">PII Status:</span>
                    <div className="mt-1">{selectedDoc && getPIIBadge(selectedDoc.pii_status)}</div>
                  </div>

                  <div>
                    <span className="font-semibold text-foreground">File Name:</span>
                    <p className="text-muted-foreground mt-1 break-all">{selectedDoc?.file_name}</p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedDoc(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
