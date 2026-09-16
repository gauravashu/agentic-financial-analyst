from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

from app.rag.document_loader import load_and_split_documents


REPORTS_DIR = "data/financial_reports"
VECTOR_DIR = Path("data/vector_store")

MODEL_NAME = "all-MiniLM-L6-v2"


def create_vector_store():
    chunks = load_and_split_documents(REPORTS_DIR)

    if not chunks:
        raise ValueError(
            "No .txt financial reports found."
        )

    model = SentenceTransformer(MODEL_NAME)

    texts = [
        chunk["content"]
        for chunk in chunks
    ]

    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
    )

    embeddings = np.asarray(
        embeddings,
        dtype="float32",
    )

    dimension = embeddings.shape[1]

    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings)

    VECTOR_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    faiss.write_index(
        index,
        str(
            VECTOR_DIR / "financial_reports.index"
        ),
    )

    np.save(
        VECTOR_DIR / "chunks.npy",
        np.array(
            texts,
            dtype=object,
        ),
    )

    print(
        "FAISS vector store created successfully!"
    )
    print(
        "Total vectors:",
        index.ntotal,
    )
    print(
        "Embedding dimensions:",
        dimension,
    )
    print(
        "Saved to:",
        VECTOR_DIR,
    )


if __name__ == "__main__":
    create_vector_store()
