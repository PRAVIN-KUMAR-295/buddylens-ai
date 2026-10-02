import re
import math
from typing import List, Dict, Any
from collections import Counter

class TextChunker:
    @staticmethod
    def chunk_document(
        document_id: str,
        full_text: str,
        pages_data: List[Dict[str, Any]] = None,
        chunk_size: int = 800,
        chunk_overlap: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Chunks text into overlapping passages, preserving page references when available.
        """
        chunks = []
        chunk_index = 0

        if pages_data and len(pages_data) > 0:
            for page in pages_data:
                p_num = page["page_number"]
                text = page["text"].strip()
                if not text:
                    continue
                
                # Split page text into sentences/paragraphs
                paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
                current_chunk = []
                current_len = 0

                for para in paragraphs:
                    if current_len + len(para) > chunk_size and current_chunk:
                        chunk_str = "\n\n".join(current_chunk)
                        chunks.append({
                            "id": f"{document_id}_chunk_{chunk_index}",
                            "document_id": document_id,
                            "chunk_index": chunk_index,
                            "page_number": p_num,
                            "section_title": f"Page {p_num}",
                            "content": chunk_str,
                            "char_count": len(chunk_str)
                        })
                        chunk_index += 1
                        # Retain overlap if desired
                        current_chunk = [para]
                        current_len = len(para)
                    else:
                        current_chunk.append(para)
                        current_len += len(para)

                if current_chunk:
                    chunk_str = "\n\n".join(current_chunk)
                    chunks.append({
                        "id": f"{document_id}_chunk_{chunk_index}",
                        "document_id": document_id,
                        "chunk_index": chunk_index,
                        "page_number": p_num,
                        "section_title": f"Page {p_num}",
                        "content": chunk_str,
                        "char_count": len(chunk_str)
                    })
                    chunk_index += 1
        else:
            # Fallback for plain pasted text without page metadata
            paragraphs = [p.strip() for p in full_text.split("\n\n") if p.strip()]
            current_chunk = []
            current_len = 0
            
            for para in paragraphs:
                if current_len + len(para) > chunk_size and current_chunk:
                    chunk_str = "\n\n".join(current_chunk)
                    chunks.append({
                        "id": f"{document_id}_chunk_{chunk_index}",
                        "document_id": document_id,
                        "chunk_index": chunk_index,
                        "page_number": 1,
                        "section_title": f"Section {chunk_index + 1}",
                        "content": chunk_str,
                        "char_count": len(chunk_str)
                    })
                    chunk_index += 1
                    current_chunk = [para]
                    current_len = len(para)
                else:
                    current_chunk.append(para)
                    current_len += len(para)
                    
            if current_chunk:
                chunk_str = "\n\n".join(current_chunk)
                chunks.append({
                    "id": f"{document_id}_chunk_{chunk_index}",
                    "document_id": document_id,
                    "chunk_index": chunk_index,
                    "page_number": 1,
                    "section_title": f"Section {chunk_index + 1}",
                    "content": chunk_str,
                    "char_count": len(chunk_str)
                })
                chunk_index += 1

        # If chunks is still empty (e.g. short text), make 1 chunk
        if not chunks and full_text.strip():
            chunks.append({
                "id": f"{document_id}_chunk_0",
                "document_id": document_id,
                "chunk_index": 0,
                "page_number": 1,
                "section_title": "Full Note",
                "content": full_text.strip(),
                "char_count": len(full_text.strip())
            })

        return chunks


class BM25Retriever:
    """
    Lightweight, deterministic BM25 / TF-IDF style lexical retriever.
    Fast, requires zero heavyweight external model downloads, and runs flawlessly locally.
    """
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b

    @staticmethod
    def tokenize(text: str) -> List[str]:
        return [w.lower() for w in re.findall(r'\b[a-zA-Z0-9_]{2,}\b', text)]

    def score_chunks(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 4) -> List[Dict[str, Any]]:
        if not chunks:
            return []

        query_tokens = self.tokenize(query)
        if not query_tokens:
            return chunks[:top_k]

        N = len(chunks)
        tokenized_corpus = [self.tokenize(c["content"]) for c in chunks]
        doc_lens = [len(doc) for doc in tokenized_corpus]
        avgdl = sum(doc_lens) / (N or 1)

        # Document frequency (df) for each token
        df = Counter()
        for doc in tokenized_corpus:
            unique_tokens = set(doc)
            for t in unique_tokens:
                df[t] += 1

        scores = []
        for i, doc in enumerate(tokenized_corpus):
            doc_len = doc_lens[i]
            doc_counter = Counter(doc)
            score = 0.0

            for q_term in query_tokens:
                if q_term in doc_counter:
                    tf = doc_counter[q_term]
                    doc_freq = df[q_term]
                    # IDF formula
                    idf = math.log((N - doc_freq + 0.5) / (doc_freq + 0.5) + 1.0)
                    # BM25 term weighting
                    numerator = tf * (self.k1 + 1)
                    denominator = tf + self.k1 * (1 - self.b + self.b * (doc_len / (avgdl or 1)))
                    score += idf * (numerator / denominator)

            scores.append((score, chunks[i]))

        # Sort descending by score
        scores.sort(key=lambda x: x[0], reverse=True)
        
        # If all scores are zero, return the first top_k
        filtered = [chunk for score, chunk in scores if score > 0]
        if not filtered:
            return chunks[:top_k]
        return [chunk for score, chunk in scores[:top_k]]
