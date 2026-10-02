from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional, List
import uuid
from datetime import datetime

from app.models.schemas import DocumentResponse, DocumentCreate
from app.services.extractor import TextExtractor
from app.services.chunker import TextChunker
from app.core.config import settings
from app.storage.database import Database

router = APIRouter(prefix="/documents", tags=["documents"])
db = Database(settings.DATABASE_URL.replace("sqlite:///", ""))

SAMPLE_OS_NOTES = """Operating Systems: Memory Management & Virtual Memory

1. Introduction to Memory Management
Memory management is the functionality of an operating system which handles or manages primary memory and moves processes back and forth between main memory and disk during execution. Memory management keeps track of each and every memory location, regardless of whether it is allocated to some process or it is free.

2. Paging and Page Tables
Paging is a storage mechanism used by OS to retrieve processes from the secondary storage into the main memory in the form of pages. 
The main idea behind the paging is to divide the physical memory into fixed-size blocks called page frames and divide the logical address space into blocks of the same size called pages.
- Page: A fixed-sized logical memory block.
- Frame: A fixed-sized physical memory block.
- Page Table: A data structure used by a virtual memory system in an operating system to store the mapping between logical addresses and physical addresses.

3. Virtual Memory and Demand Paging
Virtual memory is a memory management technique that allows the execution of processes that are not completely in memory. One major advantage of this scheme is that programs can be larger than physical memory.
Demand paging is a paging system with swapping. Pages are only loaded when they are demanded during program execution (lazy swapper).

4. Page Faults and Handling
A page fault is an interrupt that occurs when a software program attempts to access a block of memory that is not currently stored in physical RAM.
Page Fault Handling Steps:
1. The hardware traps to the kernel.
2. The OS checks the internal page table to determine if the access was valid or invalid.
3. If invalid, the process is terminated (Segmentation fault).
4. If valid but not in memory, the OS finds a free frame.
5. A disk operation is scheduled to read the page into the allocated frame.
6. When the I/O completes, the page table is updated, and the instruction is restarted.

5. Page Replacement Algorithms
When memory is full, an existing page must be swapped out to disk:
- FIFO (First-In, First-Out): Replaces the oldest page. Suffers from Belady's Anomaly (increasing frames can increase page faults).
- Optimal (OPT): Replaces the page that will not be used for the longest period of time. Theoretically optimal, but cannot be implemented because it requires future knowledge.
- LRU (Least Recently Used): Replaces the page that has not been used for the longest period of time. Approximates OPT and does not suffer from Belady's Anomaly.

6. Thrashing
Thrashing occurs when a computer's virtual memory subsystem is in a constant state of paging, rapidly exchanging data in memory for data on disk, to the exclusion of most application-level processing. This occurs when the sum of working sets of all processes exceeds physical memory, causing high page fault rates and near-zero CPU utilization.
"""

def extract_topics_from_text(text: str) -> List[str]:
    # Simple extraction of headers or major keywords
    topics = []
    lines = text.split("\n")
    for line in lines:
        line = line.strip()
        if line.startswith("#") or (len(line) > 3 and line[0].isdigit() and "." in line[:3]):
            clean_title = line.lstrip("#0123456789. ").strip()
            if clean_title and len(clean_title) < 50:
                topics.append(clean_title)
    if not topics:
        topics = ["Memory Management", "Paging & Frames", "Virtual Memory", "Page Faults", "Replacement Algorithms"]
    return topics[:6]

@router.post("/upload", response_model=DocumentResponse)
async def upload_pdf(file: UploadFile = File(...)):
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for file upload. For other text, use 'Paste Notes'.")

    # Read content with size check
    pdf_bytes = await file.read()
    if len(pdf_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB."
        )

    try:
        full_text, pages_data = TextExtractor.extract_from_pdf_bytes(pdf_bytes)
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    doc_id = str(uuid.uuid4())
    sanitized = TextExtractor.sanitize_text(full_text)
    chunks = TextChunker.chunk_document(doc_id, sanitized, pages_data)
    topics = extract_topics_from_text(sanitized)

    words = sanitized.split()
    doc_data = {
        "id": doc_id,
        "title": file.filename,
        "source_type": "pdf",
        "content": sanitized,
        "char_count": len(sanitized),
        "word_count": len(words),
        "topics": topics,
        "created_at": datetime.utcnow().isoformat()
    }

    db.save_document(doc_data, chunks)
    db.log_activity(
        activity_id=str(uuid.uuid4()),
        action_type="upload",
        title=f"Uploaded PDF: {file.filename}",
        description=f"Extracted {len(words)} words across {len(chunks)} study chunks.",
        doc_id=doc_id
    )

    return DocumentResponse(
        id=doc_id,
        title=doc_data["title"],
        source_type="pdf",
        char_count=doc_data["char_count"],
        word_count=doc_data["word_count"],
        chunk_count=len(chunks),
        topics=topics,
        created_at=doc_data["created_at"]
    )

@router.post("/paste", response_model=DocumentResponse)
async def paste_notes(payload: DocumentCreate):
    clean_text = TextExtractor.sanitize_text(payload.content)
    if len(clean_text) < 20:
        raise HTTPException(status_code=400, detail="Pasted notes must contain at least 20 characters of readable text.")

    doc_id = str(uuid.uuid4())
    chunks = TextChunker.chunk_document(doc_id, clean_text)
    topics = extract_topics_from_text(clean_text)
    words = clean_text.split()

    doc_data = {
        "id": doc_id,
        "title": payload.title or "Pasted Notes",
        "source_type": payload.source_type,
        "content": clean_text,
        "char_count": len(clean_text),
        "word_count": len(words),
        "topics": topics,
        "created_at": datetime.utcnow().isoformat()
    }

    db.save_document(doc_data, chunks)
    db.log_activity(
        activity_id=str(uuid.uuid4()),
        action_type="upload",
        title=f"Added Notes: {doc_data['title']}",
        description=f"Processed {len(words)} words into {len(chunks)} chunks.",
        doc_id=doc_id
    )

    return DocumentResponse(
        id=doc_id,
        title=doc_data["title"],
        source_type=payload.source_type,
        char_count=doc_data["char_count"],
        word_count=doc_data["word_count"],
        chunk_count=len(chunks),
        topics=topics,
        created_at=doc_data["created_at"]
    )

@router.post("/sample", response_model=DocumentResponse)
async def load_sample_notes():
    """Loads a high-yield demo notes dataset on Operating Systems & Virtual Memory."""
    doc_id = "demo-os-virtual-memory"
    clean_text = TextExtractor.sanitize_text(SAMPLE_OS_NOTES)
    chunks = TextChunker.chunk_document(doc_id, clean_text)
    topics = ["Memory Management", "Paging and Frames", "Virtual Memory", "Page Faults", "Replacement Algorithms", "Thrashing"]
    words = clean_text.split()

    doc_data = {
        "id": doc_id,
        "title": "[Demo] OS Lecture: Memory Management & Paging",
        "source_type": "demo",
        "content": clean_text,
        "char_count": len(clean_text),
        "word_count": len(words),
        "topics": topics,
        "created_at": datetime.utcnow().isoformat()
    }

    db.save_document(doc_data, chunks)
    db.log_activity(
        activity_id=str(uuid.uuid4()),
        action_type="upload",
        title="Loaded Sample Notes",
        description="Loaded demonstration dataset on OS Memory Management.",
        doc_id=doc_id
    )

    return DocumentResponse(
        id=doc_id,
        title=doc_data["title"],
        source_type="demo",
        char_count=doc_data["char_count"],
        word_count=doc_data["word_count"],
        chunk_count=len(chunks),
        topics=topics,
        created_at=doc_data["created_at"]
    )

@router.get("", response_model=List[DocumentResponse])
async def list_documents():
    docs = db.list_documents()
    return [
        DocumentResponse(
            id=d["id"],
            title=d["title"],
            source_type=d["source_type"],
            char_count=d["char_count"],
            word_count=d["word_count"],
            chunk_count=d["chunk_count"],
            summary=d.get("summary"),
            topics=d.get("topics", []),
            created_at=d["created_at"]
        ) for d in docs
    ]

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    doc = db.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(
        id=doc["id"],
        title=doc["title"],
        source_type=doc["source_type"],
        char_count=doc["char_count"],
        word_count=doc["word_count"],
        chunk_count=doc["chunk_count"],
        summary=doc.get("summary"),
        topics=doc.get("topics", []),
        created_at=doc["created_at"]
    )
