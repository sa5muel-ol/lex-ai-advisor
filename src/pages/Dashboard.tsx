import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Scale, Upload, Search, LogOut, FileText, Brain, Settings, Sun, Moon, Monitor, Database, RefreshCw, Trash2, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { SearchInterface } from "@/components/SearchInterface";
import { AIEnhancedSearchInterface } from "@/components/AIEnhancedSearchInterface";
import { UploadInterface } from "@/components/UploadInterface";
import { DocumentList } from "@/components/DocumentList";
import { SettingsInterface } from "@/components/SettingsInterface";
import { MassIngestionInterface } from "@/components/MassIngestionInterface";
import { SyncInterface } from "@/components/SyncInterface";
import GCPCleanupInterface from "@/components/GCPCleanupInterface";
import { useTheme } from "@/providers/ThemeProvider";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<"search" | "ai-search" | "upload" | "documents" | "mass-ingestion" | "sync" | "cleanup" | "settings">("ai-search");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="w-4 h-4" />;
      case 'dark': return <Moon className="w-4 h-4" />;
      case 'system': return <Monitor className="w-4 h-4" />;
      default: return <Sun className="w-4 h-4" />;
    }
  };

  const navigationItems = [
    { id: "ai-search" as const, label: "AI Search", icon: Brain },
    { id: "search" as const, label: "Elastic Search", icon: Search },
    { id: "upload" as const, label: "Upload", icon: Upload },
    { id: "documents" as const, label: "Documents", icon: FileText },
    { id: "mass-ingestion" as const, label: "Mass Ingestion", icon: Database },
    { id: "sync" as const, label: "Sync", icon: RefreshCw },
    { id: "cleanup" as const, label: "Cleanup", icon: Trash2 },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-4 py-3 sm:py-4 sm:container sm:mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary rounded-lg">
                <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <Logo size="md" />
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">AI-Powered Legal Research</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button onClick={toggleTheme} variant="outline" size="sm" title={`Current theme: ${theme}`} className="px-2 sm:px-3">
                {getThemeIcon()}
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm" className="px-2 sm:px-3">
                <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="border-b border-border bg-card sticky top-[73px] sm:top-[89px] z-10">
        <div className="px-4 sm:container sm:mx-auto">
          {/* Desktop Navigation */}
          <nav className="hidden sm:flex gap-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  onClick={() => handleTabChange(item.id)}
                  className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
                  data-active={activeTab === item.id}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          {/* Mobile Navigation */}
          <div className="sm:hidden py-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Menu className="w-4 h-4 mr-2" />
                  {navigationItems.find(item => item.id === activeTab)?.label || "Menu"}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <div className="flex flex-col space-y-4 mt-6">
                  <div className="flex items-center gap-2">
                    <Logo size="md" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    nomosanalytics helps you ingest, organize, search and summarize legal documents using
                    Elasticsearch and AI.
                  </p>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.id}
                        variant={activeTab === item.id ? "default" : "ghost"}
                        onClick={() => handleTabChange(item.id)}
                        className="justify-start"
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.label}
                      </Button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 sm:py-8 sm:container sm:mx-auto">
        {activeTab === "ai-search" && <AIEnhancedSearchInterface />}
        {activeTab === "search" && <SearchInterface />}
        {activeTab === "upload" && <UploadInterface />}
        {activeTab === "documents" && <DocumentList />}
        {activeTab === "mass-ingestion" && <MassIngestionInterface />}
        {activeTab === "sync" && <SyncInterface />}
        {activeTab === "cleanup" && <GCPCleanupInterface />}
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
