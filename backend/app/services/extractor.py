import io
import re
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader

class TextExtractor:
    @staticmethod
    def extract_from_pdf_bytes(pdf_bytes: bytes) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Extracts text from PDF bytes page by page.
        Returns:
            full_text: concatenated string
            pages: list of dicts with page_number and text
        """
        stream = io.BytesIO(pdf_bytes)
        reader = PdfReader(stream)
        
        pages_data = []
        full_text_list = []
        
        total_pages = len(reader.pages)
        if total_pages == 0:
            raise ValueError("The PDF document has no pages.")
            
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            # Clean control chars & normalize whitespace
            page_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]', '', page_text)
            page_text = page_text.strip()
            
            pages_data.append({
                "page_number": i + 1,
                "text": page_text
            })
            if page_text:
                full_text_list.append(f"--- [Page {i + 1}] ---\n" + page_text)
                
        full_text = "\n\n".join(full_text_list).strip()
        
        # Check if PDF might be scanned/image-only (very low character count relative to page count)
        if len(full_text) < 30:
            raise ValueError(
                "Could not extract readable text from this PDF. It may be scanned or image-only without an embedded text layer. Please copy & paste the text directly into BuddyLens AI."
            )
            
        return full_text, pages_data

    @staticmethod
    def sanitize_text(text: str) -> str:
        """Sanitizes text by stripping null bytes and excessive whitespace."""
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]', '', text)
        cleaned = re.sub(r'\r\n', '\n', cleaned)
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
        return cleaned.strip()
