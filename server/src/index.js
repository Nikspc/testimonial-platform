require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { z } = require("zod");
const { pool } = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // allow widget usage from anywhere (ok for assignment)
app.use(express.json());

// uploads directory
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// serve widget
app.get("/widget.js", (req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(__dirname, "..", "public", "widget.js"));
});

// multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 3 * 1024 * 1024 } });

// validation
const submissionSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1),
  testimonial: z.string().min(10),
  rating: z.coerce.number().int().min(1).max(5),
});

// P0: submit testimonial (public)
app.post("/api/testimonials", upload.single("photo"), async (req, res) => {
  const parsed = submissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const { name, email, company, testimonial, rating } = parsed.data;
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      `
      insert into public.testimonials (name, email, company, testimonial, rating, photo_url, status)
      values ($1,$2,$3,$4,$5,$6,'pending')
      returning id, status
      `,
      [name, email, company, testimonial, rating, photoUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB insert failed" });
  }
});

// P0: moderation list (admin)
app.get("/api/admin/testimonials", async (req, res) => {
  const status = req.query.status; // pending|approved|rejected (optional)

  try {
    if (status) {
      const result = await pool.query(
        `select * from public.testimonials where status = $1 order by created_at desc`,
        [status]
      );
      return res.json({ testimonials: result.rows });
    }

    const result = await pool.query(`select * from public.testimonials order by created_at desc`);
    res.json({ testimonials: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB query failed" });
  }
});

// P0: approve/reject (admin)
const moderationSchema = z.object({ status: z.enum(["approved", "rejected"]) });

app.patch("/api/admin/testimonials/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = moderationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid status" });

  try {
    const result = await pool.query(
      `update public.testimonials set status = $1 where id = $2 returning id, status`,
      [parsed.data.status, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB update failed" });
  }
});

// P0: public wall (approved only) + P1 pagination for widget
app.get("/api/public/testimonials", async (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 20)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));

  if (!Number.isFinite(limit) || !Number.isFinite(offset)) {
    return res.status(400).json({ error: "Invalid limit/offset" });
  }

  try {
    const result = await pool.query(
      `
      select * from public.testimonials
      where status = 'approved'
      order by created_at desc
      limit $1 offset $2
      `,
      [limit, offset]
    );

    res.json({ testimonials: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB query failed" });
  }
});

//Gemini api route
const { GoogleGenerativeAI } = require("@google/generative-ai");

function extractJson(text) {
  // Handles cases like: ```json { ... } ```
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) return null;
  return JSON.parse(match[0]);
}

app.post("/api/admin/testimonials/:id/ai", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const row = await pool.query(
      `select testimonial from public.testimonials where id=$1`,
      [id]
    );
    if (row.rowCount === 0) return res.status(404).json({ error: "Not found" });

    const text = row.rows[0].testimonial;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelName = process.env.GEMINI_MODEL || "gemini-1.0-pro";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
Return JSON only:
{"summary":"...","sentiment":"positive|neutral|negative"}

Testimonial:
${text}
`.trim();

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    const parsed = extractJson(raw);
    if (!parsed) {
      return res.status(502).json({ error: "AI returned non-JSON", raw });
    }

    const summary = parsed.summary ?? null;
    const sentiment = parsed.sentiment ?? null;

    await pool.query(
      `update public.testimonials set ai_summary=$1, ai_sentiment=$2 where id=$3`,
      [summary, sentiment, id]
    );

    res.json({ id, summary, sentiment, model: modelName });
  } catch (e) {
    console.error(e);
    res.status(502).json({
      error: "AI request failed",
      details: e?.message || String(e),
    });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));