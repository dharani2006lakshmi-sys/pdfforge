# 🔥 PDFforge — Full-Stack PDF Editor

> iLovePDF-style all-in-one PDF tools with Firebase Auth, Supabase Storage, Cloudflare CDN/Worker, and Netlify hosting.

---

## 🏗️ Architecture

```
pdfforge/
├── frontend/          → React + Vite (hosted on Netlify)
├── backend/           → Node.js + Express (hosted on Render)
└── cloudflare-worker/ → Cloudflare Worker (rate-limiting + CDN proxy)
```

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React + Vite, Tailwind-like custom CSS |
| Auth | Firebase Authentication (Google + Email) |
| Storage | Supabase Storage (PDF files) |
| Backend | Node.js + Express (PDF processing via pdf-lib) |
| CDN / Security | Cloudflare Workers (rate limit, CORS, caching) |
| Frontend Host | Netlify |
| Backend Host | Render (free tier) |
| Repo | GitHub |

---

## 🚀 Full Deployment Guide

### Step 1 — Clone & Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create pdfforge --public
git push -u origin main
```

---

### Step 2 — Firebase Setup (Auth)

1. Go to https://console.firebase.google.com
2. Create a new project → **PDFforge**
3. Enable **Authentication** → Sign-in methods:
   - ✅ Email/Password
   - ✅ Google
4. Go to **Project Settings** → **Your apps** → Add Web App
5. Copy the config and paste into `frontend/.env`:

```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

---

### Step 3 — Supabase Setup (Storage)

1. Go to https://supabase.com → New Project → **PDFforge**
2. Go to **Storage** → Create a bucket: `pdf-files`
   - Set to **Private** (we handle auth via signed URLs)
3. Go to **Settings** → **API** → Copy:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Also add to backend `.env`:
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  ← use service_role key for backend
```

4. In Supabase SQL editor, run:
```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- File history table
CREATE TABLE pdf_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool_used TEXT NOT NULL,
  original_filename TEXT,
  result_path TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pdf_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own history" ON pdf_history FOR ALL USING (user_id = auth.uid()::text);
```

---

### Step 4 — Backend on Render

1. Go to https://render.com → New → **Web Service**
2. Connect your GitHub repo → Root directory: `backend`
3. Build command: `npm install`
4. Start command: `node src/index.js`
5. Add environment variables (from your `.env.backend`)
6. Copy the Render URL → add to frontend `.env`:
```env
VITE_API_URL=https://pdfforge-api.onrender.com
```

---

### Step 5 — Cloudflare Worker

1. Install Wrangler: `npm install -g wrangler`
2. Login: `wrangler login`
3. Deploy: `cd cloudflare-worker && wrangler deploy`
4. Go to Cloudflare Dashboard → Workers & Pages
5. Add custom routes if needed

---

### Step 6 — Frontend on Netlify

1. Go to https://netlify.com → Add new site → Import from GitHub
2. Build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
3. Add all `VITE_*` environment variables from your `.env`
4. Deploy!

---

## 📁 Environment Files

### `frontend/.env`
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=https://your-render-url.onrender.com
```

### `backend/.env`
```
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ALLOWED_ORIGIN=https://your-netlify-url.netlify.app
```

---

## 🛠️ PDF Tools Available

| Tool | Method |
|---|---|
| Merge PDF | Backend (pdf-lib) |
| Split PDF | Backend (pdf-lib) |
| Rotate PDF | Backend (pdf-lib) |
| Delete Pages | Backend (pdf-lib) |
| Extract Pages | Backend (pdf-lib) |
| Compress PDF | Backend (pdf-lib) |
| Add Watermark | Backend (pdf-lib) |
| Add Page Numbers | Backend (pdf-lib) |
| Reorder Pages | Backend (pdf-lib) |
| Edit Metadata | Backend (pdf-lib) |
| Unlock PDF | Backend (pdf-lib) |
| PDF to Images | Backend (pdf2pic + sharp) |

---

## 🔒 Security

- Firebase ID tokens verified on every backend request
- Supabase RLS policies on all tables
- Cloudflare Worker rate-limits to 30 req/min per IP
- CORS locked to your Netlify domain
- Files stored with UUID paths (not guessable)
- Signed URLs expire in 1 hour

---

## 🧑‍💻 Local Development

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend (separate terminal)
cd backend && npm install && node src/index.js
```
