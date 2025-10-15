import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import getTextFromPDF from "react-pdftotext";

export const UploadInterface = () => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setProgress(10);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Extract text from PDF using react-pdftotext
      let extractedText = "";
      if (file.type === "application/pdf") {
        try {
          extractedText = await getTextFromPDF(file);
          console.log("Extracted text length:", extractedText.length);
        } catch (error) {
          console.error("PDF text extraction error:", error);
        }
      }
      setProgress(20);

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      setProgress(30);

      const { error: uploadError } = await supabase.storage
        .from("legal-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      setProgress(50);

      // Create database record
      const { data: document, error: dbError } = await supabase
        .from("legal_documents")
        .insert({
          user_id: user.id,
          title,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          status: "processing",
          extracted_text: extractedText || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setProgress(70);

      // Process document via edge function
      const { error: processError } = await supabase.functions.invoke("process-document", {
        body: { documentId: document.id },
      });

      if (processError) throw processError;
      setProgress(100);

      toast({
        title: "Upload successful",
        description: "Your document is being processed and will be searchable soon.",
      });

      // Reset form
      setFile(null);
      setTitle("");
      setProgress(0);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Legal Document
          </CardTitle>
          <CardDescription>
            Upload PDF or DOCX files for AI-powered analysis and indexing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                placeholder="Enter document title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Document File</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  id="file"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file" className="cursor-pointer">
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <FileText className="w-8 h-8" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to select or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOCX, or TXT (max 20MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processing...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!file || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading & Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 bg-info/10 border border-info/20 rounded-lg p-4">
            <p className="text-sm font-semibold text-info-foreground mb-2">
              🔒 Privacy & PII Detection
            </p>
            <p className="text-xs text-muted-foreground">
              All uploaded documents are scanned for personally identifiable information (PII). 
              Sensitive data can be automatically redacted before indexing. Your documents are 
              stored securely and accessible only to you.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
