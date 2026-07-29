import React, { useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../config";

export default function Submit() {
  const [form, setForm] = useState({
    name: "", email: "", company: "", testimonial: "", rating: "5", photo: null,
  });
  const [state, setState] = useState({ loading: false, error: "", success: "" });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setState({ loading: true, error: "", success: "" });

    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("company", form.company);
      fd.append("testimonial", form.testimonial);
      fd.append("rating", form.rating);
      if (form.photo) fd.append("photo", form.photo);

      const res = await fetch(`${API_BASE}/api/testimonials`, { method: "POST", body: fd });
      const data = await res.json();

        if (!res.ok) {
          const fieldErrors = data?.details?.fieldErrors;
          const msg =
            fieldErrors
              ? Object.entries(fieldErrors)
                  .filter(([, v]) => v && v.length)
                  .map(([k, v]) => `${k}: ${v.join(", ")}`)
                  .join(" | ")
              : (data?.error || "Submission failed");

          throw new Error(msg);
        }

      setState({ loading: false, error: "", success: "Thanks! Your testimonial is pending review." });
      setForm({ name: "", email: "", company: "", testimonial: "", rating: "5", photo: null });
    } catch (err) {
      setState({ loading: false, error: err.message, success: "" });
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
        <h2>Leave a testimonial</h2>
        <p className="small">Public form. Submissions require approval.</p>

        <form className="grid" onSubmit={onSubmit}>
          <div className="row">
            <label>Name
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </label>
            <label>Email
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </label>
          </div>

          <div className="row">
            <label>Company
              <input value={form.company} onChange={(e) => update("company", e.target.value)} required />
            </label>
            <label>Rating
              <select value={form.rating} onChange={(e) => update("rating", e.target.value)}>
                <option value="5">5 ★★★★★</option>
                <option value="4">4 ★★★★</option>
                <option value="3">3 ★★★</option>
                <option value="2">2 ★★</option>
                <option value="1">1 ★</option>
              </select>
            </label>
          </div>

          <label>Testimonial
            <textarea value={form.testimonial} onChange={(e) => update("testimonial", e.target.value)} required />
          </label>

          <label>Photo (optional)
            <input type="file" accept="image/*" onChange={(e) => update("photo", e.target.files?.[0] || null)} />
          </label>

          <button disabled={state.loading}>{state.loading ? "Submitting..." : "Submit testimonial"}</button>

          {state.error && <div className="card" style={{ borderColor: "rgba(239,68,68,0.6)" }}>{state.error}</div>}
          {state.success && <div className="card" style={{ borderColor: "rgba(34,197,94,0.5)" }}>{state.success}</div>}
        </form>
      </div>
    </div>
  );
}