from app.rag.rag_chain import ask_rag


def search_financial_reports(
    query: str,
) -> str:
    """
    Search local financial reports and answer
    questions using retrieved financial context.
    """

    try:
        return ask_rag(query)

    except Exception as error:
        return (
            f"RAG search error: {str(error)}"
        )


if __name__ == "__main__":
    query = (
        "What are Apple's main revenue sources?"
    )

    print("\n=== RAG TOOL RESULT ===")
    print(
        search_financial_reports(query)
    )
