import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../config";

const Stars = ({ rating }) => (
  <span className="small">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>
);

export default function Wall() {
  const [state, setState] = useState({ loading: true, error: "" });
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      setState({ loading: true, error: "" });
      try {
        const res = await fetch(`${API_BASE}/api/public/testimonials?limit=50&offset=0`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load");
        setItems(data.testimonials);
        setState({ loading: false, error: "" });
      } catch (e) {
        setState({ loading: false, error: e.message });
      }
    })();
  }, []);

  return (
    <div className="container">
      <div className="nav">
        <Link to="/submit">Submit</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/wall">Public wall</Link>
      </div>

      <div className="card">
        <h2>What customers are saying</h2>
        <p className="small">Only approved testimonials appear here.</p>

        {state.loading && <div className="small">Loading…</div>}
        {state.error && <div className="card" style={{ borderColor: "rgba(239,68,68,0.6)" }}>{state.error}</div>}
        {!state.loading && items.length === 0 && <div className="small">No testimonials yet.</div>}

        <div className="grid">
          {items.map((t) => (
            <div className="card" key={t.id}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {t.photo_url ? (
                  <img className="img" src={`${API_BASE}${t.photo_url}`} alt={t.name} />
                ) : (
                  <div className="img" style={{ display: "grid", placeItems: "center" }}>
                    {(t.name || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div className="small">{t.company}</div>
                  <Stars rating={t.rating} />
                </div>
              </div>

              <hr />
              <div style={{ whiteSpace: "pre-wrap" }}>{t.testimonial}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}