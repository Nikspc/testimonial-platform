import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../config";

const Stars = ({ rating }) => (
  <span className="small">
    {"★".repeat(rating)}
    {"☆".repeat(5 - rating)}
  </span>
);

function SentimentBadge({ sentiment }) {
  if (!sentiment) return null;

  const s = String(sentiment).toLowerCase();
  let color = "rgba(255,255,255,0.14)";
  if (s === "positive") color = "rgba(34,197,94,0.25)";
  if (s === "neutral") color = "rgba(234,179,8,0.25)";
  if (s === "negative") color = "rgba(239,68,68,0.25)";

  return (
    <span className="badge" style={{ background: color }}>
      {s}
    </span>
  );
}

export default function Dashboard() {
  const [status, setStatus] = useState("pending");
  const [state, setState] = useState({ loading: true, error: "" });
  const [items, setItems] = useState([]);

  // per-item AI loading/error
  const [aiLoading, setAiLoading] = useState({}); // { [id]: true }
  const [aiError, setAiError] = useState({}); // { [id]: "msg" }

  async function load() {
    setState({ loading: true, error: "" });
    try {
      const res = await fetch(`${API_BASE}/api/admin/testimonials?status=${status}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setItems(data.testimonials);
      setState({ loading: false, error: "" });
    } catch (e) {
      setState({ loading: false, error: e.message });
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  async function moderate(id, newStatus) {
    await fetch(`${API_BASE}/api/admin/testimonials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  async function runAI(id) {
    setAiError((m) => ({ ...m, [id]: "" }));
    setAiLoading((m) => ({ ...m, [id]: true }));

    try {
      const res = await fetch(`${API_BASE}/api/admin/testimonials/${id}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // body not used, but keeps it explicit
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "AI request failed");

      // Update this item in-place (no full reload needed)
      setItems((prev) =>
        prev.map((t) =>
          String(t.id) === String(id)
            ? {
                ...t,
                ai_summary: data.summary ?? t.ai_summary ?? null,
                ai_sentiment: data.sentiment ?? t.ai_sentiment ?? null,
              }
            : t
        )
      );
    } catch (e) {
      setAiError((m) => ({ ...m, [id]: e.message }));
    } finally {
      setAiLoading((m) => ({ ...m, [id]: false }));
    }
  }

  return (
    <div className="container">
      <div className="nav">
        <Link to="/submit">Submit</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/wall">Public wall</Link>
      </div>

      <div className="card">
        <h2>Moderation dashboard</h2>
        <p className="small">Unprotected route (per brief). AI tools available per testimonial.</p>

        <div className="row">
          <label>
            Filter status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <div />
        </div>

        <hr />

        {state.loading && <div className="small">Loading…</div>}
        {state.error && (
          <div className="card" style={{ borderColor: "rgba(239,68,68,0.6)" }}>
            {state.error}
          </div>
        )}
        {!state.loading && items.length === 0 && (
          <div className="small">No testimonials in this state.</div>
        )}

        <div className="grid">
          {items.map((t) => {
            const id = t.id;
            const isAiLoading = !!aiLoading[id];
            const thisAiError = aiError[id];

            return (
              <div className="card" key={id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {t.photo_url ? (
                      <img className="img" src={`${API_BASE}${t.photo_url}`} alt={t.name} />
                    ) : (
                      <div className="img" style={{ display: "grid", placeItems: "center" }}>
                        {(t.name || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
                        <span>{t.name}</span>
                        <span className="badge">{t.status}</span>
                        <SentimentBadge sentiment={t.ai_sentiment} />
                      </div>
                      <div className="small">
                        {t.company} • {t.email}
                      </div>
                      <Stars rating={t.rating} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "start", flexWrap: "wrap" }}>
                    <button
                      className="secondary"
                      onClick={() => runAI(id)}
                      disabled={isAiLoading}
                      title="Generate AI summary & sentiment"
                    >
                      {isAiLoading ? "Running AI…" : t.ai_summary || t.ai_sentiment ? "Re-run AI" : "Run AI"}
                    </button>

                    {t.status !== "approved" && (
                      <button onClick={() => moderate(id, "approved")}>Approve</button>
                    )}
                    {t.status !== "rejected" && (
                      <button className="danger" onClick={() => moderate(id, "rejected")}>
                        Reject
                      </button>
                    )}
                  </div>
                </div>

                <hr />
                <div style={{ whiteSpace: "pre-wrap" }}>{t.testimonial}</div>

                {(t.ai_summary || t.ai_sentiment || thisAiError) && <hr />}

                {t.ai_summary && (
                  <div className="small" style={{ lineHeight: 1.4 }}>
                    <strong>AI summary:</strong> {t.ai_summary}
                  </div>
                )}

                {thisAiError && (
                  <div className="small" style={{ color: "rgba(239,68,68,0.9)" }}>
                    <strong>AI error:</strong> {thisAiError}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}