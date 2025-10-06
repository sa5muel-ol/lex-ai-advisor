import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Scale, Upload, Search, LogOut, FileText } from "lucide-react";
import { SearchInterface } from "@/components/SearchInterface";
import { UploadInterface } from "@/components/UploadInterface";
import { DocumentList } from "@/components/DocumentList";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<"search" | "upload" | "documents">("search");
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1">
            <Button
              variant={activeTab === "search" ? "default" : "ghost"}
              onClick={() => setActiveTab("search")}
              className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
              data-active={activeTab === "search"}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
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
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === "search" && <SearchInterface />}
        {activeTab === "upload" && <UploadInterface />}
        {activeTab === "documents" && <DocumentList />}
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
