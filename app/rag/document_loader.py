from pathlib import Path

from langchain_text_splitters import RecursiveCharacterTextSplitter


def load_and_split_documents(directory: str):
    documents = []

    for file_path in Path(directory).glob("*.txt"):
        text = file_path.read_text(encoding="utf-8")

        documents.append(
            {
                "source": str(file_path),
                "content": text,
            }
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
    )

    chunks = []

    for document in documents:
        split_texts = splitter.split_text(
            document["content"]
        )

        for index, text in enumerate(split_texts):
            chunks.append(
                {
                    "source": document["source"],
                    "chunk_id": index,
                    "content": text,
                }
            )

    return chunks


if __name__ == "__main__":
    chunks = load_and_split_documents(
        "data/financial_reports"
    )

    print(f"Total chunks: {len(chunks)}")

    for chunk in chunks:
        print("\n--- CHUNK ---")
        print(chunk["content"])
