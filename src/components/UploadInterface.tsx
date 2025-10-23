import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UnifiedDocumentProcessor } from "@/services/UnifiedDocumentProcessor";

export const UploadInterface = () => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processor] = useState(() => new UnifiedDocumentProcessor());
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      processor.cleanup();
    };
  }, [processor]);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const result = await processor.processDocument(file, title, user.id, (currentProgress) => {
        setProgress(currentProgress);
      });

      toast({
        title: "Upload successful",
        description: `Document "${result.title}" processed and indexed.`,
      });

      setFile(null);
      setTitle("");
      setProgress(0);
    } catch (error: any) {
      console.error("Upload failed:", error);
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
    <div className="space-y-4 px-0 sm:px-4 sm:max-w-2xl sm:mx-auto">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Upload className="w-5 h-5" />
            Upload Legal Document
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Upload a new legal document to be processed, summarized by AI, and indexed for search.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="document-file" className="text-sm font-medium">Document File (PDF only)</Label>
              <Input
                id="document-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="text-sm sm:text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-title" className="text-sm font-medium">Document Title</Label>
              <Input
                id="document-title"
                type="text"
                placeholder="Enter document title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-sm sm:text-base"
                required
              />
            </div>
            <Progress value={progress} className="w-full" />
            <Button type="submit" className="w-full" disabled={!file || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading & Processing ({progress}%)
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadInterface;
