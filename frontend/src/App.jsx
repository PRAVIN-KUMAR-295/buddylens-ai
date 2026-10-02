import React, { useState, useEffect } from "react";
import { 
  BookOpen, Sparkles, HelpCircle, CheckCircle2, 
  Target, BarChart2, Activity, Cpu, Layers 
} from "lucide-react";

import { Dashboard } from "./components/Dashboard";
import { UploadNotes } from "./components/UploadNotes";
import { StudyWorkspace } from "./components/StudyWorkspace";
import { QuizMode } from "./components/QuizMode";
import { RevisionPlan } from "./components/RevisionPlan";
import { InsightsView } from "./components/InsightsView";
import { ActivityView } from "./components/ActivityView";

import { getDocuments, getInsights, getAiStatus, loadSampleNotes } from "./api";

export function App() {
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard", "upload", "workspace", "quiz", "plan", "insights", "activity"
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [insights, setInsights] = useState({ weak_topics: [] });
  const [aiStatus, setAiStatus] = useState(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [lastWeakTopics, setLastWeakTopics] = useState([]);

  const refreshData = async () => {
    try {
      const [docs, ins, status] = await Promise.all([
        getDocuments().catch(() => []),
        getInsights().catch(() => ({ weak_topics: [] })),
        getAiStatus().catch(() => null)
      ]);
      setDocuments(docs || []);
      setInsights(ins || { weak_topics: [] });
      setAiStatus(status);
      
      // Auto-select latest document if none selected
      if (!selectedDoc && docs && docs.length > 0) {
        setSelectedDoc(docs[0]);
      }
    } catch (e) {
      console.error("Data refresh failed", e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      const demoDoc = await loadSampleNotes();
      setSelectedDoc(demoDoc);
      await refreshData();
      setActiveTab("workspace");
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleDocumentReady = (doc) => {
    setSelectedDoc(doc);
    refreshData();
    setActiveTab("workspace");
  };

  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc);
    setActiveTab("workspace");
  };

  const handleQuizCompleted = (result) => {
    if (result.weak_topics) {
      setLastWeakTopics(result.weak_topics);
    }
    refreshData();
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="top-nav">
        <div className="brand" onClick={() => setActiveTab("dashboard")}>
          <Layers size={22} color="#818cf8" />
          <span>BuddyLens AI</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-links">
          <button 
            className={`nav-tab ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>

          <button 
            className={`nav-tab ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            Upload Notes
          </button>

          <button 
            className={`nav-tab ${activeTab === "workspace" ? "active" : ""}`}
            onClick={() => setActiveTab("workspace")}
          >
            Workspace
          </button>

          <button 
            className={`nav-tab ${activeTab === "quiz" ? "active" : ""}`}
            onClick={() => setActiveTab("quiz")}
          >
            Quiz Mode
          </button>

          <button 
            className={`nav-tab ${activeTab === "plan" ? "active" : ""}`}
            onClick={() => setActiveTab("plan")}
          >
            Revision Plan
          </button>

          <button 
            className={`nav-tab ${activeTab === "insights" ? "active" : ""}`}
            onClick={() => setActiveTab("insights")}
          >
            Insights
          </button>

          <button 
            className={`nav-tab ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            Activity
          </button>
        </nav>

        {/* AI Provider Status Indicator */}
        <div className="status-badge" title="Active AI provider powering reasoning and retrieval">
          <Cpu size={14} color="#818cf8" />
          <span>{aiStatus?.active_provider || "AI Engine Ready"}</span>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="main-content">
        {activeTab === "dashboard" && (
          <Dashboard 
            documents={documents}
            insights={insights}
            onSelectDoc={handleSelectDoc}
            onNavigate={setActiveTab}
            onLoadDemo={handleLoadDemo}
            loadingDemo={loadingDemo}
          />
        )}

        {activeTab === "upload" && (
          <UploadNotes 
            onDocumentReady={handleDocumentReady}
            onLoadDemo={handleLoadDemo}
            loadingDemo={loadingDemo}
          />
        )}

        {activeTab === "workspace" && (
          <StudyWorkspace 
            document={selectedDoc || documents[0]}
            onNavigateToQuiz={() => setActiveTab("quiz")}
            onNavigateToPlan={() => setActiveTab("plan")}
          />
        )}

        {activeTab === "quiz" && (
          <QuizMode 
            document={selectedDoc || documents[0]}
            onCompleteQuiz={handleQuizCompleted}
            onNavigateToPlan={() => setActiveTab("plan")}
          />
        )}

        {activeTab === "plan" && (
          <RevisionPlan 
            document={selectedDoc || documents[0]}
            weakTopics={lastWeakTopics.length > 0 ? lastWeakTopics : insights?.weak_topics?.map(w => w.topic) || []}
            onNavigateToWorkspace={() => setActiveTab("workspace")}
          />
        )}

        {activeTab === "insights" && (
          <InsightsView 
            insights={insights}
            onSelectDoc={handleSelectDoc}
            onNavigateToQuiz={() => setActiveTab("quiz")}
          />
        )}

        {activeTab === "activity" && (
          <ActivityView />
        )}
      </main>
    </div>
  );
}

export default App;
