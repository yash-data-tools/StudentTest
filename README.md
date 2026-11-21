# Smart Tuition Exam Portal — Full-Stack Online Examination System

A production-ready online examination platform engineered for private tutors, coaching institutes, and students. It converts PDF question papers into interactive JEE-style tests, generates 10-mark AI topic tests, provides two distinct examination modes, and monitors browser exam integrity with an event timeline.

---

## 🌟 Key Features

### 1. Dual Examination Modes
- **Mode A: Teacher-Reviewed Exam (e.g. 50 Marks)**
  - Objective questions are evaluated provisionally by the system.
  - Submissions are held in **Admin &rarr; Pending Reviews** (`/admin/pending-reviews`).
  - The teacher reviews the student paper question-by-question, adjusts marks (+/-, partial credit, or zero overrides), inputs feedback, and applies separate integrity deductions if misconduct occurred.
  - Final scorecards and solutions are published only when finalized by the teacher.
- **Mode B: Instant AI Quick Test (10 Marks)**
  - Generated on-demand by selecting Subject, Chapter, Class, and Difficulty.
  - Evaluated automatically immediately upon student submission.
  - Scorecard, percentage, accuracy, and detailed solutions are shown immediately.

### 2. Simple, Zero-Email Student Authentication
- Students only need **Real Name**, **School Name**, **Username**, and **Password**.
- No emails, OTPs, or phone number requirements.
- Configurable registration mode: **Open Registration** vs. **Teacher Approval Required**.

### 3. PDF to Interactive Digital Exam
- Upload standard or scanned question paper PDFs.
- Dual-engine parsing:
  - Local fast extraction via `pdf-parse` for digital PDFs (zero API cost).
  - Google Gemini AI OCR & Multimodal extraction for scanned papers, math formulas, fractions, and diagrams.
  - Resilient heuristic regex fallback for offline operation.
- Interactive Question Reviewer & Editor: reorder, edit questions/options, set numerical tolerances, configure marks, and preview in student mode.

### 4. JEE-Style Competitive Exam Interface
- Official 5-state color-coded Question Palette:
  1. *Grey*: Not Visited
  2. *Red*: Not Answered
  3. *Green*: Answered
  4. *Purple*: Marked for Review
  5. *Purple with Green Dot*: Answered & Marked for Review
- Live countdown timer with auto-submit on timeout.
- Background auto-saving and offline local progress resilience.
- Submission confirmation modal displaying counts of Answered, Unanswered, and Marked for Review questions.

### 5. Exam Integrity Monitoring (Anti-Cheat Deterrence)
- Real-time logging of:
  - Tab visibility changes (`tab_hidden`, `tab_visible` with duration away)
  - Window blur and focus events
  - Fullscreen exit and re-entry events
  - Clipboard interactions (`copy`, `paste`, `cut`)
  - Suppressed context menus
- Neutral integrity report with chronological timeline.
- **Teacher Integrity Adjustment**: Teachers can manually deduct marks for misconduct with an audit reason, keeping academic score and integrity deduction transparently separate.

### 6. Question Bank & Results Analytics
- Centralized reusable question bank with search, subject filter, and difficulty tagging.
- Performance analytics: median score, score distribution brackets, question-by-question accuracy, and difficult question highlights.
- Student data backup download in **CSV** or **JSON** format (strictly omitting passwords and hashes).

---

## 🛠 Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Supabase / Standard PostgreSQL) with resilient local zero-downtime offline fallback
- **Auth**: Bcrypt password hashing + Jose JWT stateless sessions in secure HTTP-only cookies
- **AI Engine**: Google Gemini API (`gemini-2.0-flash`)
- **PDF Extraction**: `pdf-parse` + Gemini Multimodal OCR
- **Icons**: Lucide React
- **Hosting**: Netlify-compatible deployment (`netlify.toml` included)

---

## 🚀 Getting Started Locally

### 1. Clone & Install
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your configuration:
```env
# Optional Supabase / PostgreSQL Connection
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# JWT Secret & Admin Credentials
JWT_SECRET="smart-tuition-exam-portal-jwt-secret-key-32chars-min-length"
ADMIN_INITIAL_USERNAME="admin"
ADMIN_INITIAL_PASSWORD="Admin@12345"

# Google Gemini API Key (for PDF OCR and 10-Mark AI Quick Tests)
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Default Credentials

- **Teacher / Admin Portal**: `http://localhost:3000/admin/login`
  - **Username**: `admin`
  - **Password**: `Admin@12345`
- **Student Portal**: `http://localhost:3000/login`
  - Register any student directly at `http://localhost:3000/register` (e.g. `rahul2026` / `pass123`).

---

## 📦 Supabase Setup (Database & Storage)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard.
3. Open [`scripts/schema.sql`](scripts/schema.sql), paste its contents, and click **Run**.
4. Go to **Project Settings &rarr; Database &rarr; Connection string (URI)** and copy your `DATABASE_URL`.
5. Set `DATABASE_URL` in your `.env.local` or Netlify environment variables.

---

## 🌐 Netlify Deployment Guide

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Deploy Smart Tuition Exam Portal"
   git push origin main
   ```
2. Log in to [Netlify](https://app.netlify.com) and click **"Add new site" &rarr; "Import an existing project"**.
3. Select your GitHub repository.
4. Netlify will automatically detect Next.js and use `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. In **Site configuration &rarr; Environment variables**, add:
   - `DATABASE_URL`: Your Supabase connection string
   - `JWT_SECRET`: A secure 32+ character random string
   - `ADMIN_INITIAL_USERNAME`: `admin`
   - `ADMIN_INITIAL_PASSWORD`: Your chosen secure admin password
   - `GEMINI_API_KEY`: Your Google Gemini API Key
6. Click **Deploy Site**.
