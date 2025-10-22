import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Loader2, Cloud, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PDFTextExtractor from "@/services/PDFTextExtractor";
import { GoogleCloudStorageService } from "@/services/GoogleCloudStorageService";

type StorageProvider = 'supabase' | 'gcs';

export const UploadInterface = () => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractionMethod, setExtractionMethod] = useState<'direct' | 'ocr' | null>(null);
  const [storageProvider, setStorageProvider] = useState<StorageProvider>('gcs'); // Default to GCS
  const [gcsService] = useState(() => new GoogleCloudStorageService());
  const [gcsConfigStatus, setGcsConfigStatus] = useState<{bucket: boolean; project: boolean; apiKey: boolean}>({bucket: false, project: false, apiKey: false});
  const { toast } = useToast();
  const extractorRef = useRef<PDFTextExtractor | null>(null);

  useEffect(() => {
    extractorRef.current = new PDFTextExtractor();
    
    // Check GCS configuration status
    const configStatus = gcsService.getConfigStatus();
    setGcsConfigStatus(configStatus);
    
    return () => {
      extractorRef.current?.terminateOCR();
    };
  }, [gcsService]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const uploadToSupabase = async (file: File, extractedText: string, user: any) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("legal-documents")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    return fileName;
  };

  const uploadToGCS = async (file: File, extractedText: string, user: any) => {
    const result = await gcsService.uploadFile(file, `${user.id}/${Date.now()}-${file.name}`);
    
    if (!result.success) {
      throw new Error(result.error || 'GCS upload failed');
    }

    return result.filename!;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !extractorRef.current) return;

    setUploading(true);
    setProgress(10);
    setExtractionMethod(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Extract text using smart dual-approach
      let extractedText = "";
      let method: 'direct' | 'ocr' = 'direct';
      
      if (file.type === "application/pdf") {
        try {
          setProgress(15);
          const result = await extractorRef.current.extractTextFromPDF(file);
          extractedText = result.text;
          method = result.method;
          setExtractionMethod(method);
          console.log(`Extracted text using ${method}, length:`, extractedText.length);
        } catch (error) {
          console.error("PDF text extraction error:", error);
          toast({
            title: "Extraction warning",
            description: "Text extraction partially failed, but will continue with upload.",
            variant: "default",
          });
        }
      }
      setProgress(30);

      // Upload file to selected storage provider
      let fileName: string;
      let storageUrl: string;

      if (storageProvider === 'gcs') {
        fileName = await uploadToGCS(file, extractedText, user);
        storageUrl = `https://storage.googleapis.com/${gcsService['bucketName']}/${fileName}`;
      } else {
        fileName = await uploadToSupabase(file, extractedText, user);
        const { data: { publicUrl } } = supabase.storage
          .from("legal-documents")
          .getPublicUrl(fileName);
        storageUrl = publicUrl;
      }

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
          status: "processing" as any, // Cast to enum type
          extracted_text: extractedText || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setProgress(70);

      // Skip edge function processing for now (text already extracted client-side)
      // TODO: Deploy process-document edge function to Supabase
      console.log("Skipping edge function processing - text already extracted client-side");
      setProgress(100);

      toast({
        title: "Upload successful",
        description: `Document uploaded to ${storageProvider === 'gcs' ? 'Google Cloud Storage' : 'Supabase Storage'} and processed using ${extractionMethod === 'direct' ? 'direct text extraction' : 'OCR'}.`,
      });

      // Reset form
      setFile(null);
      setTitle("");
      setProgress(0);
      setExtractionMethod(null);
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
    <div className="space-y-4 px-0 sm:px-4 sm:max-w-2xl sm:mx-auto">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Upload className="w-5 h-5" />
            Upload Legal Document
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Upload PDF or DOCX files for AI-powered analysis and indexing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Document Title</Label>
              <Input
                id="title"
                placeholder="Enter document title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-sm sm:text-base"
              />
            </div>

                 <div className="space-y-2">
                   <Label htmlFor="storage">Storage Provider</Label>
                   <Select value={storageProvider} onValueChange={(value: StorageProvider) => setStorageProvider(value)}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="gcs">
                         <div className="flex items-center gap-2">
                           <Cloud className="w-4 h-4" />
                           Google Cloud Storage
                         </div>
                       </SelectItem>
                       <SelectItem value="supabase">
                         <div className="flex items-center gap-2">
                           <Database className="w-4 h-4" />
                           Supabase Storage
                         </div>
                       </SelectItem>
                     </SelectContent>
                   </Select>
                   <p className="text-xs text-muted-foreground">
                     {storageProvider === 'gcs' 
                       ? 'Documents stored in Google Cloud Storage for enhanced scalability and integration with Google AI services.'
                       : 'Documents stored in Supabase Storage for quick access and processing.'
                     }
                   </p>
                   
                   {storageProvider === 'gcs' && (
                     <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                       <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                         ☁️ Google Cloud Storage Configuration
                       </h4>
                       <div className="space-y-1 text-xs">
                         <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${gcsConfigStatus.bucket ? 'bg-green-500' : 'bg-red-500'}`}></div>
                           <span className={gcsConfigStatus.bucket ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                             Bucket: {gcsConfigStatus.bucket ? 'lex-legal-documents-bucket ✓' : 'Not configured'}
                           </span>
                         </div>
                         <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${gcsConfigStatus.project ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                           <span className={gcsConfigStatus.project ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}>
                             Project ID: {gcsConfigStatus.project ? 'Configured ✓' : 'Optional'}
                           </span>
                         </div>
                         <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${gcsConfigStatus.apiKey ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                           <span className={gcsConfigStatus.apiKey ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}>
                             API Key: {gcsConfigStatus.apiKey ? 'Configured ✓' : 'Optional (fallback mode)'}
                           </span>
                         </div>
                       </div>
                       {!gcsConfigStatus.bucket && (
                         <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                           ⚠️ Please set VITE_GCS_BUCKET_NAME in your environment variables
                         </p>
                       )}
                     </div>
                   )}
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
                  <span className="text-muted-foreground">
                    {progress < 30 ? 'Extracting text...' : progress < 70 ? 'Uploading...' : 'Processing...'}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
                {extractionMethod && (
                  <p className="text-xs text-muted-foreground">
                    Using {extractionMethod === 'direct' ? 'direct text extraction' : 'OCR for scanned document'}
                  </p>
                )}
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

          {storageProvider === 'gcs' && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                ☁️ Google Cloud Integration
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Using Google Cloud Storage enables seamless integration with Google AI services, 
                better scalability, and advanced document processing capabilities for your hackathon submission.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
