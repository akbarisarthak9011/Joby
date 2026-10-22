# Joby

Joby adapts one anonymized English Base CV to a job description. It records a versioned snapshot of the text, shows literal keyword overlap and gaps, and keeps the Base CV separate from tailored outputs.

## Run locally

Start the UI:

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

Start the API server in a second terminal on port 3017:

```powershell
$env:PORT = "3017"
npm.cmd run start
```

Open the local Vite URL shown in the first terminal. The API proxy target is `127.0.0.1:3017` in Vite development; deployed builds use same-origin API routes.

## Optional Aiven PostgreSQL

Set `AIVEN_DATABASE_URL` (or `DATABASE_URL`) on the API server to an Aiven PostgreSQL connection string, then restart the server. Joby creates tables for the single Base CV, job snapshots, and tailoring runs. The API verifies TLS certificates. Without this setting, the app uses browser localStorage and labels the data layer as local.

The app does not fetch job pages: paste the public job description and capture a snapshot to track changes. The supplied role is a recorded demo scenario. Keyword overlap is a text comparison, not an ATS or hiring prediction.

## Career memory (Memory Ledger)

With PostgreSQL configured, Joby keeps a durable career memory: skills, application outcomes and recruiter feedback. Before each DeepSeek draft (CV, cover letter, interview kit), it retrieves the most relevant memories and adds them to the prompt. The Memory Ledger card shows exactly which memories were retrieved and which ones the model says it used.

- **Requirements:** the `pgvector` extension. Aiven PostgreSQL supports it; Joby runs `CREATE EXTENSION IF NOT EXISTS vector` on startup.
- **Embeddings:** computed inside the API server with `Xenova/all-MiniLM-L6-v2` (384 dimensions, no API key). The model (~25 MB) is downloaded on first start. Override it with `JOBY_EMBEDDING_MODEL`, but the column stays `vector(384)`.
- **Logging feedback:** click "What did the recruiter say?" after an application. With a DeepSeek key, the feedback is split into separate memories by the model; without one, Joby uses text rules.
- **Lifecycle:** each memory is `ACTIVE`, `STALE`, `SUPERSEDED`, `CONTRADICTED` or `ARCHIVED`.
  - Newer evidence on the same subject replaces older evidence: "advanced SQL" supersedes "intermediate SQL", and a Power BI project closes an earlier "lacked Power BI" gap.
  - Contradictions are flagged until you confirm one side.
  - Memories that haven't been confirmed for a while are marked stale by a daily sweep.
- **Metrics:** `GET /api/memory/metrics` compares keyword-coverage lift on runs that used memory with runs that didn't, and reports gaps closed and citation rate.

API: `GET/POST /api/memory`, `POST /api/memory/feedback`, `POST /api/memory/retrieve`, `POST /api/memory/runs/:runId/citations`, `GET /api/memory/metrics`, `GET /api/memory/:id/history`, `PATCH /api/memory/:id`.

Tests: `npm test` runs the unit tests. To also run the database tests, set `MEMORY_TEST_DATABASE_URL` to a disposable PostgreSQL database with pgvector (the tests truncate the memory tables).

## Production build

```powershell
npm.cmd run build
npm.cmd run start
```

The service uses the `PORT` environment variable when the host provides one.
