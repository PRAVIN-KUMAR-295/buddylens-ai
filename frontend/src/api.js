const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function getAiStatus() {
  const res = await fetch(`${API_BASE}/ai-status`);
  return res.json();
}

export async function uploadPdf(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Failed to upload PDF");
  }
  return res.json();
}

export async function pasteNotes(title, content) {
  const res = await fetch(`${API_BASE}/documents/paste`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, source_type: "paste" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Paste failed" }));
    throw new Error(err.detail || "Failed to process pasted notes");
  }
  return res.json();
}

export async function loadSampleNotes() {
  const res = await fetch(`${API_BASE}/documents/sample`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Failed to load demo notes");
  }
  return res.json();
}

export async function getDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  return res.json();
}

export async function getDocumentById(id) {
  const res = await fetch(`${API_BASE}/documents/${id}`);
  if (!res.ok) throw new Error("Document not found");
  return res.json();
}

export async function sendChatMessage(documentId, query, history = []) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_id: documentId,
      query,
      conversation_history: history,
    }),
  });
  if (!res.ok) throw new Error("Failed to get answer from study assistant");
  return res.json();
}

export async function summarizeDocument(documentId, mode = "concise") {
  const res = await fetch(`${API_BASE}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId, mode }),
  });
  if (!res.ok) throw new Error("Failed to generate summary");
  return res.json();
}

export async function generateQuiz(documentId, numQuestions = 4) {
  const res = await fetch(`${API_BASE}/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId, num_questions: numQuestions }),
  });
  if (!res.ok) throw new Error("Failed to generate quiz");
  return res.json();
}

export async function submitQuiz(quizId, documentId, answers) {
  const res = await fetch(`${API_BASE}/quiz/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quiz_id: quizId,
      document_id: documentId,
      answers,
    }),
  });
  if (!res.ok) throw new Error("Failed to submit quiz");
  return res.json();
}

export async function generateRevisionPlan(documentId, weakTopics = []) {
  const res = await fetch(`${API_BASE}/revision-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_id: documentId,
      weak_topics: weakTopics,
    }),
  });
  if (!res.ok) throw new Error("Failed to generate revision plan");
  return res.json();
}

export async function getActivityLog() {
  const res = await fetch(`${API_BASE}/activity`);
  return res.json();
}

export async function getInsights() {
  const res = await fetch(`${API_BASE}/insights`);
  return res.json();
}
