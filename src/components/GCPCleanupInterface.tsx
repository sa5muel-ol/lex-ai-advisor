import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, FileText, File, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GCPCleanupService } from '@/services/GCPCleanupService';

export default function GCPCleanupInterface() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const cleanupService = new GCPCleanupService();
      const analysisResult = await cleanupService.analyzeFiles();
      setAnalysis(analysisResult);
      
      toast({
        title: "Analysis Complete",
        description: `Found ${analysisResult.totalFiles} total files in GCS`,
      });
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!analysis) return;
    
    setLoading(true);
    try {
      const cleanupService = new GCPCleanupService();
      const result = await cleanupService.deletePlaceholderFiles();
      setCleanupResult(result);
      
      toast({
        title: "Cleanup Complete",
        description: `Deleted ${result.deleted} placeholder files`,
      });
      
      // Refresh analysis
      await handleAnalyze();
    } catch (error: any) {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            GCP Cleanup Service
          </CardTitle>
          <CardDescription>
            Analyze and clean up placeholder files in your Google Cloud Storage bucket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyze} 
              disabled={loading}
              variant="outline"
            >
              Analyze Files
            </Button>
            <Button 
              onClick={handleCleanup} 
              disabled={loading || !analysis}
              variant="destructive"
            >
              Delete Placeholders
            </Button>
          </div>

          {analysis && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analysis.totalFiles}</div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analysis.pdfFiles}</div>
                <div className="text-sm text-muted-foreground">PDF Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{analysis.txtFiles}</div>
                <div className="text-sm text-muted-foreground">TXT Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analysis.placeholderFiles}</div>
                <div className="text-sm text-muted-foreground">Placeholders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{analysis.realFiles}</div>
                <div className="text-sm text-muted-foreground">Real TXT</div>
              </div>
            </div>
          )}

          {cleanupResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Cleanup completed: {cleanupResult.deleted} placeholder files deleted.
                {cleanupResult.errors.length > 0 && (
                  <div className="mt-2">
                    <strong>Errors:</strong>
                    <ul className="list-disc list-inside text-sm">
                      {cleanupResult.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>What this does:</strong>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Analyzes all files in your GCS bucket</li>
                <li>Identifies placeholder TXT files created during mass ingestion</li>
                <li>Deletes placeholder files to clean up your storage</li>
                <li>Keeps real PDF files and any legitimate TXT files</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
