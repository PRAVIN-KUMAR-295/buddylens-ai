import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, 
  RotateCcw, Sparkles, Award, FileQuestion 
} from "lucide-react";
import { generateQuiz, submitQuiz } from "../api";

export function QuizMode({ document, onCompleteQuiz, onNavigateToPlan }) {
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const handleGenerateQuiz = async () => {
    if (!document) return;
    setLoading(true);
    setError("");
    setResults(null);
    setSelectedAnswers({});
    try {
      const res = await generateQuiz(document.id, 4);
      setQuizData(res);
    } catch (err) {
      setError(err.message || "Failed to generate quiz questions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (document && !quizData && !loading) {
      handleGenerateQuiz();
    }
  }, [document?.id]);

  const handleSelectOption = (questionId, optionIdx) => {
    if (results) return; // Prevent changing after submission
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: optionIdx
    });
  };

  const handleSubmit = async () => {
    if (!quizData || submitting) return;
    setSubmitting(true);
    setError("");

    const formattedAnswers = quizData.questions.map(q => ({
      question_id: q.id,
      selected_option_index: selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : -1
    }));

    try {
      const res = await submitQuiz(quizData.quiz_id, document.id, formattedAnswers);
      setResults(res);
      if (onCompleteQuiz) onCompleteQuiz(res);
    } catch (err) {
      setError(err.message || "Failed to submit answers.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!document) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <p style={{ color: "var(--text-muted)" }}>Please upload or select notes first to generate a quiz.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Quiz Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            Active Recall Quiz
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Testing notes from: <strong style={{ color: "var(--text-main)" }}>{document.title}</strong>
          </p>
        </div>
        <div>
          <button 
            className="btn-secondary" 
            onClick={handleGenerateQuiz} 
            disabled={loading || submitting}
            style={{ fontSize: "0.85rem" }}
          >
            <RotateCcw size={15} /> Regenerate Questions
          </button>
        </div>
      </div>

      {loading && (
        <div className="glass-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <Sparkles size={36} color="#818cf8" style={{ margin: "0 auto 1rem", animation: "spin 2s linear infinite" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Synthesizing Exam Questions...</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Extracting core definitions and constructing 4-option multiple choice questions.
          </p>
        </div>
      )}

      {error && (
        <div style={{ padding: "1rem", borderRadius: "8px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fb7185", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Results Banner */}
      {results && (
        <div className="glass-card" style={{ marginBottom: "1.5rem", background: results.percentage >= 70 ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)", borderColor: results.percentage >= 70 ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: results.percentage >= 70 ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Award size={28} color={results.percentage >= 70 ? "#34d399" : "#fb7185"} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                  Score: {results.score} / {results.total_questions} ({results.percentage}%)
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {results.percentage >= 75 ? "Strong retention on core principles!" : "Found revision blind spots. Review weak areas below."}
                </p>
              </div>
            </div>

            {results.weak_topics && results.weak_topics.length > 0 && (
              <button className="btn-primary" onClick={onNavigateToPlan}>
                Build Plan for Weak Topics <ArrowRight size={15} />
              </button>
            )}
          </div>

          {results.weak_topics && results.weak_topics.length > 0 && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#fca5a5", marginBottom: "0.4rem" }}>
                Missed Topics:
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {results.weak_topics.map((t, idx) => (
                  <span key={idx} style={{ padding: "0.25rem 0.6rem", borderRadius: "9999px", background: "rgba(244,63,94,0.2)", color: "#f87171", fontSize: "0.8rem", fontWeight: 600 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Questions List */}
      {quizData && !loading && (
        <div>
          {quizData.questions.map((q, qIndex) => {
            const evalItem = results?.evaluations?.find(e => e.question_id === q.id);
            const userChoice = selectedAnswers[q.id];

            return (
              <div key={q.id} className="quiz-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase" }}>
                    Question {qIndex + 1} of {quizData.questions.length} • {q.topic}
                  </span>
                  {evalItem && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", fontWeight: 600, color: evalItem.is_correct ? "#34d399" : "#fb7185" }}>
                      {evalItem.is_correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {evalItem.is_correct ? "Correct" : "Incorrect"}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "1rem", lineHeight: 1.4 }}>
                  {q.question}
                </h3>

                {/* Options */}
                <div>
                  {q.options.map((opt, optIndex) => {
                    let optionClass = "quiz-option";
                    if (userChoice === optIndex) optionClass += " selected";
                    
                    if (evalItem) {
                      if (optIndex === q.correct_option_index) {
                        optionClass += " correct";
                      } else if (userChoice === optIndex && !evalItem.is_correct) {
                        optionClass += " incorrect";
                      }
                    }

                    return (
                      <div 
                        key={optIndex} 
                        className={optionClass}
                        onClick={() => handleSelectOption(q.id, optIndex)}
                      >
                        <div style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid currentColor", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                          {String.fromCharCode(65 + optIndex)}
                        </div>
                        <div style={{ flex: 1 }}>{opt}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation feedback */}
                {evalItem && (
                  <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: "8px", background: "rgba(0,0,0,0.25)", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--text-main)" }}>Explanation: </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {!results && (
            <div style={{ textAlign: "right", marginTop: "1rem", marginBottom: "2rem" }}>
              <button 
                className="btn-primary" 
                onClick={handleSubmit} 
                disabled={submitting || Object.keys(selectedAnswers).length === 0}
                style={{ padding: "0.75rem 1.75rem", fontSize: "0.95rem" }}
              >
                {submitting ? "Evaluating..." : `Submit Quiz (${Object.keys(selectedAnswers).length}/${quizData.questions.length} answered)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
