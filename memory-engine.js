// Continuous Career Memory engine: durable, versioned memories with pgvector
// similarity retrieval. Embeddings run locally (no API key) via transformers.js.
import crypto from 'crypto';

export const EMBEDDING_MODEL = process.env.JOBY_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
export const EMBEDDING_DIMS = 384;

export const KINDS = ['SKILL', 'FEEDBACK', 'PROFILE_FACT', 'APPLICATION_OUTCOME', 'PITCH_LEARNING'];
export const STATUSES = ['ACTIVE', 'SUPERSEDED', 'CONTRADICTED', 'STALE', 'ARCHIVED'];
const SOURCES = ['USER_FEEDBACK', 'USER_INPUT', 'CV_IMPORT', 'APPLICATION', 'AGENT_INFERRED'];
const TTL_DAYS = { SKILL: 365, FEEDBACK: 180, PROFILE_FACT: 365, APPLICATION_OUTCOME: 180, PITCH_LEARNING: 120 };
const KIND_BOOST = { FEEDBACK: 1, PITCH_LEARNING: 0.8, SKILL: 0.6, APPLICATION_OUTCOME: 0.5, PROFILE_FACT: 0.3 };
const DUPLICATE_SIMILARITY = 0.95;
const CANDIDATE_SIMILARITY = 0.8;
const MIN_RETRIEVAL_SIMILARITY = 0.25;

export const MEMORY_SCHEMA_SQL = `
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE IF NOT EXISTS joby_memories (
        id text PRIMARY KEY,
        kind text NOT NULL CHECK (kind IN (${KINDS.map(k => `'${k}'`).join(',')})),
        status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (${STATUSES.map(s => `'${s}'`).join(',')})),
        source text NOT NULL,
        subject_key text NOT NULL,
        content text NOT NULL,
        attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
        content_hash text NOT NULL UNIQUE,
        embedding vector(${EMBEDDING_DIMS}),
        embedding_model text NOT NULL,
        confidence real NOT NULL DEFAULT 0.8,
        valid_from timestamptz NOT NULL DEFAULT now(),
        valid_until timestamptz,
        last_confirmed_at timestamptz,
        last_retrieved_at timestamptz,
        retrieval_count integer NOT NULL DEFAULT 0,
        superseded_by text REFERENCES joby_memories(id) ON DELETE SET NULL,
        application_id text,
        job_snapshot_id text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS joby_memories_status_kind ON joby_memories (status, kind);
    CREATE INDEX IF NOT EXISTS joby_memories_subject ON joby_memories (subject_key, status);
    CREATE INDEX IF NOT EXISTS joby_memories_embedding_hnsw ON joby_memories USING hnsw (embedding vector_cosine_ops);
    CREATE TABLE IF NOT EXISTS joby_memory_retrievals (
        id text PRIMARY KEY,
        run_id text NOT NULL,
        memory_id text NOT NULL REFERENCES joby_memories(id) ON DELETE CASCADE,
        similarity real NOT NULL,
        score real NOT NULL,
        rank integer NOT NULL,
        matched_requirement text,
        cited boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS joby_memory_retrievals_run ON joby_memory_retrievals (run_id);
    CREATE INDEX IF NOT EXISTS joby_memory_retrievals_memory ON joby_memory_retrievals (memory_id);
`;

// ---------- embeddings ----------
let extractorPromise = null;
async function extractor() {
    if (!extractorPromise) {
        extractorPromise = import('@huggingface/transformers')
            .then(({ pipeline }) => pipeline('feature-extraction', EMBEDDING_MODEL))
            .catch(error => { extractorPromise = null; throw error; });
    }
    return extractorPromise;
}
export async function embed(texts) {
    const list = Array.isArray(texts) ? texts : [texts];
    if (!list.length) return [];
    const model = await extractor();
    const output = await model(list.map(t => String(t).slice(0, 2000)), { pooling: 'mean', normalize: true });
    return output.tolist();
}
export const warmEmbeddings = () => extractor().then(() => true);
const toVector = values => `[${values.map(v => Number(v).toFixed(6)).join(',')}]`;
const parseVector = text => String(text || '').replace(/[[\]]/g, '').split(',').map(Number);
const cosine = (a, b) => a.reduce((sum, v, i) => sum + v * (b[i] || 0), 0);

// ---------- normalisation helpers ----------
const KNOWN_SUBJECTS = [
    ['power-bi', /power\s*bi/i], ['sql', /\b(sql|postgres(?:ql)?|mysql)\b/i], ['python', /\bpython\b/i], ['excel', /\bexcel\b/i],
    ['tableau', /\btableau\b/i], ['looker-studio', /looker/i], ['ga4', /\b(ga4|google analytics)\b/i], ['gtm', /\b(gtm|tag manager)\b/i],
    ['seo', /\bseo\b/i], ['sea', /\b(sea|google ads|paid search|ppc)\b/i], ['aso', /\baso\b/i], ['crm', /\b(crm|hubspot|salesforce)\b/i],
    ['figma', /\bfigma\b/i], ['javascript', /\b(javascript|typescript|react|node)\b/i], ['ab-testing', /\b(a\/b|ab test|experiment)/i],
    ['english', /\benglish\b/i], ['french', /\bfrench|fran[cç]ais\b/i], ['leadership', /\b(lead(ership)?|manag(e|ing) a team)\b/i],
    ['communication', /\bcommunicat/i], ['portfolio', /\bportfolio\b/i], ['salary', /\bsalary|compensation\b/i]
];
const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'was', 'were', 'because', 'they', 'said', 'i', 'my', 'a', 'an', 'of', 'to', 'in', 'on', 'not', 'too', 'lacked', 'lack', 'enough', 'experience', 'rejected', 'recruiter']);
const slug = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function subjectKeyFor(text, kind = 'FEEDBACK') {
    const known = KNOWN_SUBJECTS.map(([name, pattern]) => [name, String(text).search(pattern)]).filter(([, at]) => at >= 0).sort((a, b) => a[1] - b[1])[0];
    if (known) return `skill:${known[0]}`;
    const words = String(text).toLowerCase().match(/[a-z][a-z+#]{2,}/g) || [];
    const topic = words.filter(w => !STOP.has(w)).slice(0, 3).join('-');
    return `${kind === 'PROFILE_FACT' ? 'profile' : 'topic'}:${slug(topic) || 'general'}`;
}
function normaliseSubjectKey(key, content, kind) {
    const cleaned = String(key || '').toLowerCase().trim();
    if (/^[a-z]+:[a-z0-9-]+$/.test(cleaned)) return cleaned;
    if (cleaned) return `${cleaned.split(':')[0] || 'topic'}:${slug(cleaned.split(':').pop())}`;
    return subjectKeyFor(content, kind);
}
const polarityOf = text => /\b(lack|lacked|missing|without|no (?:real |hands-on )?experience|not enough|weak|gap|unfamiliar)\b/i.test(text) ? 'gap'
    : /\b(strong|liked|loved|impressed|praised|great|excellent|stood out)\b/i.test(text) ? 'strength' : 'neutral';
const hashOf = (kind, subjectKey, content) => crypto.createHash('sha256').update(`${kind}|${subjectKey}|${String(content).trim().toLowerCase()}`).digest('hex');
const firstRequirements = jd => String(jd || '').split(/(?<=[.!?;])\s+|\n+|•/).map(s => s.trim()).filter(s => s.length > 20);

// ---------- extraction ----------
async function deepSeekJson(apiKey, system, user) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey.trim()}` },
        body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.1, max_tokens: 1200, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
    });
    if (!response.ok) throw new Error(`DeepSeek (${response.status})`);
    const data = await response.json();
    return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

export async function extractMemories({ feedback, jobDescription = '', outcome = '', company = '', role = '', apiKey = '' }) {
    const context = [company, role].filter(Boolean).join(' - ');
    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    if (key) {
        try {
            const result = await deepSeekJson(key,
                'You turn post-application feedback into atomic career memories. Output JSON only: {"memories":[{"kind":"FEEDBACK|SKILL|PROFILE_FACT|APPLICATION_OUTCOME|PITCH_LEARNING","subjectKey":"skill:power-bi","content":"one short self-contained sentence","polarity":"gap|strength|neutral","level":"optional skill level"}]}. Use kebab-case subject keys prefixed with skill:, profile:, pitch: or topic:. Include the company/role in content when known. Max 4 memories. Never invent facts.',
                `Outcome: ${outcome || 'unknown'}\nCompany/role: ${context || 'unknown'}\nRecruiter feedback: ${feedback}\nJob description (excerpt): ${String(jobDescription).slice(0, 1500)}`);
            const memories = (result.memories || []).filter(m => KINDS.includes(m.kind) && m.content).slice(0, 4);
            if (memories.length) return memories.map(m => ({ kind: m.kind, subjectKey: normaliseSubjectKey(m.subjectKey, m.content, m.kind), content: String(m.content).trim(), attributes: { polarity: m.polarity || polarityOf(m.content), level: m.level || undefined, outcome, company, role, extractedBy: 'deepseek' } }));
        } catch (error) {
            console.warn('Memory extraction fell back to heuristics:', error.message);
        }
    }
    const clauses = String(feedback).split(/;|\.\s+|,?\s+but\s+|,\s*(?:and|while|although)\s+/i).map(c => c.trim().replace(/\.$/, '')).filter(c => c.split(/\s+/).length >= 3);
    const parts = clauses.length > 1 && new Set(clauses.map(c => subjectKeyFor(c))).size > 1 ? clauses.slice(0, 3) : [String(feedback).trim()];
    const memories = parts.map(part => ({ kind: 'FEEDBACK', subjectKey: subjectKeyFor(part), content: `${context ? `${context}: ` : ''}${part}`, attributes: { polarity: polarityOf(part), outcome, company, role, extractedBy: 'heuristic' } }));
    if (outcome) memories.push({ kind: 'APPLICATION_OUTCOME', subjectKey: `topic:${slug(company || role || 'application')}-outcome`, content: `${context || 'Application'} ended as: ${outcome}`, attributes: { outcome, company, role, extractedBy: 'heuristic' } });
    return memories;
}

// ---------- write path ----------
function decide(newMemory, candidate) {
    const sameSubject = candidate.subject_key === newMemory.subjectKey;
    if (candidate.similarity >= DUPLICATE_SIMILARITY && candidate.kind === newMemory.kind) return 'duplicate';
    if (!sameSubject) return 'compatible';
    const newPolarity = newMemory.attributes?.polarity;
    const oldPolarity = candidate.attributes?.polarity;
    if (newMemory.kind === 'SKILL' && candidate.kind === 'SKILL') return 'supersedes';
    if (newMemory.kind === 'SKILL' && candidate.kind === 'FEEDBACK' && oldPolarity === 'gap') return 'closes_gap';
    if (newMemory.kind === 'FEEDBACK' && newPolarity === 'gap' && candidate.kind === 'SKILL') return 'conflicts';
    if (['PROFILE_FACT', 'PITCH_LEARNING'].includes(newMemory.kind) && candidate.kind === newMemory.kind) return 'supersedes';
    return 'compatible';
}

export async function storeMemory(pool, input) {
    const kind = KINDS.includes(input.kind) ? input.kind : 'FEEDBACK';
    const content = String(input.content || '').trim();
    if (!content) throw new Error('Memory content is required.');
    const subjectKey = normaliseSubjectKey(input.subjectKey, content, kind);
    const attributes = { ...(input.attributes || {}) };
    if (!attributes.polarity) attributes.polarity = polarityOf(content);
    const source = SOURCES.includes(input.source) ? input.source : 'USER_INPUT';
    const contentHash = hashOf(kind, subjectKey, content);

    const existing = await pool.query('SELECT id FROM joby_memories WHERE content_hash = $1', [contentHash]);
    if (existing.rows[0]) {
        const { rows } = await pool.query(`UPDATE joby_memories SET last_confirmed_at = now(), confidence = LEAST(1, confidence + 0.1),
            status = CASE WHEN status = 'STALE' THEN 'ACTIVE' ELSE status END, updated_at = now() WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`, [existing.rows[0].id]);
        return { action: 'confirmed', memory: rows[0], changes: [] };
    }

    const [vector] = await embed(`${content}${attributes.role ? ` (role: ${attributes.role})` : ''}`);
    const vec = toVector(vector);
    const { rows: candidates } = await pool.query(`SELECT id, kind, subject_key, content, attributes, confidence, 1 - (embedding <=> $1::vector) AS similarity
        FROM joby_memories WHERE status IN ('ACTIVE','STALE') AND (subject_key = $2 OR 1 - (embedding <=> $1::vector) > $3)
        ORDER BY embedding <=> $1::vector LIMIT 10`, [vec, subjectKey, CANDIDATE_SIMILARITY]);
    const newMemory = { kind, subjectKey, attributes };
    const decisions = candidates.map(candidate => ({ candidate, decision: decide(newMemory, candidate) }));

    const duplicate = decisions.find(d => d.decision === 'duplicate');
    if (duplicate) {
        const { rows } = await pool.query(`UPDATE joby_memories SET last_confirmed_at = now(), confidence = LEAST(1, confidence + 0.1), status = 'ACTIVE', updated_at = now() WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`, [duplicate.candidate.id]);
        return { action: 'confirmed', memory: rows[0], changes: [] };
    }

    const id = crypto.randomUUID();
    const conflicts = decisions.filter(d => d.decision === 'conflicts').map(d => d.candidate.id);
    if (conflicts.length) attributes.conflictsWith = conflicts;
    const client = await pool.connect();
    const changes = [];
    try {
        await client.query('BEGIN');
        const { rows } = await client.query(`INSERT INTO joby_memories (id, kind, source, subject_key, content, attributes, content_hash, embedding, embedding_model, confidence, application_id, job_snapshot_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8::vector,$9,$10,$11,$12) RETURNING ${PUBLIC_COLUMNS}`,
            [id, kind, source, subjectKey, content, attributes, contentHash, vec, EMBEDDING_MODEL, input.confidence ?? (source === 'AGENT_INFERRED' ? 0.6 : 0.8), input.applicationId || null, input.jobSnapshotId || null]);
        for (const { candidate, decision } of decisions) {
            if (decision === 'supersedes' || decision === 'closes_gap') {
                await client.query(`UPDATE joby_memories SET status = 'SUPERSEDED', valid_until = now(), superseded_by = $2,
                    attributes = attributes || $3::jsonb, updated_at = now() WHERE id = $1`, [candidate.id, id, { resolution: decision === 'closes_gap' ? 'gap_closed' : 'replaced' }]);
                changes.push({ id: candidate.id, content: candidate.content, action: decision === 'closes_gap' ? 'gap_closed' : 'superseded' });
            } else if (decision === 'conflicts') {
                await client.query(`UPDATE joby_memories SET confidence = GREATEST(0.1, confidence - 0.2), attributes = jsonb_set(attributes, '{conflictsWith}', COALESCE(attributes->'conflictsWith','[]'::jsonb) || $2::jsonb), updated_at = now() WHERE id = $1`, [candidate.id, JSON.stringify([id])]);
                changes.push({ id: candidate.id, content: candidate.content, action: 'conflict_flagged' });
            }
        }
        await client.query('COMMIT');
        return { action: 'created', memory: rows[0], changes };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function ingestFeedback(pool, { jobDescription, feedback, outcome, company, role, applicationId, jobSnapshotId, apiKey }) {
    if (!String(feedback || '').trim()) throw new Error('Feedback text is required.');
    const extracted = await extractMemories({ feedback, jobDescription, outcome, company, role, apiKey });
    const results = [];
    for (const memory of extracted) {
        results.push(await storeMemory(pool, { ...memory, source: 'USER_FEEDBACK', applicationId, jobSnapshotId }));
    }
    return results;
}

// ---------- read path ----------
const PUBLIC_COLUMNS = `id, kind, status, source, subject_key AS "subjectKey", content, attributes, confidence, valid_from AS "validFrom", valid_until AS "validUntil",
    last_confirmed_at AS "lastConfirmedAt", last_retrieved_at AS "lastRetrievedAt", retrieval_count AS "retrievalCount", superseded_by AS "supersededBy",
    application_id AS "applicationId", created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function retrieveMemories(pool, { jobDescription, runId = null, k = 8, kinds = null }) {
    const jd = String(jobDescription || '').trim();
    if (!jd) return { memories: [], runId };
    const requirements = firstRequirements(jd).slice(0, 12);
    const queries = [jd.slice(0, 1500), ...requirements];
    const vectors = await embed(queries);
    const kindFilter = Array.isArray(kinds) && kinds.length ? kinds.filter(x => KINDS.includes(x)) : KINDS;

    const perQuery = await Promise.all(vectors.map(v => pool.query(`SELECT ${PUBLIC_COLUMNS}, embedding::text AS embedding_text, 1 - (embedding <=> $1::vector) AS similarity
        FROM joby_memories WHERE status IN ('ACTIVE','STALE') AND kind = ANY($2) ORDER BY embedding <=> $1::vector LIMIT 20`, [toVector(v), kindFilter])));
    const merged = new Map();
    perQuery.forEach(({ rows }, queryIndex) => rows.forEach(row => {
        const prev = merged.get(row.id);
        if (!prev || row.similarity > prev.similarity) merged.set(row.id, { ...row, matchedRequirement: queryIndex === 0 ? null : queries[queryIndex] });
    }));

    const now = Date.now();
    const scored = [...merged.values()].filter(m => m.similarity >= MIN_RETRIEVAL_SIMILARITY).map(m => {
        const ageDays = (now - new Date(m.lastConfirmedAt || m.createdAt).getTime()) / 86400000;
        const recency = Math.exp(-ageDays / 180);
        let score = 0.65 * m.similarity + 0.15 * m.confidence + 0.15 * recency + 0.05 * (KIND_BOOST[m.kind] || 0);
        if (m.status === 'STALE') score *= 0.6;
        return { ...m, recency, score, vector: parseVector(m.embedding_text) };
    }).sort((a, b) => b.score - a.score);

    // Maximal marginal relevance keeps the ledger diverse.
    const picked = [];
    while (picked.length < k && scored.length) {
        let bestIndex = 0, bestValue = -Infinity;
        scored.forEach((candidate, index) => {
            const redundancy = picked.length ? Math.max(...picked.map(p => cosine(p.vector, candidate.vector))) : 0;
            const value = 0.7 * candidate.score - 0.3 * redundancy;
            if (value > bestValue) { bestValue = value; bestIndex = index; }
        });
        picked.push(scored.splice(bestIndex, 1)[0]);
    }

    const memories = picked.map((m, index) => {
        const { vector, embedding_text, ...rest } = m;
        return { ...rest, rank: index + 1, ref: `M${index + 1}`, similarity: Number(m.similarity.toFixed(4)), score: Number(m.score.toFixed(4)) };
    });
    if (memories.length) {
        await pool.query(`UPDATE joby_memories SET last_retrieved_at = now(), retrieval_count = retrieval_count + 1 WHERE id = ANY($1)`, [memories.map(m => m.id)]);
        if (runId) {
            for (const m of memories) {
                await pool.query(`INSERT INTO joby_memory_retrievals (id, run_id, memory_id, similarity, score, rank, matched_requirement) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                    [crypto.randomUUID(), runId, m.id, m.similarity, m.score, m.rank, m.matchedRequirement]);
            }
        }
    }
    return { memories, runId };
}

export function memoryPromptBlock(memories = []) {
    if (!memories.length) return '';
    const guidance = { FEEDBACK: m => m.attributes?.polarity === 'gap' ? 'address this gap with honest, supported evidence if the role needs it' : 'reuse what worked', SKILL: () => 'current, verified skill level - prefer it over older CV wording', PITCH_LEARNING: () => 'apply to the summary / pitch', PROFILE_FACT: () => 'respect this constraint', APPLICATION_OUTCOME: () => 'context from a past application' };
    return [
        'CAREER MEMORY (retrieved from past applications and recruiter feedback; most relevant first):',
        ...memories.map(m => `[${m.ref}] (${m.kind}${m.status === 'STALE' ? ', possibly outdated' : ''}) ${m.content} -> ${(guidance[m.kind] || (() => 'consider'))(m)}`),
        'Use these memories only when they are relevant and never invent experience to close a gap. List the refs you actually used in a root-level "_memoryRefsUsed" array of strings (e.g. ["M1","M3"]); this is the only extra key allowed.'
    ].join('\n');
}

export async function markRunCitations(pool, runId, memoryIds = []) {
    if (!runId || !memoryIds.length) return 0;
    const { rowCount } = await pool.query('UPDATE joby_memory_retrievals SET cited = true WHERE run_id = $1 AND memory_id = ANY($2)', [runId, memoryIds]);
    await pool.query('UPDATE joby_memories SET confidence = LEAST(1, confidence + 0.02) WHERE id = ANY($1)', [memoryIds]);
    return rowCount;
}

export async function listMemories(pool, { status, kind } = {}) {
    const filters = [], params = [];
    if (status && STATUSES.includes(status)) { params.push(status); filters.push(`status = $${params.length}`); }
    if (kind && KINDS.includes(kind)) { params.push(kind); filters.push(`kind = $${params.length}`); }
    const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM joby_memories ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 500`, params);
    return rows;
}

export async function updateMemory(pool, id, { action, content }) {
    const { rows: [memory] } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM joby_memories WHERE id = $1`, [id]);
    if (!memory) return null;
    if (action === 'confirm') {
        await pool.query(`UPDATE joby_memories SET status = 'ACTIVE', last_confirmed_at = now(), confidence = LEAST(1, GREATEST(confidence, 0.8) + 0.1), updated_at = now() WHERE id = $1`, [id]);
        const conflicts = memory.attributes?.conflictsWith || [];
        if (conflicts.length) await pool.query(`UPDATE joby_memories SET status = 'CONTRADICTED', valid_until = now(), updated_at = now() WHERE id = ANY($1) AND status IN ('ACTIVE','STALE')`, [conflicts]);
    } else if (action === 'archive') {
        await pool.query(`UPDATE joby_memories SET status = 'ARCHIVED', valid_until = now(), updated_at = now() WHERE id = $1`, [id]);
    } else if (action === 'restore') {
        await pool.query(`UPDATE joby_memories SET status = 'ACTIVE', valid_until = NULL, updated_at = now() WHERE id = $1`, [id]);
    } else if (typeof content === 'string' && content.trim()) {
        const [vector] = await embed(content);
        await pool.query(`UPDATE joby_memories SET content = $2, content_hash = $3, embedding = $4::vector, embedding_model = $5, last_confirmed_at = now(), updated_at = now() WHERE id = $1`,
            [id, content.trim(), hashOf(memory.kind, memory.subjectKey, content), toVector(vector), EMBEDDING_MODEL]);
    } else {
        throw new Error('Use action confirm | archive | restore, or provide new content.');
    }
    const { rows: [updated] } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM joby_memories WHERE id = $1`, [id]);
    return updated;
}

export async function memoryHistory(pool, id) {
    const { rows } = await pool.query(`WITH RECURSIVE older AS (
            SELECT ${PUBLIC_COLUMNS}, 0 AS depth FROM joby_memories WHERE id = $1
            UNION ALL SELECT m.id, m.kind, m.status, m.source, m.subject_key, m.content, m.attributes, m.confidence, m.valid_from, m.valid_until, m.last_confirmed_at, m.last_retrieved_at,
                m.retrieval_count, m.superseded_by, m.application_id, m.created_at, m.updated_at, o.depth - 1 FROM joby_memories m JOIN older o ON m.superseded_by = o.id WHERE o.depth > -20
        ), newer AS (
            SELECT ${PUBLIC_COLUMNS}, 0 AS depth FROM joby_memories WHERE id = $1
            UNION ALL SELECT m.id, m.kind, m.status, m.source, m.subject_key, m.content, m.attributes, m.confidence, m.valid_from, m.valid_until, m.last_confirmed_at, m.last_retrieved_at,
                m.retrieval_count, m.superseded_by, m.application_id, m.created_at, m.updated_at, n.depth + 1 FROM joby_memories m JOIN newer n ON n."supersededBy" = m.id WHERE n.depth < 20
        ) SELECT * FROM (SELECT * FROM older UNION SELECT * FROM newer) chain ORDER BY depth`, [id]);
    return rows;
}

export async function markStaleMemories(pool) {
    const cases = Object.entries(TTL_DAYS).map(([kind, days]) => `(kind = '${kind}' AND GREATEST(created_at, COALESCE(last_confirmed_at, created_at)) < now() - interval '${days} days')`).join(' OR ');
    const { rowCount } = await pool.query(`UPDATE joby_memories SET status = 'STALE', updated_at = now() WHERE status = 'ACTIVE' AND (${cases})`);
    return rowCount;
}

export async function memoryMetrics(pool) {
    const [byStatus, byKind, gaps, runs, weekly, cited] = await Promise.all([
        pool.query('SELECT status, count(*)::int AS count FROM joby_memories GROUP BY status'),
        pool.query(`SELECT kind, count(*)::int AS count FROM joby_memories WHERE status IN ('ACTIVE','STALE') GROUP BY kind`),
        pool.query(`SELECT count(*) FILTER (WHERE attributes->>'polarity' = 'gap')::int AS total,
            count(*) FILTER (WHERE attributes->>'polarity' = 'gap' AND attributes->>'resolution' = 'gap_closed')::int AS closed
            FROM joby_memories WHERE kind = 'FEEDBACK'`),
        pool.query(`SELECT r.id, r.created_at AS "ranAt", r.baseline, r.result->'metrics' AS after,
            (SELECT count(*)::int FROM joby_memory_retrievals mr WHERE mr.run_id = r.id) AS retrieved,
            (SELECT count(*)::int FROM joby_memory_retrievals mr WHERE mr.run_id = r.id AND mr.cited) AS cited
            FROM joby_tailoring_runs r ORDER BY r.created_at DESC LIMIT 30`),
        pool.query(`SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week, count(*)::int AS added FROM joby_memories GROUP BY 1 ORDER BY 1 DESC LIMIT 12`),
        pool.query('SELECT count(*)::int AS retrieved, count(*) FILTER (WHERE cited)::int AS cited FROM joby_memory_retrievals')
    ]);
    const ratio = m => m && Number(m.total) ? Number(m.matched) / Number(m.total) : null;
    const runList = runs.rows.reverse().map(r => ({ id: r.id, ranAt: r.ranAt, retrieved: r.retrieved, cited: r.cited, memoryAssisted: r.retrieved > 0,
        coverageBefore: ratio(r.baseline), coverageAfter: ratio(r.after), lift: ratio(r.after) !== null && ratio(r.baseline) !== null ? ratio(r.after) - ratio(r.baseline) : null }));
    const avg = list => list.length ? list.reduce((s, v) => s + v, 0) / list.length : null;
    const lifts = assisted => runList.filter(r => r.memoryAssisted === assisted && r.lift !== null).map(r => r.lift);
    return {
        statusCounts: Object.fromEntries(byStatus.rows.map(r => [r.status, r.count])),
        kindCounts: Object.fromEntries(byKind.rows.map(r => [r.kind, r.count])),
        gaps: gaps.rows[0],
        citations: cited.rows[0],
        runs: runList,
        averageLift: { withMemory: avg(lifts(true)), withoutMemory: avg(lifts(false)) },
        weekly: weekly.rows.reverse()
    };
}
