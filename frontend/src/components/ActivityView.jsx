import React, { useState, useEffect } from "react";
import { Activity as ActivityIcon, UploadCloud, MessageSquare, CheckCircle2, Target, Sparkles } from "lucide-react";
import { getActivityLog } from "../api";

export function ActivityView() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivityLog()
      .then((data) => setActivities(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getActionIcon = (type) => {
    switch (type) {
      case "upload": return <UploadCloud size={16} color="#818cf8" />;
      case "chat": return <MessageSquare size={16} color="#38bdf8" />;
      case "quiz_generated": return <Sparkles size={16} color="#f59e0b" />;
      case "quiz_completed": return <CheckCircle2 size={16} color="#10b981" />;
      case "revision_plan": return <Target size={16} color="#ec4899" />;
      default: return <ActivityIcon size={16} color="#94a3b8" />;
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " • " + date.toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
          Chronological Activity Log
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Every study action, query, quiz attempt, and plan generated in BuddyLens AI.
        </p>
      </div>

      <div className="glass-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
            Loading activity history...
          </div>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
            No activities recorded yet. Start by uploading notes or taking a quiz.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {activities.map((act) => (
              <div 
                key={act.id}
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--border-color)"
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: "8px", background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {getActionIcon(act.action_type)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-main)" }}>
                      {act.title}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                      {formatTime(act.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
                    {act.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
