# 🚀 PDFforge — Complete Deployment Guide

This guide walks you through deploying **PDFforge** to production with Firebase, Supabase, Render, Netlify, and Cloudflare.

---

## 📋 Prerequisites

- GitHub account
- Firebase project
- Supabase project
- Render account (free tier available)
- Netlify account
- Cloudflare account
- Node.js 18+ installed locally

---

## 🔧 Step 1: Local Setup & GitHub

### Clone or Create Repository

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit: PDFforge"

# Create repo on GitHub (via web)
gh repo create pdfforge --public --source=. --remote=origin --push
```

### Project Structure Check

```
pdfforge/
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── cloudflare-worker/
│   ├── worker.js
│   ├── package.json
│   └── wrangler.toml
├── .github/workflows/deploy.yml
├── netlify.toml
└── README.md
```

---

## 🔐 Step 2: Firebase Setup (Authentication)

### Create Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **Create Project** → Name it **"pdfforge"**
3. Enable Google Analytics (optional)
4. Click **Create Project**

### Enable Authentication

1. In Firebase Console, go to **Authentication** (left menu)
2. Click **Get started**
3. Enable:
   - ✅ **Email/Password** (native)
   - ✅ **Google** (click "Google" → enable → add your support email)

### Get Web Configuration

1. Go to **Project Settings** (gear icon)
2. Under **Your apps**, click **</> Web**
3. If no app yet, click **Add app** → register web app → copy config

Copy this config into `frontend/.env.local`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=pdfforge-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pdfforge-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=pdfforge-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcd1234...
```

### Get Backend Service Account

1. Go to **Project Settings** → **Service Accounts**
2. Click **Generate New Private Key** → saves JSON file
3. Open the JSON file and extract these values for `backend/.env.local`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=key-id-from-json
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
```

---

## 🗄️ Step 3: Supabase Setup (Storage & Database)

### Create Supabase Project

1. Go to **https://supabase.com** → **New project**
2. Name: **pdfforge** → Choose region
3. Set password → Create project
4. Wait for initialization (~2 min)

### Create Storage Bucket

1. Go to **Storage** (left menu) → **Create new bucket**
2. Name: `pdf-files` → Private (✓ unchecked) → Create bucket

### Create Database Tables

1. Go to **SQL Editor** → **New query**
2. Paste and run:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PDF history table
CREATE TABLE pdf_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool_used TEXT NOT NULL,
  original_filename TEXT,
  result_path TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE pdf_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users see own history"
  ON pdf_history FOR ALL
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own history"
  ON pdf_history FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own history"
  ON pdf_history FOR DELETE
  USING (user_id = auth.uid()::text);
```

### Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (for backend only!)

**Frontend `.env.local`:**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Backend `.env.local`:**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  # Use service_role key!
```

---

## 🌐 Step 4: Backend on Render (Node.js API)

### Deploy to Render

1. Go to **https://render.com** → Sign up
2. Click **New** → **Web Service**
3. **Connect GitHub** → Select your `pdfforge` repo
4. Configure:
   - **Name:** `pdfforge-api`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or Starter)

### Add Environment Variables

In Render dashboard for this service, go to **Environment**:

```
PORT=3001
NODE_ENV=production
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
ALLOWED_ORIGIN=https://your-netlify-domain.netlify.app
MAX_FILE_SIZE=52428800
```

### Deploy

Click **Deploy** and wait ~2 min.

Copy your Render URL: `https://pdfforge-api.onrender.com`

This becomes your `VITE_API_URL` for the frontend!

---

## 🎨 Step 5: Frontend on Netlify

### Deploy to Netlify

1. Go to **https://netlify.com** → Sign in with GitHub
2. Click **Add new site** → **Import an existing project**
3. Select your `pdfforge` repo
4. Configure:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
   - Click **Deploy site**

### Add Environment Variables

In Netlify, go to **Site settings** → **Build & deploy** → **Environment**:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=pdfforge-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pdfforge-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=pdfforge-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcd1234...
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_URL=https://pdfforge-api.onrender.com
```

### Trigger Deploy

Netlify auto-deploys on pushes to `main`. Or manually deploy:

In Netlify → **Deploys** → **Trigger deploy** → **Deploy site**

Your live URL: `https://your-netlify-domain.netlify.app`

---

## 🚀 Step 6: Cloudflare Worker (Optional, but Recommended)

### Deploy Worker

1. Install Wrangler:
   ```bash
   npm install -g wrangler
   ```

2. Login:
   ```bash
   wrangler login
   ```

3. Update `cloudflare-worker/wrangler.toml`:
   ```toml
   [[routes]]
   pattern = "api.pdfforge.com/*"  # Change to your domain
   zone_name = "example.com"        # Your domain
   ```

4. Deploy:
   ```bash
   cd cloudflare-worker
   npm install
   npm run deploy
   ```

### Configure DNS on Cloudflare

1. Add DNS record: `CNAME api.pdfforge.com → pdfforge-api.onrender.com`
2. Enable Cloudflare proxy (orange cloud)
3. Update `VITE_API_URL` in Netlify to `https://api.pdfforge.com`

---

## 📊 Step 7: Update CORS on Backend

1. Go back to Render → Your service → **Environment**
2. Update `ALLOWED_ORIGIN`:
   ```
   ALLOWED_ORIGIN=https://your-netlify-domain.netlify.app
   ```
3. Click **Save Changes** → Auto-redeploy

---

## ✅ Step 8: GitHub Actions CI/CD (Optional)

Create secrets in GitHub repo:

**Settings** → **Secrets and variables** → **Actions**:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
... (all frontend vars)
VITE_API_URL=https://pdfforge-api.onrender.com
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
NETLIFY_AUTH_TOKEN=... (get from Netlify → User settings → Applications)
NETLIFY_SITE_ID=... (get from Netlify → Site settings)
RENDER_SERVICE_ID=... (from Render URL)
RENDER_DEPLOY_KEY=... (Render → service → API keys)
CLOUDFLARE_API_TOKEN=... (Cloudflare dashboard → API tokens)
CLOUDFLARE_ACCOUNT_ID=...
```

GitHub Actions will now auto-deploy on every push to `main`!

---

## 🧪 Testing

### Test Login

1. Go to `https://your-netlify-domain.netlify.app`
2. Click **Get started** → **Create account**
3. Sign up with email or Google
4. Should redirect to dashboard

### Test PDF Processing

1. Click **Tool** (e.g., **Merge PDF**)
2. Drop a PDF file
3. Click **Process PDF**
4. Should download processed file
5. Check **History** to see saved files

### Check Backend Health

```bash
curl https://pdfforge-api.onrender.com/health
```

Should return: `{"status":"ok","timestamp":"..."}`

---

## 🐛 Troubleshooting

### "Invalid token" on backend

- Firebase credentials in `backend/.env` are wrong
- Re-download service account JSON from Firebase

### "File upload failed"

- Backend temp directory doesn't exist
- Check `/tmp/pdfforge` permissions
- Or set custom `TEMP_DIR` in `.env`

### "CORS error" in browser

- Update `ALLOWED_ORIGIN` in backend `.env`
- Match your exact Netlify domain
- Restart backend: Render → Manual Deploy

### PDF not saving to Supabase

- Check `SUPABASE_SERVICE_KEY` (not anon key!)
- Verify bucket is `pdf-files`
- Check RLS policies are correct

### Render keeps timing out

- Free tier is limited (~10 min builds)
- Use Starter plan ($7/month) or upgrade Node memory

---

## 📦 File Structure

```
pdfforge/
├── frontend/                 # React + Vite (Netlify)
│   ├── src/
│   │   ├── components/      # Navbar, etc.
│   │   ├── pages/           # Home, Login, Tool, Dashboard, History
│   │   ├── hooks/           # useAuth
│   │   ├── utils/           # firebase, supabase, api
│   │   ├── styles/          # globals.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
├── backend/                  # Node + Express (Render)
│   ├── src/
│   │   ├── services/        # firebase, supabase, pdfService
│   │   ├── middleware/      # auth
│   │   ├── routes/          # pdf (main API)
│   │   └── index.js         # Express server
│   ├── package.json
│   └── .env.example
│
├── cloudflare-worker/        # Edge computing (Cloudflare)
│   ├── worker.js
│   ├── wrangler.toml
│   └── package.json
│
├── .github/workflows/        # CI/CD
│   └── deploy.yml           # GitHub Actions
│
├── netlify.toml             # Netlify config
├── .gitignore
└── README.md
```

---

## 🎯 Quick Command Reference

```bash
# Local dev (3 terminals)
cd frontend && npm install && npm run dev      # http://localhost:5173
cd backend && npm install && npm run dev       # http://localhost:3001
# In Cloudflare worker dir: npm run dev

# Build for production
cd frontend && npm run build
cd backend && npm install  # (no build needed for Node)

# Push to GitHub (triggers CI/CD)
git add .
git commit -m "Your message"
git push origin main

# Manual Render deploy
# In Render dashboard → Manual Deploy

# Manual Netlify deploy
# In Netlify dashboard → Trigger deploy

# Deploy Cloudflare Worker
cd cloudflare-worker && npm run deploy
```

---

## 🔒 Security Checklist

- [ ] Firebase Auth: Email + Google enabled
- [ ] Supabase: RLS policies on `pdf_history` table
- [ ] Backend: CORS restricted to Netlify domain only
- [ ] Cloudflare: Rate limiting enabled (30 req/min)
- [ ] All secrets in GitHub/Netlify/Render (never in code!)
- [ ] `.env` files in `.gitignore`
- [ ] HTTPS only (Netlify + Cloudflare both enforce)
- [ ] Firebase service account key not in public code

---

## 🚀 Production Tips

1. **Domain**: Buy domain, connect to Netlify & Cloudflare
2. **Email**: Add custom domain email via Firebase SMTP
3. **Analytics**: Add Google Analytics to frontend
4. **Monitoring**: Set up error tracking (Sentry, LogRocket)
5. **Backups**: Weekly export of Supabase database
6. **Scale**: Upgrade Render plan if needed ($7-25/month)

---

## 📝 What's Next

- Add more PDF tools (Handwriting recognition, OCR, etc.)
- Implement premium tier (paid features)
- Add email notifications for conversions
- Mobile app (React Native)
- API for third-party integrations

---

**Congratulations! Your PDFforge app is live! 🎉**
