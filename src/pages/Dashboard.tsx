import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Scale, Upload, Search, LogOut, FileText, Brain, Settings, Sun, Moon, Monitor } from "lucide-react";
import { SearchInterface } from "@/components/SearchInterface";
import { AIEnhancedSearchInterface } from "@/components/AIEnhancedSearchInterface";
import { UploadInterface } from "@/components/UploadInterface";
import { DocumentList } from "@/components/DocumentList";
import { SettingsInterface } from "@/components/SettingsInterface";
import { useTheme } from "@/providers/ThemeProvider";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<"search" | "ai-search" | "upload" | "documents" | "settings">("ai-search");
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="w-4 h-4" />;
      case 'dark': return <Moon className="w-4 h-4" />;
      case 'system': return <Monitor className="w-4 h-4" />;
      default: return <Sun className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Scale className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">LegalSearch AI</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Legal Research</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={toggleTheme} variant="outline" size="sm" title={`Current theme: ${theme}`}>
                {getThemeIcon()}
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1">
            <Button
              variant={activeTab === "ai-search" ? "default" : "ghost"}
              onClick={() => setActiveTab("ai-search")}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={activeTab === "ai-search"}
            >
              <Brain className="w-4 h-4 mr-2" />
              AI Search
            </Button>
            <Button
              variant={activeTab === "search" ? "default" : "ghost"}
              onClick={() => setActiveTab("search")}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={activeTab === "search"}
            >
              <Search className="w-4 h-4 mr-2" />
              Basic Search
            </Button>
            <Button
              variant={activeTab === "upload" ? "default" : "ghost"}
              onClick={() => setActiveTab("upload")}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={activeTab === "upload"}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <Button
              variant={activeTab === "documents" ? "default" : "ghost"}
              onClick={() => setActiveTab("documents")}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={activeTab === "documents"}
            >
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </Button>
            <Button
              variant={activeTab === "settings" ? "default" : "ghost"}
              onClick={() => setActiveTab("settings")}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={activeTab === "settings"}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === "ai-search" && <AIEnhancedSearchInterface />}
        {activeTab === "search" && <SearchInterface />}
        {activeTab === "upload" && <UploadInterface />}
        {activeTab === "documents" && <DocumentList />}
        {activeTab === "settings" && <SettingsInterface />}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <p className="text-sm text-warning-foreground font-semibold">⚖️ Legal Disclaimer</p>
            <p className="text-sm text-muted-foreground mt-2">
              This AI-powered tool provides suggestions and analysis for informational purposes only. 
              It does not constitute legal advice. Always consult with a licensed attorney for legal matters. 
              No guarantee of outcomes or success is provided.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
