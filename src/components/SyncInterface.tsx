import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Database, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GCPMetadataSyncService, SyncResult } from '@/services/GCPMetadataSyncService';

export const SyncInterface = () => {
  const [syncStatus, setSyncStatus] = useState<{
    gcpFiles: number;
    supabaseRecords: number;
    syncIssues: number;
  }>({ gcpFiles: 0, supabaseRecords: 0, syncIssues: 0 });
  
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const { toast } = useToast();

  const syncService = new GCPMetadataSyncService();

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    setLoading(true);
    try {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading sync status:', error);
      toast({
        title: "Error",
        description: "Failed to load sync status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setProgress(0);
    setSyncResult(null);

    try {
      toast({
        title: "Sync Started",
        description: "Syncing GCP files to Supabase metadata...",
      });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await syncService.syncGCPToSupabase();
      
      clearInterval(progressInterval);
      setProgress(100);
      setSyncResult(result);

      if (result.success > 0) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${result.success} documents. ${result.failed > 0 ? `${result.failed} failed.` : ''}`,
        });
      } else if (result.failed > 0) {
        toast({
          title: "Sync Failed",
          description: `Failed to sync ${result.failed} documents. Check console for details.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync Complete",
          description: "All documents are already synced.",
        });
      }

      // Reload sync status
      await loadSyncStatus();

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Error",
        description: `Sync failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const getStatusIcon = () => {
    if (syncStatus.syncIssues === 0) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (syncStatus.syncIssues < 5) {
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusMessage = () => {
    if (syncStatus.syncIssues === 0) {
      return "All documents are synced";
    } else if (syncStatus.syncIssues === 1) {
      return "1 document needs syncing";
    } else {
      return `${syncStatus.syncIssues} documents need syncing`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            GCP to Supabase Sync
          </CardTitle>
          <CardDescription>
            Sync metadata from Google Cloud Storage files to Supabase database with AI summaries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sync Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">GCP Files</p>
                    <p className="text-2xl font-bold">{syncStatus.gcpFiles}</p>
                  </div>
                  <Database className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Supabase Records</p>
                    <p className="text-2xl font-bold">{syncStatus.supabaseRecords}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sync Issues</p>
                    <p className="text-2xl font-bold">{syncStatus.syncIssues}</p>
                  </div>
                  {getStatusIcon()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Status:</strong> {getStatusMessage()}
              {syncStatus.syncIssues > 0 && (
                <span className="block mt-1 text-sm">
                  Some GCP files don't have corresponding Supabase metadata records. 
                  Run sync to create missing records with AI-generated summaries.
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Sync Progress */}
          {syncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Syncing documents...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Sync Result */}
          {syncResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Sync Complete:</strong> {syncResult.success} successful, {syncResult.failed} failed
                {syncResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">View Errors</summary>
                    <ul className="mt-1 text-xs space-y-1">
                      {syncResult.errors.map((error, index) => (
                        <li key={index} className="text-red-600">• {error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSync}
              disabled={syncing || loading}
              className="flex-1"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync GCP to Supabase
                </>
              )}
            </Button>
            
            <Button
              onClick={loadSyncStatus}
              disabled={loading || syncing}
              variant="outline"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>What this does:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Finds all PDF files in your GCP bucket</li>
              <li>Downloads and extracts text from each PDF</li>
              <li>Generates AI summaries using Gemini</li>
              <li>Creates Supabase metadata records</li>
              <li>Skips files that already have records</li>
            </ul>
            <p className="text-xs mt-3 p-2 bg-muted rounded">
              <strong>Note:</strong> This process may take several minutes depending on the number of files. 
              Each file is processed individually to avoid rate limits.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};