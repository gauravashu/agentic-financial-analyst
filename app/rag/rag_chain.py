from langchain_core.messages import HumanMessage
from langchain_ollama import ChatOllama

from app.rag.retriever import search_documents


llm = ChatOllama(
    model="qwen3:4b",
    temperature=0,
    reasoning=False,
)


def clean_response(text: str) -> str:
    if "</think>" in text:
        text = text.split(
            "</think>",
            1,
        )[1]

    return text.strip()


def ask_rag(question: str) -> str:
    results = search_documents(
        question,
        top_k=2,
    )

    context = "\n\n".join(
        result["content"]
        for result in results
    )

    prompt = f"""
You are a financial analyst assistant.

Answer the question using ONLY the context.

If the answer is not available in the context,
say that the information is not available.

Do not show your reasoning.
Give only a concise final answer in 2-4 sentences.

Context:
{context}

Question:
{question}
"""

    response = llm.invoke(
        [
            HumanMessage(
                content=prompt
            )
        ]
    )

    return clean_response(
        response.content
    )


if __name__ == "__main__":
    question = (
        "What are Apple's main revenue sources?"
    )

    answer = ask_rag(question)

    print("\n=== RAG ANSWER ===")
    print(answer)
