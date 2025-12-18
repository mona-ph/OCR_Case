# OCR_Case
Full-stack app to upload invoice images (jpg/jpeg), extract text via OCR, ask questions using an LLM grounded on the OCR text, and export a PDF containing:
- original invoice image
- OCR text
- chat transcript (Q&A)

## Tech stack
- Frontend: Next.js (App Router)
- Backend: NestJS
- DB: Postgres + Prisma
- OCR: Tesseract.js
- LLM: OpenAI (gpt-4.1-mini)
- Export: pdf-lib

## Features
- Register/Login (JWT)
- Upload invoice image (stores file + metadata)
- OCR extraction persisted in DB
- Chat threads + messages per document (LLM Q&A based on OCR)
- Export PDF (invoice + OCR + Q&A transcript)
- Clear documents history (per user)
- Clear chat history (per document)

---

## Repository structure
- `backend/` — NestJS + Prisma API
- `frontend/` — Next.js UI

---

## Local setup

### Prerequisites
- Node.js 18+ (or 20+)
- Docker Desktop (for local Postgres)

### 1) Start Postgres with Docker
From repo root:

docker compose up -d


### 2) Backend setup
# open a new terminal
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev

## Notes
- Backend runs at: http://localhost:3000

# Backend environment variables
- DATABASE_URL — Postgres connection string
- JWT_SECRET — secret key for signing JWTs
- JWT_EXPIRES_IN — token lifetime (example: 1d)
- OPENAI_API_KEY — OpenAI API key
- OPENAI_MODEL — model used by the chat endpoint (example: gpt-4.1-mini)
- PORT — API port (default: 3000)
- CORS_ORIGIN — frontend origin (default: http://localhost:3001)


### 3) Frontend setup
# open a new terminal
cd frontend
cp .env.local.example .env.local
npm install
npm run dev

### Notes
- Frontend runs at: http://localhost:3001

# Frontend environment variables
- NEXT_PUBLIC_API_BASE_URL — backend base URL (example: http://localhost:3000)

---

### Tradeoffs / limitations
- JWT stored in localStorage (prototype choice for a technical case)
- OCR quality depends heavily on input image quality
- Basic UI and basic validation (focus on functional end-to-end flow)
- Export PDF formatting is simple and focuses on the requirements of the case

### Possible improvements

- Store JWT in httpOnly cookies + server-side auth guards in Next.js
- Better OCR preprocessing (contrast, thresholding) and language selection
- Streaming responses for chat

### Screenshots (suggestion)

It was added screenshots to the /docs frolder showing the application working:

Home
Login / Register
Documents list + upload
Chat page
Exported PDF example

I also added to this folder 1 exported PDF file after some chat interactions and the file used for this test.