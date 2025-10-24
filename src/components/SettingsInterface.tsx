import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, SettingsService, ApiKeyStatus } from "@/services/SettingsService";
import { useTheme } from "@/providers/ThemeProvider";
import { 
  Settings as SettingsIcon, 
  Key, 
  Database, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Save,
  Trash2
} from "lucide-react";

export const SettingsInterface = () => {
  const [settings, setSettings] = useState<Settings>(SettingsService.getDefaultSettings());
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [useSystemKeys, setUseSystemKeys] = useState<Record<string, boolean>>({
    gemini: !!import.meta.env.VITE_GEMINI_API_KEY,
    courtListener: !!import.meta.env.VITE_COURT_LISTENER_API_KEY,
  });
  
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadSettings();
    checkApiKeyStatus();
  }, []);

  const loadSettings = () => {
    const loadedSettings = SettingsService.loadSettings();
    // Load API keys from secure storage
    loadedSettings.geminiApiKey = SettingsService.getApiKey('gemini');
    loadedSettings.elasticsearchPassword = SettingsService.getApiKey('elasticsearch');
    setSettings(loadedSettings);
    
    // Sync theme with context
    if (loadedSettings.theme !== theme) {
      setTheme(loadedSettings.theme);
    }
  };

  const checkApiKeyStatus = async () => {
    setLoading(true);
    try {
      const status = await SettingsService.checkApiKeyStatus();
      setApiKeyStatus(status);
    } catch (error) {
      console.error('Error checking API key status:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      SettingsService.saveSettings(settings);
      await checkApiKeyStatus();
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('settingsUpdated', { 
        detail: { settings } 
      }));
      
      toast({
        title: "Settings Saved",
        description: "Your configuration has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const clearApiKey = (type: 'gemini' | 'elasticsearch') => {
    SettingsService.clearApiKey(type);
    setSettings(prev => ({
      ...prev,
      [type === 'gemini' ? 'geminiApiKey' : 'elasticsearchPassword']: ''
    }));
    toast({
      title: "API Key Cleared",
      description: `${type} API key has been removed.`,
    });
  };

  const toggleApiKeyVisibility = (key: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleSystemKey = (key: 'gemini' | 'courtListener') => {
    const newUseSystemKeys = { ...useSystemKeys };
    newUseSystemKeys[key] = !newUseSystemKeys[key];
    setUseSystemKeys(newUseSystemKeys);

    // If switching to system key, clear the custom key
    if (newUseSystemKeys[key]) {
      if (key === 'gemini') {
        setSettings(prev => ({ ...prev, geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '' }));
      } else if (key === 'courtListener') {
        setSettings(prev => ({ ...prev, courtListenerApiKey: import.meta.env.VITE_COURT_LISTENER_API_KEY || '' }));
      }
    } else {
      // If switching to custom key, clear the field for user input
      if (key === 'gemini') {
        setSettings(prev => ({ ...prev, geminiApiKey: '' }));
      } else if (key === 'courtListener') {
        setSettings(prev => ({ ...prev, courtListenerApiKey: '' }));
      }
    }
  };

  const getStatusIcon = (configured: boolean, valid: boolean) => {
    if (!configured) return <XCircle className="w-4 h-4 text-gray-400" />;
    if (valid) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusText = (configured: boolean, valid: boolean) => {
    if (!configured) return "Not Configured";
    if (valid) return "Connected";
    return "Invalid";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure your API keys and preferences for Lex AI Advisor
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={checkApiKeyStatus}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            Save Settings
          </Button>
        </div>
      </div>

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Keys & Connections
          </CardTitle>
          <CardDescription>
            Configure your API keys for AI and search services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gemini AI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="gemini-key" className="text-base font-medium">
                Gemini AI API Key
              </Label>
              <div className="flex items-center gap-2">
                {apiKeyStatus && getStatusIcon(apiKeyStatus.gemini.configured, apiKeyStatus.gemini.valid)}
                <Badge variant={apiKeyStatus?.gemini.configured ? "default" : "secondary"}>
                  {apiKeyStatus ? getStatusText(apiKeyStatus.gemini.configured, apiKeyStatus.gemini.valid) : "Unknown"}
                </Badge>
              </div>
            </div>
            
            {/* System Key Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="gemini-system-key"
                checked={useSystemKeys.gemini}
                onCheckedChange={() => toggleSystemKey('gemini')}
              />
              <Label htmlFor="gemini-system-key" className="text-sm">
                {useSystemKeys.gemini ? 'Using system-provided key' : 'Use custom key'}
              </Label>
            </div>
            
            {!useSystemKeys.gemini && (
              <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  id="gemini-key"
                  type={showApiKeys.gemini ? "text" : "password"}
                  placeholder="Enter your Gemini API key..."
                  value={settings.geminiApiKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                  className="pr-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => toggleApiKeyVisibility('gemini')}
                >
                  {showApiKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {settings.geminiApiKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearApiKey('gemini')}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            )}
            
            {useSystemKeys.gemini && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ Using system-provided Gemini API key from environment variables
                </p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              Get your API key from{" "}
              <a 
                href="https://makersuite.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          <Separator />

          {/* Elasticsearch */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Elasticsearch Configuration</Label>
              <div className="flex items-center gap-2">
                {apiKeyStatus && getStatusIcon(apiKeyStatus.elasticsearch.configured, apiKeyStatus.elasticsearch.connected)}
                <Badge variant={apiKeyStatus?.elasticsearch.configured ? "default" : "secondary"}>
                  {apiKeyStatus ? getStatusText(apiKeyStatus.elasticsearch.configured, apiKeyStatus.elasticsearch.connected) : "Unknown"}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="elasticsearch-url">URL</Label>
                <Input
                  id="elasticsearch-url"
                  placeholder="http://localhost:9200"
                  value={settings.elasticsearchUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, elasticsearchUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="elasticsearch-username">Username (Optional)</Label>
                <Input
                  id="elasticsearch-username"
                  placeholder="elastic"
                  value={settings.elasticsearchUsername}
                  onChange={(e) => setSettings(prev => ({ ...prev, elasticsearchUsername: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="elasticsearch-password">Password (Optional)</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="elasticsearch-password"
                    type={showApiKeys.elasticsearch ? "text" : "password"}
                    placeholder="Enter password..."
                    value={settings.elasticsearchPassword}
                    onChange={(e) => setSettings(prev => ({ ...prev, elasticsearchPassword: e.target.value }))}
                    className="pr-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => toggleApiKeyVisibility('elasticsearch')}
                  >
                    {showApiKeys.elasticsearch ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {settings.elasticsearchPassword && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearApiKey('elasticsearch')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Supabase */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Supabase Configuration</Label>
              <div className="flex items-center gap-2">
                {apiKeyStatus && getStatusIcon(apiKeyStatus.supabase.configured, apiKeyStatus.supabase.connected)}
                <Badge variant={apiKeyStatus?.supabase.configured ? "default" : "secondary"}>
                  {apiKeyStatus ? getStatusText(apiKeyStatus.supabase.configured, apiKeyStatus.supabase.connected) : "Unknown"}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabase-url">Project URL</Label>
                <Input
                  id="supabase-url"
                  placeholder="https://your-project.supabase.co"
                  value={settings.supabaseUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, supabaseUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabase-key">Anon Key</Label>
                <Input
                  id="supabase-key"
                  type="password"
                  placeholder="Enter your Supabase anon key..."
                  value={settings.supabaseAnonKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, supabaseAnonKey: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Court Listener API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Court Listener API
          </CardTitle>
          <CardDescription>
            Configure Court Listener API key for legal document ingestion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="court-listener-key" className="text-base font-medium">
                Court Listener API Key
              </Label>
            </div>
            
            {/* System Key Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="court-listener-system-key"
                checked={useSystemKeys.courtListener}
                onCheckedChange={() => toggleSystemKey('courtListener')}
              />
              <Label htmlFor="court-listener-system-key" className="text-sm">
                {useSystemKeys.courtListener ? 'Using system-provided key' : 'Use custom key'}
              </Label>
            </div>
            
            {!useSystemKeys.courtListener && (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="court-listener-key"
                    type={showApiKeys.courtListener ? "text" : "password"}
                    placeholder="Enter your Court Listener API key..."
                    value={settings.courtListenerApiKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, courtListenerApiKey: e.target.value }))}
                    className="pr-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => toggleApiKeyVisibility('courtListener')}
                  >
                    {showApiKeys.courtListener ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {settings.courtListenerApiKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearApiKey('courtListener')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            
            {useSystemKeys.courtListener && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ Using system-provided Court Listener API key from environment variables
                </p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              Get your API key from{" "}
              <a 
                href="https://www.courtlistener.com/api/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Court Listener API
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Search Preferences
          </CardTitle>
          <CardDescription>
            Customize your search experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="default-search">Default Search Type</Label>
              <Select
                value={settings.searchPreferences.defaultSearchType}
                onValueChange={(value: 'ai' | 'basic' | 'hybrid') => 
                  setSettings(prev => ({
                    ...prev,
                    searchPreferences: { ...prev.searchPreferences, defaultSearchType: value }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">AI Enhanced</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="results-per-page">Results Per Page</Label>
              <Select
                value={settings.searchPreferences.resultsPerPage.toString()}
                onValueChange={(value) => 
                  setSettings(prev => ({
                    ...prev,
                    searchPreferences: { ...prev.searchPreferences, resultsPerPage: parseInt(value) }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Search Suggestions</Label>
                <p className="text-sm text-muted-foreground">
                  Show AI-powered search suggestions as you type
                </p>
              </div>
              <Switch
                checked={settings.searchPreferences.enableSuggestions}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({
                    ...prev,
                    searchPreferences: { ...prev.searchPreferences, enableSuggestions: checked }
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Search Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Track search patterns to improve results
                </p>
              </div>
              <Switch
                checked={settings.searchPreferences.enableAnalytics}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({
                    ...prev,
                    searchPreferences: { ...prev.searchPreferences, enableAnalytics: checked }
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            AI Preferences
          </CardTitle>
          <CardDescription>
            Configure AI analysis and enhancement features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Query Enhancement</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically improve search queries using AI
                </p>
              </div>
              <Switch
                checked={settings.aiPreferences.enableQueryEnhancement}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({
                    ...prev,
                    aiPreferences: { ...prev.aiPreferences, enableQueryEnhancement: checked }
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Document Analysis</Label>
                <p className="text-sm text-muted-foreground">
                  Extract legal entities and concepts from documents
                </p>
              </div>
              <Switch
                checked={settings.aiPreferences.enableDocumentAnalysis}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({
                    ...prev,
                    aiPreferences: { ...prev.aiPreferences, enableDocumentAnalysis: checked }
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Strategy Generation</Label>
                <p className="text-sm text-muted-foreground">
                  Generate legal strategies and recommendations
                </p>
              </div>
              <Switch
                checked={settings.aiPreferences.enableStrategyGeneration}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({
                    ...prev,
                    aiPreferences: { ...prev.aiPreferences, enableStrategyGeneration: checked }
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Confidence Threshold: {settings.aiPreferences.confidenceThreshold}</Label>
            <Slider
              value={[settings.aiPreferences.confidenceThreshold]}
              onValueChange={([value]) => 
                setSettings(prev => ({
                  ...prev,
                  aiPreferences: { ...prev.aiPreferences, confidenceThreshold: value }
                }))
              }
              max={1}
              min={0}
              step={0.1}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Minimum confidence level for AI-generated insights
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={theme}
              onValueChange={(value: 'light' | 'dark' | 'system') => {
                setTheme(value);
                setSettings(prev => ({ ...prev, theme: value }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose your preferred theme. System will follow your device's theme setting.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
