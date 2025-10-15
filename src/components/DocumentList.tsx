import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Download, Eye, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Document {
  id: string;
  title: string;
  file_name: string;
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
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("legal_documents").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Document deleted",
        description: "The document has been removed from your library.",
      });

      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Your Documents</h2>
        <Badge variant="outline">{documents.length} documents</Badge>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {doc.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {doc.file_name} • {new Date(doc.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(doc.status)}
                    {getPIIBadge(doc.pii_status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {doc.summary && (
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-foreground mb-2">AI Summary</h4>
                    <p className="text-sm text-muted-foreground">{doc.summary}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(doc.id)}
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

      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedDoc?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedDoc?.file_name} • {selectedDoc && new Date(selectedDoc.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="overview" className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="full-text">Full Document</TabsTrigger>
              <TabsTrigger value="metadata">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
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

            <TabsContent value="full-text" className="mt-4">
              <ScrollArea className="h-[50vh] pr-4">
                {selectedDoc?.extracted_text ? (
                  <div className="bg-muted/30 rounded-lg p-6">
                    <p className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {selectedDoc.extracted_text}
                    </p>
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

            <TabsContent value="metadata" className="mt-4">
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
