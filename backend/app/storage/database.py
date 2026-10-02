import sqlite3
import json
import os
from typing import List, Optional, Dict, Any
from datetime import datetime

class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Documents table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                source_type TEXT NOT NULL,
                content TEXT NOT NULL,
                char_count INTEGER NOT NULL,
                word_count INTEGER NOT NULL,
                chunk_count INTEGER NOT NULL,
                summary TEXT,
                topics TEXT,
                created_at TEXT NOT NULL
            );
            """)

            # Document Chunks table for retrieval
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                page_number INTEGER,
                section_title TEXT,
                content TEXT NOT NULL,
                char_count INTEGER NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
            );
            """)

            # Quizzes table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS quizzes (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                questions_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
            );
            """)

            # Quiz Attempts / Submissions table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_attempts (
                id TEXT PRIMARY KEY,
                quiz_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                weak_topics TEXT NOT NULL,
                evaluations_json TEXT NOT NULL,
                completed_at TEXT NOT NULL
            );
            """)

            # Activities table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id TEXT PRIMARY KEY,
                action_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                document_id TEXT,
                metadata_json TEXT,
                timestamp TEXT NOT NULL
            );
            """)

            # Weak Topics Aggregation table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS weak_topics (
                topic TEXT PRIMARY KEY,
                mistake_count INTEGER NOT NULL,
                last_missed_at TEXT NOT NULL
            );
            """)

            conn.commit()

    # Document operations
    def save_document(self, doc_data: Dict[str, Any], chunks: List[Dict[str, Any]]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO documents (id, title, source_type, content, char_count, word_count, chunk_count, summary, topics, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_data["id"],
                doc_data["title"],
                doc_data["source_type"],
                doc_data["content"],
                doc_data["char_count"],
                doc_data["word_count"],
                len(chunks),
                doc_data.get("summary"),
                json.dumps(doc_data.get("topics", [])),
                doc_data["created_at"]
            ))

            cursor.execute("DELETE FROM document_chunks WHERE document_id = ?", (doc_data["id"],))
            for chunk in chunks:
                cursor.execute("""
                INSERT INTO document_chunks (id, document_id, chunk_index, page_number, section_title, content, char_count)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    chunk["id"],
                    chunk["document_id"],
                    chunk["chunk_index"],
                    chunk.get("page_number"),
                    chunk.get("section_title"),
                    chunk["content"],
                    chunk["char_count"]
                ))
            conn.commit()

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
            row = cursor.fetchone()
            if not row:
                return None
            data = dict(row)
            data["topics"] = json.loads(data["topics"]) if data["topics"] else []
            return data

    def list_documents(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documents ORDER BY created_at DESC")
            rows = cursor.fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["topics"] = json.loads(d["topics"]) if d["topics"] else []
                results.append(d)
            return results

    def get_document_chunks(self, doc_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC", (doc_id,))
            return [dict(r) for r in cursor.fetchall()]

    def update_document_summary(self, doc_id: str, summary: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE documents SET summary = ? WHERE id = ?", (summary, doc_id))
            conn.commit()

    # Quiz operations
    def save_quiz(self, quiz_id: str, doc_id: str, questions: List[Dict[str, Any]]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO quizzes (id, document_id, questions_json, created_at)
            VALUES (?, ?, ?, ?)
            """, (quiz_id, doc_id, json.dumps(questions), datetime.utcnow().isoformat()))
            conn.commit()

    def get_quiz(self, quiz_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
            row = cursor.fetchone()
            if not row:
                return None
            data = dict(row)
            data["questions"] = json.loads(data["questions_json"])
            return data

    def save_quiz_attempt(self, attempt_id: str, quiz_id: str, doc_id: str, score: int, total_questions: int, weak_topics: List[str], evaluations: List[Dict[str, Any]]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO quiz_attempts (id, quiz_id, document_id, score, total_questions, weak_topics, evaluations_json, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                attempt_id,
                quiz_id,
                doc_id,
                score,
                total_questions,
                json.dumps(weak_topics),
                json.dumps(evaluations),
                datetime.utcnow().isoformat()
            ))

            for topic in weak_topics:
                cursor.execute("""
                INSERT INTO weak_topics (topic, mistake_count, last_missed_at)
                VALUES (?, 1, ?)
                ON CONFLICT(topic) DO UPDATE SET
                    mistake_count = mistake_count + 1,
                    last_missed_at = excluded.last_missed_at
                """, (topic, datetime.utcnow().isoformat()))
            conn.commit()

    # Activity Logging
    def log_activity(self, activity_id: str, action_type: str, title: str, description: str, doc_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO activities (id, action_type, title, description, document_id, metadata_json, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                activity_id,
                action_type,
                title,
                description,
                doc_id,
                json.dumps(metadata or {}),
                datetime.utcnow().isoformat()
            ))
            conn.commit()

    def get_activities(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM activities ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["metadata"] = json.loads(d["metadata_json"]) if d["metadata_json"] else {}
                results.append(d)
            return results

    # Insights
    def get_insights(self) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM documents")
            total_docs = cursor.fetchone()["count"]

            cursor.execute("SELECT COUNT(*) as count FROM activities WHERE action_type = 'chat'")
            questions_asked = cursor.fetchone()["count"]

            cursor.execute("SELECT COUNT(*) as count, AVG(score * 100.0 / total_questions) as avg_score FROM quiz_attempts")
            quiz_row = cursor.fetchone()
            quizzes_completed = quiz_row["count"] or 0
            avg_quiz_score = round(quiz_row["avg_score"] or 0.0, 1)

            cursor.execute("SELECT topic, mistake_count FROM weak_topics ORDER BY mistake_count DESC LIMIT 10")
            weak_topics = [dict(r) for r in cursor.fetchall()]

            return {
                "total_documents": total_docs,
                "questions_asked": questions_asked,
                "quizzes_completed": quizzes_completed,
                "average_quiz_score": avg_quiz_score,
                "weak_topics": weak_topics
            }
