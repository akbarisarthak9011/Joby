import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3016;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Optional Aiven PostgreSQL data layer. Without a connection string the demo
// remains local and reports that state clearly in the UI.
const databaseUrl = process.env.AIVEN_DATABASE_URL || process.env.DATABASE_URL || '';
const pool = databaseUrl ? new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: true },
    max: 5,
    connectionTimeoutMillis: 5000
}) : null;
const dbReady = pool ? pool.query(`
    CREATE TABLE IF NOT EXISTS joby_base_cv (
        id text PRIMARY KEY,
        cv jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS joby_job_snapshots (
        id text PRIMARY KEY,
        content_hash text NOT NULL,
        source text NOT NULL,
        job_text text NOT NULL,
        version integer NOT NULL,
        captured_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS joby_tailoring_runs (
        id text PRIMARY KEY,
        snapshot_id text,
        source text NOT NULL,
        baseline jsonb,
        result jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
    );
`).then(() => true).catch(error => {
    console.error('Aiven PostgreSQL is configured but unavailable:', error.message);
    return false;
}) : Promise.resolve(false);

app.get('/api/data/status', async (req, res) => {
    res.json({ configured: Boolean(pool), connected: pool ? await dbReady : false, provider: pool ? 'Aiven PostgreSQL' : 'local browser storage' });
});

app.get('/api/data/state', async (req, res) => {
    if (!pool || !await dbReady) return res.status(503).json({ error: 'Aiven PostgreSQL is not connected.' });
    try {
        const [cv, job, run] = await Promise.all([
            pool.query('SELECT cv FROM joby_base_cv WHERE id = $1', ['primary']),
            pool.query('SELECT id, content_hash AS "contentHash", source, job_text AS text, version, captured_at AS "savedAt" FROM joby_job_snapshots ORDER BY captured_at DESC LIMIT 1'),
            pool.query('SELECT id, source, baseline AS before, result->\'metrics\' AS after, result->\'cv\' AS cv, created_at AS "ranAt" FROM joby_tailoring_runs ORDER BY created_at DESC LIMIT 1')
        ]);
        res.json({ baseCv: cv.rows[0]?.cv || null, jobSnapshot: job.rows[0] || null, lastRun: run.rows[0] || null });
    } catch (error) { res.status(500).json({ error: 'Could not read Joby data: ' + error.message }); }
});

app.put('/api/data/base-cv', async (req, res) => {
    if (!pool || !await dbReady) return res.status(503).json({ error: 'Aiven PostgreSQL is not connected.' });
    try {
        await pool.query('INSERT INTO joby_base_cv (id, cv, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET cv = EXCLUDED.cv, updated_at = now()', ['primary', req.body.cv]);
        res.json({ saved: true });
    } catch (error) { res.status(500).json({ error: 'Could not save Base CV: ' + error.message }); }
});

app.post('/api/data/job-snapshots', async (req, res) => {
    if (!pool || !await dbReady) return res.status(503).json({ error: 'Aiven PostgreSQL is not connected.' });
    try {
        const { id, contentHash, source, text, version, savedAt } = req.body;
        await pool.query('INSERT INTO joby_job_snapshots (id, content_hash, source, job_text, version, captured_at) VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))', [id, contentHash, source, text, version, savedAt || null]);
        res.json({ saved: true, id });
    } catch (error) { res.status(500).json({ error: 'Could not save job snapshot: ' + error.message }); }
});

app.post('/api/data/tailoring-runs', async (req, res) => {
    if (!pool || !await dbReady) return res.status(503).json({ error: 'Aiven PostgreSQL is not connected.' });
    try {
        const { id, snapshotId, source, baseline, result, ranAt } = req.body;
        await pool.query('INSERT INTO joby_tailoring_runs (id, snapshot_id, source, baseline, result, created_at) VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))', [id, snapshotId || null, source, baseline || null, result || null, ranAt || null]);
        res.json({ saved: true, id });
    } catch (error) { res.status(500).json({ error: 'Could not save tailoring run: ' + error.message }); }
});

// Serve static files from Vite build (dist)
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(__dirname)); // Fallback for raw static assets

function getBrowserExecutable() {
    const candidatePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe',
        (process.env.LOCALAPPDATA || '') + '\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of candidatePaths) {
        if (p && fs.existsSync(p)) {
            return p;
        }
    }
    return undefined;
}

app.post('/api/export-pdf', async (req, res) => {
    let browser;
    try {
        const { html, css } = req.body;

        if (!html) {
            return res.status(400).send('HTML content is required');
        }

        console.log('Launching browser for PDF generation...');
        
        const executablePath = getBrowserExecutable();
        const launchOptions = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        };
        if (executablePath) {
            launchOptions.executablePath = executablePath;
            console.log('Using browser executable at:', executablePath);
        }

        try {
            browser = await puppeteer.launch(launchOptions);
        } catch (launchErr) {
            console.warn('Failed launching with executablePath, retrying default:', launchErr.message);
            delete launchOptions.executablePath;
            browser = await puppeteer.launch(launchOptions);
        }
        
        const page = await browser.newPage();
        await page.emulateMediaType('print');

        // Load CSS stylesheets from disk for guaranteed styling in headless browser
        let diskCss = '';
        try {
            if (fs.existsSync(path.join(__dirname, 'style.css'))) {
                diskCss += fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8') + '\n';
            }
            if (fs.existsSync(path.join(__dirname, 'enhancements.css'))) {
                diskCss += fs.readFileSync(path.join(__dirname, 'enhancements.css'), 'utf8') + '\n';
            }
            if (fs.existsSync(path.join(__dirname, 'refinements.css'))) {
                diskCss += fs.readFileSync(path.join(__dirname, 'refinements.css'), 'utf8') + '\n';
            }
        } catch (cssErr) {
            console.warn('Error reading CSS from disk:', cssErr.message);
        }

        // Construct full page HTML with base tag for relative images
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <base href="http://localhost:${PORT}/" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    ${diskCss}
                    ${css || ''}
                    
                    /* Reset body margin and force A4 print */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        width: 210mm !important;
                        border: none !important;
                        border-top: none !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    /* Ensure backgrounds are printed */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box !important;
                    }
                    .cv-paper, .cv-paper.modern, .cv-paper.studio, .cv-paper.executive, .cv-paper.slate, .cv-paper.grid, .cv-paper.minimal {
                        border: none !important;
                        border-top: none !important;
                        border-bottom: none !important;
                        box-shadow: none !important;
                        -webkit-box-shadow: none !important;
                        outline: none !important;
                        margin-bottom: 0 !important;
                    }
                    .cv-paper .cv-header {
                        border-bottom: 2px solid #183c52 !important;
                        padding-bottom: 8px !important;
                        margin-bottom: 8px !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .cv-paper.studio .cv-header {
                        border-bottom: 2px solid #17687a !important;
                    }
                    .cv-paper.modern .cv-header {
                        border-bottom: 2px solid #1d7580 !important;
                    }
                    .cv-paper.executive .cv-header {
                        border-bottom: 2px solid #173c52 !important;
                    }
                    .cv-paper.slate .cv-header {
                        border-bottom: 2px solid #2b5567 !important;
                    }
                    .cv-paper.grid .cv-header {
                        border-bottom: 2px solid #1e7180 !important;
                    }
                    .cv-paper.minimal .cv-header {
                        border-bottom: 2px solid #111827 !important;
                    }
                    .cv-paper .cv-section h2 {
                        border-bottom: 1.5px solid #17687a !important;
                        padding-bottom: 3px !important;
                        margin-top: 9px !important;
                        margin-bottom: 5px !important;
                        display: block !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .cv-paper.studio .cv-section h2 {
                        border-bottom: 1.5px solid #17687a !important;
                    }
                    .cv-paper.modern .cv-section h2 {
                        border-bottom: 2px solid #1d7580 !important;
                    }
                    .cv-paper.executive .cv-section h2 {
                        border-bottom: 1.5px solid #173c52 !important;
                    }
                    .cv-paper.slate .cv-section h2 {
                        border-bottom: 1.5px solid #2b5567 !important;
                    }
                    .cv-paper.grid .cv-section h2 {
                        border-bottom: 1.5px solid #1e7180 !important;
                    }
                    .cv-paper.minimal .cv-section h2 {
                        border-bottom: 1.5px solid #111827 !important;
                    }
                    .cv-paper .skill-row {
                        border-bottom: 1px solid #dce6ed !important;
                        padding: 3px 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .cv-paper .skill-row:last-child {
                        border-bottom: none !important;
                    }
                    .cv-paper .cv-item:not(:last-child) {
                        border-bottom: 1px solid #d8e2ea !important;
                        padding-bottom: 4px !important;
                        margin-bottom: 4px !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;

        await page.setContent(fullHtml, { waitUntil: 'load', timeout: 15000 }).catch(e => {
            console.warn('page.setContent timed out waiting for load, proceeding anyway:', e.message);
        });

        // Hard constraint: Enforce exact 1-page fit per document before exporting PDF
        await page.evaluate(() => {
            const A4_TARGET_HEIGHT_PX = 1080; // Safe threshold below 1122.5px to guarantee 100% 1 page
            document.querySelectorAll('.cv-paper').forEach(paper => {
                paper.style.maxHeight = 'none';
                paper.style.overflow = 'visible';

                let margin = parseFloat(paper.style.getPropertyValue('--cv-margin')) || 8.0;
                let font = parseFloat(paper.style.getPropertyValue('--cv-font')) || 11.5;
                let line = parseFloat(paper.style.getPropertyValue('--cv-line')) || 1.25;
                let sectionGap = parseFloat(paper.style.getPropertyValue('--section-gap')) || 7.0;
                let itemGap = parseFloat(paper.style.getPropertyValue('--item-gap')) || 4.0;
                let headerGap = parseFloat(paper.style.getPropertyValue('--header-gap')) || 8.0;

                paper.style.setProperty('--cv-margin', `${margin}mm`, 'important');
                paper.style.setProperty('--cv-font', `${font}px`, 'important');
                paper.style.setProperty('--cv-line', `${line}`, 'important');
                paper.style.setProperty('--section-gap', `${sectionGap}px`, 'important');
                paper.style.setProperty('--item-gap', `${itemGap}px`, 'important');
                paper.style.setProperty('--header-gap', `${headerGap}px`, 'important');

                const getHeight = () => {
                    const rect = paper.getBoundingClientRect();
                    return Math.max(rect.height, paper.scrollHeight, paper.offsetHeight);
                };

                // Priority 1: Step font down incrementally
                while (getHeight() > A4_TARGET_HEIGHT_PX && font > 9.0) {
                    font = Math.max(9.0, font - 0.1);
                    paper.style.setProperty('--cv-font', `${font.toFixed(2)}px`, 'important');
                }

                // Priority 2: Step margins and spacing down incrementally
                while (getHeight() > A4_TARGET_HEIGHT_PX && margin > 5.5) {
                    margin = Math.max(5.5, margin - 0.2);
                    sectionGap = Math.max(3.0, sectionGap - 0.4);
                    itemGap = Math.max(2.0, itemGap - 0.2);
                    headerGap = Math.max(5.0, headerGap - 0.4);
                    paper.style.setProperty('--cv-margin', `${margin.toFixed(1)}mm`, 'important');
                    paper.style.setProperty('--section-gap', `${sectionGap.toFixed(1)}px`, 'important');
                    paper.style.setProperty('--item-gap', `${itemGap.toFixed(1)}px`, 'important');
                    paper.style.setProperty('--header-gap', `${headerGap.toFixed(1)}px`, 'important');
                }
            });
        });

        // Generate PDF — let CSS @page rules handle pagination naturally
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: '0px',
                right: '0px',
                bottom: '0px',
                left: '0px'
            }
        });

        console.log('PDF generated successfully, size:', pdfBuffer.length);

        // Send PDF response
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'attachment; filename="cv.pdf"'
        });
        
        res.send(Buffer.from(pdfBuffer));
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('An error occurred while generating the PDF: ' + error.message);
    } finally {
        if (browser) {
            await browser.close().catch(err => console.error('Error closing browser:', err));
        }
    }
});

app.post('/api/adapt-deepseek', async (req, res) => {
    try {
        const { apiKey, prompt } = req.body;
        const key = apiKey || process.env.DEEPSEEK_API_KEY;
        if (!key) {
            return res.status(400).json({ error: 'DeepSeek API Key is missing. Please enter your API key.' });
        }
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt content is required.' });
        }

        console.log('Sending request to DeepSeek API...');
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key.trim()}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a senior career strategist and copywriter specializing in digital marketing, growth, and tech roles.\n\nCRITICAL OUTPUT RULES:\n- Output ONLY a single raw JSON object. The response MUST start with { and end with }. Zero markdown, zero code fences, zero explanations outside the JSON.\n- Preserve EVERY field name exactly as in the source schema. Do NOT add, remove, or rename keys.\n- All string values must use straight double-quotes. Use only regular hyphens (-), never em dashes (—) or en dashes (–).\n- All array items must remain arrays. All objects must remain objects. Do not flatten, merge, or nest differently.\n\nVOICE & EDITORIAL RULES:\n- Write in a natural, authentic, human voice. Avoid robotic corporate clichés (e.g. "Experienced with", "results-driven professional", "energize your ecosystem").\n- CRITICAL FOR WORK-STUDY: NEVER call the candidate an "expert" or claim "expertise". Frame him as an operational, high-autonomy growth practitioner who learns fast and delivers concrete results.\n- CONNECT THE DOTS: Show the synergy between his creative background (design/UX), data rigor (GA4/GTM), and acquisition channels (SEO, ASO, apps scaled to 2M+ downloads, health information database.\n- COVER LETTER: Tailor the 4-paragraph master blueprint to the company challenges with genuine interest and concrete proof.\n- ATS compliance: mirror exact keywords from the target role in skills and bullets.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 4096,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('DeepSeek API Error:', response.status, errText);
            return res.status(response.status).json({ error: `DeepSeek API (${response.status}): ${errText}` });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            return res.status(500).json({ error: 'DeepSeek response content was empty.' });
        }

        res.json({ result: content });
    } catch (err) {
        console.error('DeepSeek proxy exception:', err);
        res.status(500).json({ error: 'Failed to connect to DeepSeek API: ' + err.message });
    }
});

// ==========================================
// LOCAL APPLICATIONS TRACKING DATABASE
// ==========================================
const DATA_DIR = path.join(__dirname, 'data');
const APPS_FILE = path.join(DATA_DIR, 'applications.json');

function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(APPS_FILE)) {
        fs.writeFileSync(APPS_FILE, JSON.stringify([], null, 2), 'utf8');
    }
}

function readApplications() {
    ensureDataFile();
    try {
        const raw = fs.readFileSync(APPS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Error reading applications file:', e);
        return [];
    }
}

function writeApplications(apps) {
    ensureDataFile();
    fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2), 'utf8');
}

// GET all applications
app.get('/api/applications', (req, res) => {
    try {
        const apps = readApplications();
        res.json(apps);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read applications: ' + err.message });
    }
});

// POST new application
app.post('/api/applications', (req, res) => {
    try {
        const apps = readApplications();
        const newApp = {
            id: req.body.id || 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            company: req.body.company || 'Entreprise',
            role: req.body.role || 'Marketing Digital',
            school: (req.body.school === 'inseec' ? 'iscom' : req.body.school) || 'iscom',
            contractType: req.body.contractType || 'Alternance',
            status: req.body.status || 'applied',
            appliedDate: req.body.appliedDate || new Date().toISOString().split('T')[0],
            jobUrl: req.body.jobUrl || '',
            jobDescription: req.body.jobDescription || '',
            location: req.body.location || 'Paris, France',
            contactName: req.body.contactName || '',
            contactEmail: req.body.contactEmail || '',
            contactPhone: req.body.contactPhone || '',
            contactLinkedin: req.body.contactLinkedin || '',
            followUps: Array.isArray(req.body.followUps) ? req.body.followUps : [],
            nextFollowUpDate: req.body.nextFollowUpDate || '',
            interviewDate: req.body.interviewDate || '',
            interviewFormat: req.body.interviewFormat || 'Visio',
            interviewNotes: req.body.interviewNotes || '',
            interviewKit: req.body.interviewKit || null,
            notes: req.body.notes || '',
            createdAt: req.body.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        apps.unshift(newApp);
        writeApplications(apps);
        res.status(201).json(newApp);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save application: ' + err.message });
    }
});

// PUT update application
app.put('/api/applications/:id', (req, res) => {
    try {
        const { id } = req.params;
        const apps = readApplications();
        const index = apps.findIndex(a => a.id === id);
        if (index === -1) {
            return res.status(404).json({ error: 'Application not found' });
        }
        apps[index] = {
            ...apps[index],
            ...req.body,
            id: apps[index].id, // preserve ID
            updatedAt: new Date().toISOString()
        };
        writeApplications(apps);
        res.json(apps[index]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update application: ' + err.message });
    }
});

// DELETE application
app.delete('/api/applications/:id', (req, res) => {
    try {
        const { id } = req.params;
        let apps = readApplications();
        const initialLen = apps.length;
        apps = apps.filter(a => a.id !== id);
        if (apps.length === initialLen) {
            return res.status(404).json({ error: 'Application not found' });
        }
        writeApplications(apps);
        res.json({ success: true, message: 'Application deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete application: ' + err.message });
    }
});

// POST generate interview preparation kit via DeepSeek AI
app.post('/api/generate-interview-kit', async (req, res) => {
    try {
        const { apiKey, company, role, school, jobDescription, appId } = req.body;
        const key = apiKey || process.env.DEEPSEEK_API_KEY;
        if (!key) {
            return res.status(400).json({ error: 'DeepSeek API Key is missing. Please enter your API key.' });
        }

        const schoolName = (school === 'hetic') ? 'HETIC' : 'ISCOM';
        const degreeName = (school === 'hetic') ? "Master's in Digital Marketing & UX" : 'Digital Communication, Social Media and Community Management';
        const rhythm = (school === 'hetic') ? '3 weeks at the company / 1 week at school' : '4 days at the company / 1 day at school';

        const interviewPrompt = `You are an elite executive career coach and interview trainer preparing candidate Alex Morgan for an upcoming interview.

CANDIDATE MASTER PROFILE:
- Name: Alex Morgan
- Applying for: Work-study (${degreeName} at ${schoolName} - Rhythm: ${rhythm}, Paris, France)
- Roots: Creative background in graphic design & UX, transitioning into organic acquisition and data.
- Proven Concrete Proofs:
  1. Independently created, scaled, and monetized mobile apps to over 2,000,000 cumulative downloads (ASO, organic acquisition, AdMob/Audience Network).
  2. Developed a health information database.
  3. Digital Marketing & Growth at Orange Travel (Paris): managed SEO/GEO acquisition and GA4 and Looker Studio reporting, and created an AI-powered automation tool for netlinking opportunities.
  4. Growth & Digital Consultant at Nuelink (SaaS): funnel redesign, product page optimization vs Hootsuite/Buffer.
  5. Trilingual: English (C2 bilingual), French (fluent/bilingual C2), Arabic (native).
  6. Technical Levers: SEO, ASO, GEO, GA4, GTM, WordPress, Looker Studio, Adobe Suite, pragmatic daily AI automations.

TARGET APPLICATION DETAILS:
- Target Company: ${company || 'Target Company'}
- Target Role: ${role || 'Digital Marketing & Growth'}
- Job Offer Description:
${jobDescription || 'Growth marketing, acquisition, SEO, and digital strategy.'}

CRITICAL RULES FOR INTERVIEW SUCCESS:
1. PITCH (SMALL SPEECH): Must be natural, rhythmic, and EASY TO PRONOUNCE aloud in spoken English. Avoid convoluted tongue-twisters, robotic corporate buzzwords, or run-on sentences. Keep it around 90 seconds (approx 150-190 words). It must highlight: Design roots -> Scaled apps 2M+ & health information database -> Orange SEO/Growth & AI automations -> Current admission at ${schoolName} (${rhythm}) -> Readiness to solve ${company}'s growth challenges.
2. MOTIVATION ("WHY THIS COMPANY?"): Genuine, informed reason linking the company's real mission, product, or challenges to the candidate's skills.
3. 3 STRENGTHS ("THREE STRENGTHS"):
   - 1: Builder Mindset & Autonomy (proven by 2M apps and health information database project).
   - 2: Creative and analytical skills (bridges design with GA4/SEO analytics).
   - 3: Applied AI & Execution Speed (builds pragmatic automations to solve real operational bottlenecks).
   Each with concrete phrasing and proof.
4. 3 AREAS OF IMPROVEMENT ("THREE DEVELOPMENT AREAS"):
   Real, honest, mature traits that are NOT disqualifying:
   - 1: Technical Perfectionism / urge to automate everything -> Countered by strict MVP deadlines and 80/20 business focus.
   - 2: Solo Creator background -> Successfully channeled into team alignment, active documentation, and clear communication (proven at Orange).
   - 3: Impatience with slow organic metrics -> Managed through rigorous weekly GA4 milestone tracking and multivariate experiments.
5. PROUD PROJECT ("A PROJECT I AM PROUD OF"):
   Structured using the STAR method (Situation, Task, Action, and measured Results) focusing on scaling mobile apps to 2M+ downloads or building health information database.
6. DIFFICULTY OVERCOME ("A CHALLENGE AND HOW I HANDLED IT"):
   A concrete professional hurdle (e.g. sudden algorithmic update or tracking issue), analytical diagnostics, test iterations, and positive outcome.
7. HOW TO DIVIDE & PRIORITIZE TASKS ("HOW I PLAN MY WORK"):
   A clear, structured method: Goal definition -> Breaking down into 1-2h actionable micro-tasks -> Prioritization by Impact/Effort (ICE or Eisenhower) -> Daily time-boxing and review.
8. 5 TO 7 EXPECTED QUESTIONS & ANSWERS:
   Targeted questions the recruiters for this specific role will ask, paired with concise, winning answer scripts.
9. 4 TO 5 QUESTIONS TO ASK THEM AT THE END:
   Intelligent, impressive questions demonstrating strategic vision.

OUTPUT FORMAT:
Return ONLY a valid JSON object starting with { and ending with }. Zero markdown, zero text outside JSON.
Use this exact JSON schema:
{
  "pitch": "Spoken pitch in English (simple to pronounce, natural phrasing)",
  "whyApplied": "Compelling motivation tailored to the company and role",
  "strengths": [
    { "title": "Strength 1", "explanation": "Why this is a strength", "proof": "Concrete evidence" },
    { "title": "Strength 2", "explanation": "Why this is a strength", "proof": "Concrete evidence" },
    { "title": "Strength 3", "explanation": "Why this is a strength", "proof": "Concrete evidence" }
  ],
  "weaknesses": [
    { "title": "Area 1", "explanation": "Honest explanation", "mitigation": "How I proactively handle it" },
    { "title": "Area 2", "explanation": "Honest explanation", "mitigation": "How I proactively handle it" },
    { "title": "Area 3", "explanation": "Honest explanation", "mitigation": "How I proactively handle it" }
  ],
  "proudProject": {
    "title": "Project name",
    "situation": "Context & problem",
    "task": "Objective",
    "action": "Actions taken",
    "result": "Measured concrete outcomes"
  },
  "difficultyOvercome": {
    "situation": "Context of the hurdle",
    "difficulty": "The exact challenge faced",
    "solution": "Step-by-step resolution",
    "takeaway": "Key learning and impact"
  },
  "taskManagement": {
    "approach": "Task breakdown and prioritization framework",
    "tools": "Methods/tools used",
    "example": "Concrete operational example"
  },
  "questionsAndAnswers": [
    { "question": "Question 1", "goodAnswer": "Ideal answer", "tip": "Recruiter tip" }
  ],
  "questionsToAskThem": [
    { "question": "Question to ask interviewer", "whyAsk": "Why this question stands out" }
  ]
}`;

        console.log('Sending interview kit generation request to DeepSeek API...');
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key.trim()}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are an elite career coach and interview preparation expert. Output ONLY raw JSON. No markdown fences, no explanatory text outside the JSON object.' },
                    { role: 'user', content: interviewPrompt }
                ],
                temperature: 0.35,
                max_tokens: 4096,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('DeepSeek Interview Kit Error:', response.status, errText);
            return res.status(response.status).json({ error: `DeepSeek API (${response.status}): ${errText}` });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            return res.status(500).json({ error: 'DeepSeek returned empty content.' });
        }

        let parsedKit;
        try {
            parsedKit = JSON.parse(content);
        } catch (parseErr) {
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                parsedKit = JSON.parse(content.slice(firstBrace, lastBrace + 1));
            } else {
                throw parseErr;
            }
        }

        // If appId was provided, automatically update the application record
        if (appId) {
            const apps = readApplications();
            const idx = apps.findIndex(a => a.id === appId);
            if (idx !== -1) {
                apps[idx].interviewKit = {
                    ...parsedKit,
                    generatedAt: new Date().toISOString()
                };
                apps[idx].updatedAt = new Date().toISOString();
                writeApplications(apps);
            }
        }

        res.json({ kit: parsedKit });
    } catch (err) {
        console.error('Interview kit generation exception:', err);
        res.status(500).json({ error: 'Failed to generate interview kit: ' + err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Ready to generate PDFs at POST /api/export-pdf');
    console.log('Ready for DeepSeek AI adaptation at POST /api/adapt-deepseek');
    console.log('Ready for Applications database at /api/applications');
    console.log('Ready for AI Interview Kit at POST /api/generate-interview-kit');
});
