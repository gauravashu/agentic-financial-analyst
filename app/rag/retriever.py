from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


VECTOR_DIR = Path("data/vector_store")
MODEL_NAME = "all-MiniLM-L6-v2"


def search_documents(
    query: str,
    top_k: int = 2,
):
    index_path = (
        VECTOR_DIR / "financial_reports.index"
    )

    chunks_path = (
        VECTOR_DIR / "chunks.npy"
    )

    if not index_path.exists():
        raise FileNotFoundError(
            "FAISS index not found. "
            "Run vector_store.py first."
        )

    index = faiss.read_index(
        str(index_path)
    )

    chunks = np.load(
        chunks_path,
        allow_pickle=True,
    )

    model = SentenceTransformer(
        MODEL_NAME
    )

    query_embedding = model.encode(
        [query],
        normalize_embeddings=True,
    )

    query_embedding = np.asarray(
        query_embedding,
        dtype="float32",
    )

    top_k = min(top_k, index.ntotal)

    scores, indices = index.search(
        query_embedding,
        top_k,
    )

    results = []

    for score, index_id in zip(
        scores[0],
        indices[0],
    ):
        results.append(
            {
                "score": float(score),
                "content": str(
                    chunks[index_id]
                ),
            }
        )

    return results


if __name__ == "__main__":
    query = (
        "What are Apple's main revenue sources?"
    )

    results = search_documents(query)

    print("\n=== SEARCH RESULTS ===")

    for result in results:
        print(
            "\nScore:",
            result["score"],
        )
        print(result["content"])
