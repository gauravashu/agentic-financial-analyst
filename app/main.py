from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.routes_market import router as market_router

from app.agents.financial_agent import ask_financial_agent
from app.auth.routes import router as auth_router


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="Agentic Financial Analyst",
    description="AI-powered financial analysis platform",
    version="1.0.0",
)
app.include_router(market_router)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# AUTH ROUTES
# =========================================================

app.include_router(auth_router)


# =========================================================
# ANALYSIS REQUEST MODEL
# =========================================================

class AnalysisRequest(BaseModel):
    query: str


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Agentic Financial Analyst API is running 🚀"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# =========================================================
# FINANCIAL ANALYSIS
# =========================================================

@app.post("/analyze")
async def analyze(request: AnalysisRequest):

    result = await ask_financial_agent(
        request.query
    )

    return {
        "query": request.query,
        "answer": result["answer"],
        "tool": result["tool"],
        "tool_status": result["tool_status"],
    }