import { useEffect, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import Login from "./components/Login";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  // =========================================================
  // AUTHENTICATION
  // =========================================================

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
      return null;
    }
  });

  // =========================================================
  // FINANCIAL ANALYST STATE
  // =========================================================

  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [tool, setTool] = useState("");
  const [toolStatus, setToolStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // AGENT ACTIVITY
  // =========================================================

  const [activities, setActivities] = useState([
    {
      title: "System initialized",
      description: "Financial AI Agent is ready",
      status: "Completed",
      type: "system",
    },
  ]);

  // =========================================================
  // MARKET DATA STATE
  // =========================================================

  const [selectedStock, setSelectedStock] = useState("AAPL");
  const [selectedPeriod, setSelectedPeriod] = useState("1mo");

  const [marketData, setMarketData] = useState([]);
  const [marketInfo, setMarketInfo] = useState(null);

  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState("");

  // =========================================================
  // AUTH HANDLERS
  // =========================================================

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    setUser(null);
  }

  // =========================================================
  // MARKET DATA API
  // =========================================================

  async function fetchMarketData(
    symbol = selectedStock,
    period = selectedPeriod
  ) {
    setMarketLoading(true);
    setMarketError("");

    try {
      const response = await fetch(
        `${API_URL}/market/${symbol}?period=${period}`
      );

      if (!response.ok) {
        throw new Error(
          `Market API error: ${response.status}`
        );
      }

      const data = await response.json();

      setMarketData(data.data || []);
      setMarketInfo(data.latest || null);
    } catch (error) {
      console.error("Market data error:", error);

      setMarketError(
        "Unable to load market data. Make sure FastAPI is running on port 8000."
      );

      setMarketData([]);
      setMarketInfo(null);
    } finally {
      setMarketLoading(false);
    }
  }

  // =========================================================
  // LOAD MARKET DATA
  // =========================================================

  useEffect(() => {
    if (user) {
      fetchMarketData(selectedStock, selectedPeriod);
    }
  }, [user, selectedStock, selectedPeriod]);

  // =========================================================
  // QUICK QUERIES
  // =========================================================

  const quickQueries = [
    {
      title: "Apple Revenue",
      query:
        "According to the Apple financial report, what are its main revenue sources?",
      icon: "◈",
    },
    {
      title: "Apple Stock",
      query: "What is the latest available stock price of Apple?",
      icon: "↗",
    },
    {
      title: "Calculate 18%",
      query: "Calculate 125000 * 0.18",
      icon: "∑",
    },
  ];

  // =========================================================
  // ANALYZE QUERY
  // =========================================================

  async function analyzeQuery(customQuery = null) {
    const finalQuery = customQuery || query;

    if (!finalQuery.trim()) {
      return;
    }

    setQuery(finalQuery);
    setLoading(true);
    setError("");
    setAnswer("");
    setTool("");
    setToolStatus("");

    setActivities([
      {
        title: "Query received",
        description: finalQuery,
        status: "Processing",
        type: "query",
      },
      {
        title: "Qwen3 Agent",
        description:
          "Analyzing query and selecting the required tool",
        status: "Processing",
        type: "agent",
      },
    ]);

    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          ...(token && {
            Authorization: `Bearer ${token}`,
          }),
        },

        body: JSON.stringify({
          query: finalQuery,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status}`
        );
      }

      const data = await response.json();

      setAnswer(
        data.answer || "No answer returned."
      );

      setTool(
        data.tool || "Direct AI"
      );

      setToolStatus(
        data.tool_status || "Completed"
      );

      const toolName = data.tool || "";

      let toolTitle = "Direct AI Response";

      let toolDescription =
        "Qwen3 generated the response directly.";

      if (toolName.includes("calculate")) {
        toolTitle = "MCP Calculator";

        toolDescription =
          "Mathematical calculation executed through MCP.";
      } else if (
        toolName.includes("get_stock_price")
      ) {
        toolTitle = "MCP Stock Data";

        toolDescription =
          "Latest available market price retrieved.";
      } else if (
        toolName.includes(
          "search_financial_reports"
        )
      ) {
        toolTitle = "Financial RAG";

        toolDescription =
          "Relevant financial report information retrieved using vector search.";
      }

      setActivities([
        {
          title: "Query received",
          description: finalQuery,
          status: "Completed",
          type: "query",
        },
        {
          title: "Qwen3 Agent",
          description:
            "Query analyzed successfully",
          status: "Completed",
          type: "agent",
        },
        {
          title: toolTitle,
          description: toolDescription,
          status: "Completed",
          type: "tool",
        },
        {
          title: "Analysis completed",
          description:
            "Final response returned to dashboard",
          status: "Completed",
          type: "success",
        },
      ]);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to connect to the backend. Make sure FastAPI is running on port 8000."
      );

      setActivities([
        {
          title: "Connection error",
          description:
            "Could not connect to the Agentic Financial Analyst API.",
          status: "Failed",
          type: "error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // TOOL LABEL
  // =========================================================

  function getToolLabel() {
    if (!tool) {
      return "Waiting";
    }

    if (tool.includes("calculate")) {
      return "Calculator";
    }

    if (
      tool.includes("get_stock_price")
    ) {
      return "Stock Data";
    }

    if (
      tool.includes(
        "search_financial_reports"
      )
    ) {
      return "Financial RAG";
    }

    return "AI Agent";
  }

  // =========================================================
  // USER INITIAL
  // =========================================================

  const userInitial =
    user?.name?.charAt(0)?.toUpperCase() || "A";

  // =========================================================
  // SHOW LOGIN
  // =========================================================

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // =========================================================
  // MARKET HELPERS
  // =========================================================

  const previousClose =
    marketData.length >= 2
      ? marketData[marketData.length - 2].close
      : null;

  const currentClose =
    marketInfo?.close || null;

  const priceChange =
    currentClose !== null &&
    previousClose !== null
      ? currentClose - previousClose
      : null;

  const priceChangePercent =
    currentClose !== null &&
    previousClose !== null &&
    previousClose !== 0
      ? (priceChange / previousClose) * 100
      : null;

  const isPriceUp =
    priceChange !== null
      ? priceChange >= 0
      : true;

  function getPeriodLabel() {
    switch (selectedPeriod) {
      case "1mo":
        return "1 Month";

      case "3mo":
        return "3 Months";

      case "6mo":
        return "6 Months";

      case "1y":
        return "1 Year";

      default:
        return selectedPeriod;
    }
  }

  // =========================================================
  // DASHBOARD
  // =========================================================

  return (
    <div className="min-h-screen bg-[#050816] text-white">

      <div className="flex min-h-screen">

        {/* =====================================================
            SIDEBAR
        ====================================================== */}

        <aside className="hidden w-[245px] shrink-0 border-r border-white/10 bg-[#070b19] lg:flex lg:flex-col">

          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-lg font-bold shadow-lg shadow-blue-500/20">
              AI
            </div>

            <div>

              <div className="text-sm font-bold tracking-wide">
                FINANCE AI
              </div>

              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Intelligence
              </div>

            </div>

          </div>

          <nav className="flex-1 px-4 py-6">

            <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Workspace
            </div>

            <SidebarItem
              icon="⌂"
              label="Dashboard"
              active
            />

            <SidebarItem
              icon="✦"
              label="AI Analyst"
            />

            <SidebarItem
              icon="↗"
              label="Markets"
            />

            <SidebarItem
              icon="▤"
              label="Financial Reports"
            />

            <SidebarItem
              icon="⚙"
              label="MCP Tools"
            />

            <div className="my-6 h-px bg-white/10" />

            <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              System
            </div>

            <SidebarItem
              icon="◉"
              label="System Status"
            />

            <SidebarItem
              icon="?"
              label="Documentation"
            />

          </nav>

          <div className="border-t border-white/10 p-4">

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

              <div className="mb-3 flex items-center gap-2">

                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />

                <span className="text-xs font-medium text-emerald-300">
                  All systems operational
                </span>

              </div>

              <div className="text-[11px] leading-5 text-slate-500">
                Qwen3 · MCP · RAG
                <br />
                FastAPI backend connected
              </div>

            </div>

          </div>

        </aside>

        {/* =====================================================
            MAIN
        ====================================================== */}

        <main className="min-w-0 flex-1">

          {/* HEADER */}

          <header className="flex h-20 items-center justify-between border-b border-white/10 bg-[#070b19]/80 px-5 backdrop-blur-xl md:px-8">

            <div>

              <div className="text-xs text-slate-500">
                Financial Intelligence Platform
              </div>

              <h1 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">
                AI Financial Analyst
              </h1>

            </div>

            <div className="flex items-center gap-3">

              <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-xs text-emerald-300 sm:flex sm:items-center sm:gap-2">

                <span className="h-2 w-2 rounded-full bg-emerald-400" />

                Agent Online

              </div>

              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300"
              >
                🔔
              </button>

              {/* USER */}

              <div className="group relative">

                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-bold"
                >
                  {userInitial}
                </button>

                <div className="invisible absolute right-0 top-12 z-50 w-56 rounded-2xl border border-white/10 bg-[#0b1020] p-4 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">

                  <div className="mb-3">

                    <div className="text-sm font-semibold text-white">
                      {user.name}
                    </div>

                    <div className="mt-1 truncate text-xs text-slate-500">
                      {user.email}
                    </div>

                  </div>

                  <div className="mb-3 h-px bg-white/10" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-left text-xs text-red-400 transition hover:bg-red-500/10"
                  >
                    🚪 Sign Out
                  </button>

                </div>

              </div>

            </div>

          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-5 md:p-8">

            {/* =================================================
                HERO
            ================================================== */}

            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1428] via-[#0a1020] to-[#090d1a] p-6 md:p-8">

              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

              <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-violet-600/10 blur-3xl" />

              <div className="relative">

                <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-blue-400">
                  Intelligent financial analysis
                </div>

                <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">

                  Analyze financial data with an

                  <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                    {" "}
                    AI-powered agent.
                  </span>

                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Ask questions about markets, financial reports and
                  calculations. The agent automatically selects the right
                  tool using MCP and RAG.
                </p>

                {/* QUERY BOX */}

                <div className="mt-7 max-w-4xl rounded-2xl border border-white/10 bg-black/20 p-2 shadow-2xl shadow-black/20">

                  <div className="flex flex-col gap-2 md:flex-row">

                    <div className="flex flex-1 items-center">

                      <span className="px-4 text-slate-500">
                        ⌕
                      </span>

                      <input
                        value={query}
                        onChange={(e) =>
                          setQuery(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            analyzeQuery();
                          }
                        }}
                        placeholder="Ask your financial question..."
                        className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600"
                      />

                    </div>

                    <button
                      type="button"
                      onClick={() => analyzeQuery()}
                      disabled={loading}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-6 py-3 text-sm font-semibold transition hover:scale-[1.01] hover:shadow-lg hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading
                        ? "Analyzing..."
                        : "Analyze →"}
                    </button>

                  </div>

                </div>

              </div>

            </section>

            {/* =================================================
                QUICK ACTIONS
            ================================================== */}

            <section>

              <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Quick analysis
              </div>

              <div className="grid gap-3 md:grid-cols-3">

                {quickQueries.map((item) => (

                  <button
                    type="button"
                    key={item.title}
                    onClick={() =>
                      analyzeQuery(item.query)
                    }
                    className="group rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-blue-500/[0.05]"
                  >

                    <div className="mb-4 flex items-center justify-between">

                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                        {item.icon}
                      </span>

                      <span className="text-slate-600 transition group-hover:text-blue-400">
                        →
                      </span>

                    </div>

                    <div className="text-sm font-medium">
                      {item.title}
                    </div>

                    <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {item.query}
                    </div>

                  </button>

                ))}

              </div>

            </section>

            {/* =================================================
                METRIC CARDS
            ================================================== */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <MetricCard
                label="AI Agent"
                value="Online"
                sub="Qwen3 · 4B"
                icon="✦"
                positive
              />

              <MetricCard
                label="MCP Tools"
                value="03"
                sub="Calculator · Stock · RAG"
                icon="⚡"
              />

              <MetricCard
                label="Vector Search"
                value="FAISS"
                sub="Semantic retrieval"
                icon="◈"
              />

              <MetricCard
                label="Backend"
                value="Healthy"
                sub="FastAPI · Port 8000"
                icon="●"
                positive
              />

            </section>

            {/* =================================================
                MAIN DASHBOARD
            ================================================== */}

            <section className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">

              {/* =================================================
                  REAL MARKET VISUALIZATION
              ================================================== */}

              <div className="rounded-3xl border border-white/10 bg-[#080d1b] p-5 md:p-6">

                {/* MARKET HEADER */}

                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                  <div>

                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Market visualization
                    </div>

                    <h3 className="mt-1 text-lg font-semibold">
                      {selectedStock} Market Performance
                    </h3>

                    <div className="mt-1 text-xs text-slate-500">
                      Real market data powered by yFinance
                    </div>

                  </div>

                  {/* SELECTORS */}

                  <div className="flex flex-wrap gap-2">

                    <select
                      value={selectedStock}
                      onChange={(e) =>
                        setSelectedStock(e.target.value)
                      }
                      className="rounded-xl border border-white/10 bg-[#0d1428] px-3 py-2 text-xs text-slate-200 outline-none transition focus:border-blue-400/40"
                    >

                      <option value="AAPL">
                        AAPL
                      </option>

                      <option value="MSFT">
                        MSFT
                      </option>

                      <option value="TSLA">
                        TSLA
                      </option>

                    </select>

                    <select
                      value={selectedPeriod}
                      onChange={(e) =>
                        setSelectedPeriod(e.target.value)
                      }
                      className="rounded-xl border border-white/10 bg-[#0d1428] px-3 py-2 text-xs text-slate-200 outline-none transition focus:border-blue-400/40"
                    >

                      <option value="1mo">
                        1 Month
                      </option>

                      <option value="3mo">
                        3 Months
                      </option>

                      <option value="6mo">
                        6 Months
                      </option>

                      <option value="1y">
                        1 Year
                      </option>

                    </select>

                  </div>

                </div>

                {/* PRICE SUMMARY */}

                <div className="mb-5 flex flex-wrap items-end gap-6">

                  <div>

                    <div className="text-xs text-slate-500">
                      Latest Price
                    </div>

                    <div className="mt-1 text-2xl font-semibold tracking-tight">

                      {marketLoading
                        ? "Loading..."
                        : marketInfo
                        ? `$${marketInfo.close.toFixed(2)}`
                        : "--"}

                    </div>

                  </div>

                  {priceChange !== null && (
                    <div>

                      <div className="text-xs text-slate-500">
                        Daily Change
                      </div>

                      <div
                        className={`mt-1 text-sm font-semibold ${
                          isPriceUp
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >

                        {isPriceUp
                          ? "▲"
                          : "▼"}

                        {" "}

                        {Math.abs(priceChange).toFixed(2)}

                        {" "}

                        {priceChangePercent !== null &&
                          `(${Math.abs(
                            priceChangePercent
                          ).toFixed(2)}%)`}

                      </div>

                    </div>
                  )}

                  <div className="ml-auto rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-300">

                    ● Market Data

                  </div>

                </div>

                {/* CHART */}

                <div className="relative h-[300px] overflow-hidden rounded-2xl border border-white/5 bg-[#050914]">

                  {marketLoading ? (

                    <div className="flex h-full items-center justify-center">

                      <div className="text-center">

                        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-blue-400" />

                        <div className="text-sm text-slate-400">
                          Loading {selectedStock} market data...
                        </div>

                      </div>

                    </div>

                  ) : marketError ? (

                    <div className="flex h-full items-center justify-center">

                      <div className="max-w-sm text-center">

                        <div className="text-2xl">
                          ⚠
                        </div>

                        <div className="mt-2 text-sm text-red-300">
                          Market data unavailable
                        </div>

                        <div className="mt-2 text-xs leading-5 text-slate-600">
                          {marketError}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            fetchMarketData(
                              selectedStock,
                              selectedPeriod
                            )
                          }
                          className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-300 transition hover:bg-white/[0.06]"
                        >
                          Try Again
                        </button>

                      </div>

                    </div>

                  ) : marketData.length === 0 ? (

                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      No market data available
                    </div>

                  ) : (

                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >

                      <LineChart
                        data={marketData}
                        margin={{
                          top: 20,
                          right: 20,
                          left: 0,
                          bottom: 10,
                        }}
                      >

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.06)"
                        />

                        <XAxis
                          dataKey="date"
                          tick={{
                            fill: "#64748b",
                            fontSize: 10,
                          }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => {
                            const date =
                              new Date(value);

                            return date.toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              }
                            );
                          }}
                        />

                        <YAxis
                          domain={["auto", "auto"]}
                          tick={{
                            fill: "#64748b",
                            fontSize: 10,
                          }}
                          tickLine={false}
                          axisLine={false}
                          width={60}
                          tickFormatter={(value) =>
                            `$${Number(value).toFixed(0)}`
                          }
                        />

                        <Tooltip
                          contentStyle={{
                            background: "#0b1020",
                            border:
                              "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            color: "#fff",
                          }}
                          labelStyle={{
                            color: "#94a3b8",
                            marginBottom: "5px",
                          }}
                          formatter={(value) => [
                            `$${Number(value).toFixed(2)}`,
                            "Close",
                          ]}
                          labelFormatter={(value) => {
                            const date =
                              new Date(value);

                            return date.toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            );
                          }}
                        />

                        <Line
                          type="monotone"
                          dataKey="close"
                          stroke="#60a5fa"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{
                            r: 5,
                          }}
                        />

                      </LineChart>

                    </ResponsiveContainer>

                  )}

                </div>

                {/* MINI METRICS */}

                <div className="mt-4 grid grid-cols-3 gap-3">

                  <MiniMetric
                    label="Symbol"
                    value={selectedStock}
                  />

                  <MiniMetric
                    label="Period"
                    value={getPeriodLabel()}
                  />

                  <MiniMetric
                    label="Source"
                    value="yFinance"
                  />

                </div>

              </div>

              {/* =================================================
                  AI RESULT
              ================================================== */}

              <div className="flex flex-col rounded-3xl border border-white/10 bg-[#080d1b] p-5 md:p-6">

                <div className="mb-5 flex items-center justify-between">

                  <div>

                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      AI analyst
                    </div>

                    <h3 className="mt-1 text-lg font-semibold">
                      Analysis Result
                    </h3>

                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    ✦
                  </div>

                </div>

                <div className="flex-1 rounded-2xl border border-white/5 bg-black/20 p-5">

                  {loading ? (

                    <div className="flex h-full min-h-[210px] flex-col items-center justify-center text-center">

                      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-400" />

                      <div className="text-sm font-medium">
                        Agent is analyzing...
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Selecting the appropriate financial tool
                      </div>

                    </div>

                  ) : error ? (

                    <div className="flex min-h-[210px] items-center justify-center text-center">

                      <div>

                        <div className="text-2xl">
                          ⚠
                        </div>

                        <div className="mt-3 text-sm font-medium text-red-300">
                          Connection Error
                        </div>

                        <div className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                          {error}
                        </div>

                      </div>

                    </div>

                  ) : answer ? (

                    <div>

                      <div className="mb-4 flex items-center gap-2">

                        <span className="h-2 w-2 rounded-full bg-emerald-400" />

                        <span className="text-xs text-emerald-300">
                          Analysis completed
                        </span>

                      </div>

                      <div className="max-h-[250px] overflow-auto whitespace-pre-wrap text-sm leading-7 text-slate-300">
                        {answer}
                      </div>

                    </div>

                  ) : (

                    <div className="flex min-h-[210px] items-center justify-center text-center">

                      <div>

                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-xl text-blue-400">
                          ✦
                        </div>

                        <div className="mt-4 text-sm font-medium">
                          Ready for analysis
                        </div>

                        <div className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">
                          Ask a financial question or select one of the quick
                          analysis options.
                        </div>

                      </div>

                    </div>

                  )}

                </div>

                <div className="mt-4 flex items-center justify-between">

                  <div>

                    <div className="text-[10px] uppercase tracking-wider text-slate-600">
                      Tool selected
                    </div>

                    <div className="mt-1 text-xs font-medium text-slate-300">
                      {getToolLabel()}
                    </div>

                  </div>

                  <div className="text-right">

                    <div className="text-[10px] uppercase tracking-wider text-slate-600">
                      Status
                    </div>

                    <div className="mt-1 text-xs font-medium text-emerald-300">
                      {toolStatus || "Ready"}
                    </div>

                  </div>

                </div>

              </div>

            </section>

            {/* =================================================
                SECONDARY GRID
            ================================================== */}

            <section className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">

              {/* AGENT ACTIVITY */}

              <div className="rounded-3xl border border-white/10 bg-[#080d1b] p-5 md:p-6">

                <div className="mb-6">

                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Execution pipeline
                  </div>

                  <h3 className="mt-1 text-lg font-semibold">
                    Agent Activity
                  </h3>

                </div>

                <div className="space-y-5">

                  {activities.map(
                    (activity, index) => (
                      <ActivityItem
                        key={`${activity.title}-${index}`}
                        activity={activity}
                        last={
                          index ===
                          activities.length - 1
                        }
                      />
                    )
                  )}

                </div>

              </div>

              {/* MCP TOOLS */}

              <div className="rounded-3xl border border-white/10 bg-[#080d1b] p-5 md:p-6">

                <div className="mb-6">

                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Tool ecosystem
                  </div>

                  <h3 className="mt-1 text-lg font-semibold">
                    MCP & AI Tools
                  </h3>

                </div>

                <div className="grid gap-3">

                  <ToolCard
                    icon="∑"
                    name="Calculator"
                    description="Financial & mathematical calculations"
                    status="Connected"
                  />

                  <ToolCard
                    icon="↗"
                    name="Stock Data"
                    description="Latest available stock information"
                    status="Connected"
                  />

                  <ToolCard
                    icon="◈"
                    name="Financial RAG"
                    description="Search company financial reports"
                    status="Connected"
                  />

                </div>

                <div className="mt-5 rounded-2xl border border-blue-400/10 bg-blue-500/[0.04] p-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      ⚡
                    </div>

                    <div>

                      <div className="text-xs font-medium text-slate-200">
                        Intelligent tool selection
                      </div>

                      <div className="mt-1 text-[11px] text-slate-500">
                        Qwen3 automatically chooses the required tool.
                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </section>

            {/* =================================================
                TECHNOLOGY STACK
            ================================================== */}

            <section className="rounded-3xl border border-white/10 bg-[#080d1b] p-5 md:p-6">

              <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">

                <div>

                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Infrastructure
                  </div>

                  <h3 className="mt-1 text-lg font-semibold">
                    Technology Stack
                  </h3>

                </div>

                <div className="text-xs text-slate-600">
                  Agentic Financial Analyst v1.0
                </div>

              </div>

              <div className="flex flex-wrap gap-2">

                {[
                  "React",
                  "Vite",
                  "Tailwind CSS",
                  "FastAPI",
                  "LangChain",
                  "LangGraph",
                  "MCP",
                  "FAISS",
                  "Sentence Transformers",
                  "Ollama",
                  "Qwen3",
                  "yFinance",
                  "Recharts",
                  "Python",
                  "PostgreSQL",
                  "SQLAlchemy",
                  "JWT",
                ].map((tech) => (

                  <span
                    key={tech}
                    className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-slate-400 transition hover:border-blue-400/30 hover:text-blue-300"
                  >
                    {tech}
                  </span>

                ))}

              </div>

            </section>

            <footer className="pb-4 pt-2 text-center text-[11px] text-slate-600">
              Agentic Financial Analyst · Built with FastAPI, MCP, RAG &
              Qwen3
            </footer>

          </div>

        </main>

      </div>

    </div>
  );
}


/* =========================================================
   SIDEBAR ITEM
========================================================= */

function SidebarItem({
  icon,
  label,
  active = false,
}) {
  return (
    <div
      className={`mb-1 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
        active
          ? "bg-blue-500/10 text-blue-300"
          : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-200"
      }`}
    >

      <span className="flex w-5 justify-center text-base">
        {icon}
      </span>

      <span>{label}</span>

      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
      )}

    </div>
  );
}


/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  label,
  value,
  sub,
  icon,
  positive = false,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#080d1b] p-5 transition hover:border-white/15">

      <div className="flex items-start justify-between">

        <div className="text-xs text-slate-500">
          {label}
        </div>

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            positive
              ? "bg-emerald-400/10 text-emerald-400"
              : "bg-blue-400/10 text-blue-400"
          }`}
        >
          {icon}
        </div>

      </div>

      <div className="mt-4 text-xl font-semibold tracking-tight">
        {value}
      </div>

      <div className="mt-1 text-[11px] text-slate-600">
        {sub}
      </div>

    </div>
  );
}


/* =========================================================
   MINI METRIC
========================================================= */

function MiniMetric({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">

      <div className="text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div className="mt-1 text-xs font-medium text-slate-300">
        {value}
      </div>

    </div>
  );
}


/* =========================================================
   ACTIVITY ITEM
========================================================= */

function ActivityItem({
  activity,
  last,
}) {
  const failed =
    activity.status === "Failed";

  const processing =
    activity.status === "Processing";

  return (
    <div className="relative flex gap-4">

      {!last && (
        <div className="absolute left-[14px] top-8 h-[calc(100%+10px)] w-px bg-white/10" />
      )}

      <div
        className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
          failed
            ? "border-red-400/30 bg-red-400/10 text-red-400"
            : processing
            ? "border-blue-400/30 bg-blue-400/10 text-blue-400"
            : "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
        }`}
      >

        {failed
          ? "!"
          : processing
          ? "…"
          : "✓"}

      </div>

      <div className="min-w-0 flex-1 pb-4">

        <div className="flex flex-wrap items-center justify-between gap-2">

          <div className="text-sm font-medium text-slate-200">
            {activity.title}
          </div>

          <span
            className={`text-[10px] ${
              failed
                ? "text-red-400"
                : processing
                ? "text-blue-400"
                : "text-emerald-400"
            }`}
          >
            {activity.status}
          </span>

        </div>

        <div className="mt-1 text-xs leading-5 text-slate-600">
          {activity.description}
        </div>

      </div>

    </div>
  );
}


/* =========================================================
   TOOL CARD
========================================================= */

function ToolCard({
  icon,
  name,
  description,
  status,
}) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-blue-400/20 hover:bg-blue-500/[0.03]">

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 text-lg text-blue-400">
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <div className="text-sm font-medium text-slate-200">
          {name}
        </div>

        <div className="mt-1 text-[11px] text-slate-600">
          {description}
        </div>

      </div>

      <div className="flex items-center gap-2 text-[10px] text-emerald-400">

        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

        {status}

      </div>

    </div>
  );
}


export default App;