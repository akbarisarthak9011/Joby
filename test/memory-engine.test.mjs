import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { MEMORY_SCHEMA_SQL, subjectKeyFor, extractMemories, memoryPromptBlock, storeMemory, ingestFeedback, retrieveMemories, markRunCitations, memoryHistory, updateMemory, markStaleMemories, memoryMetrics } from '../memory-engine.js';

describe('memory helpers', () => {
    test('subjectKeyFor picks the first skill mentioned', () => {
        assert.equal(subjectKeyFor('Lacked Power BI experience'), 'skill:power-bi');
        assert.equal(subjectKeyFor('Tableau and SQL'), 'skill:tableau');
        assert.match(subjectKeyFor('Wanted a stronger portfolio site', 'PROFILE_FACT'), /^skill:portfolio$/);
        assert.match(subjectKeyFor('Prefers remote work in Paris', 'PROFILE_FACT'), /^profile:/);
    });

    test('heuristic extraction splits mixed feedback into gap and strength', async () => {
        const memories = await extractMemories({ feedback: 'Rejected because I lacked Tableau experience; they liked my SQL warehouse project.', company: 'Acme', role: 'BI Analyst', outcome: 'rejected', apiKey: '' });
        const feedback = memories.filter(m => m.kind === 'FEEDBACK');
        assert.deepEqual(feedback.map(m => [m.subjectKey, m.attributes.polarity]), [['skill:tableau', 'gap'], ['skill:sql', 'strength']]);
        assert.ok(memories.some(m => m.kind === 'APPLICATION_OUTCOME'));
    });

    test('prompt block lists refs and asks for cited refs', () => {
        const block = memoryPromptBlock([{ ref: 'M1', kind: 'SKILL', content: 'Advanced SQL project', attributes: {} }]);
        assert.match(block, /\[M1\] \(SKILL\) Advanced SQL project/);
        assert.match(block, /_memoryRefsUsed/);
        assert.equal(memoryPromptBlock([]), '');
    });
});

const url = process.env.MEMORY_TEST_DATABASE_URL;
describe('memory engine on PostgreSQL + pgvector', { skip: !url && 'set MEMORY_TEST_DATABASE_URL to run' }, () => {
    let pool;
    before(async () => {
        pool = new pg.Pool({ connectionString: url, ssl: /sslmode=disable/i.test(url || '') ? false : { rejectUnauthorized: true } });
        await pool.query(MEMORY_SCHEMA_SQL);
        await pool.query('CREATE TABLE IF NOT EXISTS joby_tailoring_runs (id text PRIMARY KEY, snapshot_id text, source text NOT NULL, baseline jsonb, result jsonb, created_at timestamptz NOT NULL DEFAULT now())');
        await pool.query('TRUNCATE joby_memory_retrievals, joby_memories, joby_tailoring_runs');
    });
    after(async () => pool?.end());

    const ids = {};
    test('newer skill evidence supersedes the older level', async () => {
        const old = await storeMemory(pool, { kind: 'SKILL', content: 'Intermediate SQL - basic joins and aggregations in coursework' });
        const fresh = await storeMemory(pool, { kind: 'SKILL', content: 'Advanced SQL - built a 40-table analytics warehouse with window functions' });
        assert.equal(old.memory.subjectKey, 'skill:sql');
        assert.deepEqual(fresh.changes.map(c => [c.id, c.action]), [[old.memory.id, 'superseded']]);
        const history = await memoryHistory(pool, fresh.memory.id);
        assert.deepEqual(history.map(m => m.status), ['SUPERSEDED', 'ACTIVE']);
        ids.sql = fresh.memory.id;
    });

    test('feedback gap is closed by later skill evidence', async () => {
        const [gap] = await ingestFeedback(pool, { feedback: 'Rejected because I lacked Power BI experience', company: 'Acme', role: 'Data Analyst', jobDescription: 'Data Analyst with Power BI' });
        assert.equal(gap.memory.attributes.polarity, 'gap');
        const skill = await storeMemory(pool, { kind: 'SKILL', content: 'Completed a Power BI sales dashboard project with DAX measures' });
        assert.deepEqual(skill.changes.map(c => c.action), ['gap_closed']);
        const metrics = await memoryMetrics(pool);
        assert.equal(metrics.gaps.closed, 1);
        ids.powerBi = skill.memory.id;
    });

    test('duplicates are confirmed instead of inserted', async () => {
        const again = await storeMemory(pool, { kind: 'SKILL', content: 'Completed a Power BI sales dashboard project with DAX measures' });
        assert.equal(again.action, 'confirmed');
        assert.equal(again.memory.id, ids.powerBi);
    });

    test('contradicting feedback is flagged and lowers confidence', async () => {
        const res = await storeMemory(pool, { kind: 'FEEDBACK', content: 'Initech - BI Analyst: they said my SQL was too weak for the role' });
        assert.deepEqual(res.changes.map(c => [c.id, c.action]), [[ids.sql, 'conflict_flagged']]);
        const { rows } = await pool.query('SELECT confidence, attributes FROM joby_memories WHERE id = $1', [ids.sql]);
        assert.ok(rows[0].confidence < 0.8);
        assert.deepEqual(rows[0].attributes.conflictsWith, [res.memory.id]);
        const confirmed = await updateMemory(pool, ids.sql, { action: 'confirm' });
        assert.equal(confirmed.status, 'ACTIVE');
        assert.equal(confirmed.attributes.conflictsWith, undefined);
        const { rows: [feedback] } = await pool.query('SELECT status FROM joby_memories WHERE id = $1', [res.memory.id]);
        assert.equal(feedback.status, 'CONTRADICTED');
    });

    test('retrieval ranks relevant memories, logs them and records citations', async () => {
        const { memories } = await retrieveMemories(pool, { jobDescription: 'BI Analyst. Requirements: Power BI dashboards and DAX measures for sales reporting.', runId: 'run_test' });
        const promptBlock = memoryPromptBlock(memories);
        assert.ok(memories.length > 0);
        assert.equal(memories[0].id, ids.powerBi);
        assert.equal(memories[0].ref, 'M1');
        assert.ok(memories.every(m => !['SUPERSEDED', 'ARCHIVED'].includes(m.status)));
        assert.match(promptBlock, /\[M1\]/);
        await markRunCitations(pool, 'run_test', [ids.powerBi]);
        const { rows } = await pool.query('SELECT memory_id FROM joby_memory_retrievals WHERE run_id = $1 AND cited', ['run_test']);
        assert.deepEqual(rows.map(r => r.memory_id), [ids.powerBi]);
    });

    test('metrics compare coverage lift with and without memory', async () => {
        const run = (id, before, after) => pool.query(`INSERT INTO joby_tailoring_runs (id, source, baseline, result) VALUES ($1, 'test', $2, $3)`, [id, { matched: before, total: 10 }, { metrics: { matched: after, total: 10 } }]);
        await run('run_plain', 3, 4);
        await run('run_test', 3, 7);
        const metrics = await memoryMetrics(pool);
        assert.ok(Math.abs(metrics.averageLift.withMemory - 0.4) < 1e-9);
        assert.ok(Math.abs(metrics.averageLift.withoutMemory - 0.1) < 1e-9);
        assert.equal(metrics.citations.cited, 1);
        assert.equal(metrics.runs.find(r => r.id === 'run_test').memoryAssisted, true);
    });

    test('archived memories are not retrieved', async () => {
        await updateMemory(pool, ids.powerBi, { action: 'archive' });
        const { memories } = await retrieveMemories(pool, { jobDescription: 'Power BI dashboards and DAX measures' });
        assert.ok(!memories.some(m => m.id === ids.powerBi));
        await updateMemory(pool, ids.powerBi, { action: 'restore' });
    });

    test('old unconfirmed memories become stale', async () => {
        await pool.query(`UPDATE joby_memories SET last_confirmed_at = now() - interval '3 years', created_at = now() - interval '3 years' WHERE id = $1`, [ids.sql]);
        await markStaleMemories(pool);
        const { rows } = await pool.query('SELECT status FROM joby_memories WHERE id = $1', [ids.sql]);
        assert.equal(rows[0].status, 'STALE');
    });
});
