(() => {
  const script =
    document.currentScript ||
    Array.from(document.getElementsByTagName("script")).find((s) =>
      (s.src || "").includes("/widget.js")
    );
  if (!script) return;

  const scriptUrl = new URL(script.src);

  const opt = (key, fallback) =>
    scriptUrl.searchParams.get(key) ?? script.dataset[key] ?? fallback;

  const accent = opt("accent", "#3b82f6");
  const layout = opt("layout", "grid"); // grid|list
  const limit = parseInt(opt("limit", "6"), 10);
  const title = opt("title", "What customers say");
  const targetSelector = opt("target", "");

  // the widget uses the same origin as the script file
  const apiBase = scriptUrl.origin;

  let mount = targetSelector ? document.querySelector(targetSelector) : null;
  if (!mount) {
    mount = document.createElement("div");
    script.parentNode.insertBefore(mount, script);
  }

  const root = mount.attachShadow ? mount.attachShadow({ mode: "open" }) : mount;

  root.innerHTML = `
    <style>
      :host { all: initial; }
      .wrap { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #0f172a; }
      .header { display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:10px; }
      .title { font-size:16px; font-weight:700; margin:0; }
      .sub { font-size:12px; color: rgba(15,23,42,0.6); }
      .grid { display:grid; gap:12px; }
      .grid.grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .grid.list { grid-template-columns: 1fr; }
      @media (max-width: 900px) { .grid.grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 600px) { .grid.grid { grid-template-columns: 1fr; } }
      .card { border: 1px solid rgba(15,23,42,0.12); background:#fff; border-radius:12px; padding:14px; box-shadow:0 2px 12px rgba(15,23,42,0.06); border-left:4px solid ${accent}; }
      .top { display:flex; gap:10px; align-items:center; margin-bottom:8px; }
      .avatar { width:40px; height:40px; border-radius:999px; border:1px solid rgba(15,23,42,0.12); overflow:hidden; display:grid; place-items:center; background: rgba(59,130,246,0.08); font-weight:700; }
      .avatar img { width:100%; height:100%; object-fit:cover; display:block; }
      .name { margin:0; font-size:13px; font-weight:700; }
      .company { margin:0; font-size:12px; color: rgba(15,23,42,0.65); }
      .stars { font-size:12px; color: rgba(15,23,42,0.75); margin-top:2px; }
      .text { margin:0; font-size:13px; line-height:1.35; white-space:pre-wrap; }
      .state { font-size:13px; color: rgba(15,23,42,0.65); padding: 10px 0; }
      .err { color:#b91c1c; }
    </style>

    <div class="wrap">
      <div class="header">
        <h3 class="title">${esc(title)}</h3>
        <div class="sub">Testimonials</div>
      </div>
      <div id="state" class="state">Loading…</div>
      <div id="grid" class="grid ${layout === "list" ? "list" : "grid"}" style="display:none"></div>
    </div>
  `;

  const stateEl = root.getElementById("state");
  const gridEl = root.getElementById("grid");
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 6;

  fetch(`${apiBase}/api/public/testimonials?limit=${encodeURIComponent(safeLimit)}&offset=0`)
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      return data;
    })
    .then((data) => {
      const items = Array.isArray(data.testimonials) ? data.testimonials : [];
      if (items.length === 0) {
        stateEl.textContent = "No testimonials yet.";
        return;
      }
      stateEl.style.display = "none";
      gridEl.style.display = "grid";

      gridEl.innerHTML = items.map((t) => {
        const rating = clamp(t.rating, 1, 5);
        const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
        const photo = t.photo_url ? `${apiBase}${t.photo_url}` : "";

        const avatar = photo
          ? `<div class="avatar"><img src="${escAttr(photo)}" alt="${escAttr(t.name)}"></div>`
          : `<div class="avatar">${esc((t.name || "?").slice(0,1).toUpperCase())}</div>`;

        return `
          <div class="card">
            <div class="top">
              ${avatar}
              <div>
                <p class="name">${esc(t.name || "")}</p>
                <p class="company">${esc(t.company || "")}</p>
                <div class="stars">${stars}</div>
              </div>
            </div>
            <p class="text">${esc(t.testimonial || "")}</p>
          </div>
        `;
      }).join("");
    })
    .catch((e) => {
      stateEl.classList.add("err");
      stateEl.textContent = e?.message || "Error loading testimonials";
    });

  function clamp(v, min, max) {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }
  function esc(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escAttr(s) { return esc(s); }
})();