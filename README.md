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

## Production build

```powershell
npm.cmd run build
npm.cmd run start
```

The service uses the `PORT` environment variable when the host provides one.
