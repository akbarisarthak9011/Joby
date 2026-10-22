import fs from 'fs';
const appJs = fs.readFileSync('app.js', 'utf-8');

import defaultCv from './default-cv.json' with { type: 'json' };
import defaultCvEn from './default-cv-en.json' with { type: 'json' };
import defaultCvJob from './default-cv-job.json' with { type: 'json' };
import defaultCvEnJob from './default-cv-en-job.json' with { type: 'json' };

const state = {
  job: 'Marketing Manager',
  priority: ''
};

function isEnglishJob(){const text=String(state.job||'').toLowerCase();const english=(text.match(/\b(the|and|with|role|experience|skills|requirements|company|responsibilities|marketing|looking)\b/g)||[]).length;const french=(text.match(/\b(le|la|les|des|avec|poste|compétences|expérience|recherche|entreprise)\b/g)||[]).length;return english>french;}
function targetLanguage(){return isEnglishJob()?'English':'French';}
function defaultCvFor(language,track='alternance'){return language==='en'?(track==='job'?defaultCvEnJob:defaultCvEn):(track==='job'?defaultCvJob:defaultCv);}

function promptText(track='alternance'){
  const language=targetLanguage();
  const source=defaultCvFor(language==='English'?'en':'fr',track);
  const trackName=track==='job'?'REGULAR JOB (FULL-TIME / PERMANENT)':'ALTERNANCE (WORK-STUDY)';
  const jobRule=track==='job'
    ? `\n15. REGULAR JOB RULE: This prompt is for a regular job (NOT an alternance/work-study position). Do NOT include any references to alternance, work-study rhythm, or school schedules in subtitle, summary, or education. Keep personal.subtitle aligned with professional experience (e.g. "${language==='English'?'Digital marketing, acquisition & growth':'Marketing digital, acquisition & croissance'}"). Do NOT mention Sup de Pub alternance degree.`
    : `\n15. ALTERNANCE RULE: Keep candidate status relevant to work-study where applicable.`;

  return `Create a ${track==='job'?'regular job':'work-study (alternance)'} CV from the DEFAULT SOURCE CV (${trackName}) and TARGET JOB DESCRIPTION below. Always start from this default CV, even if another adapted CV was previously pasted into the application.\n\nSTRICT OUTPUT CONTRACT:\n1. Return ONLY one valid JSON object. The first character must be { and the last character must be }. No markdown fences, comments, explanations, or text outside JSON.\n2. Preserve the exact source schema, field names, nested object shapes, and array types. Do not add, remove, or rename fields. The result must work with JSON.parse.\n3. Keep contact details, employers, institutions, locations, dates, certifications, factual metrics, and URLs accurate. Do not invent employment, achievements, tools, credentials, responsibilities, or results.\n4. OUTPUT LANGUAGE: ${language}. Write every candidate-facing field in ${language}. Keep names, employers, locations, dates, contact details, URLs, and filenames unchanged.\n5. Rewrite personal.role each time as a simple 2-5 word job title that fits the position and is supported by the CV.\n\nSKILLS: ROLE-SPECIFIC AND EASY TO UNDERSTAND:\n6. Completely rebuild the skills array for this job. First identify the job's priorities, then compare every requested skill with evidence from the source skills, tools, experience bullets, education, languages, certifications, and projects.\n7. Use clear employer-friendly terminology when a requested skill is genuinely equivalent, adjacent, or reasonably demonstrated. Do not mechanically copy the source wording. For example, social media community animation may become community management; ASO and SEO may become organic acquisition; bilingual language ability plus content writing may become bilingual content writing.\n8. Do NOT copy every keyword from the job offer. Use the employer's wording only where there is a clear and explainable link to the source CV. If the connection would be difficult to explain in an interview, leave it out.\n9. Return 7-10 focused skill strings: normally 4-6 role-relevant capabilities followed by 3-4 actual named tools or platforms. Remove or deprioritise skills with little relevance. Keep capabilities separate from tools: community management, content strategy, stakeholder coordination, bilingual writing, and conversion optimisation are capabilities, not tools.\n9a. TOOL INFERENCE: When a job description names a broad capability but not a software product, include the relevant named tools already proven in the DEFAULT SOURCE CV when they naturally support that capability. Examples: SEO, organic acquisition, or technical optimisation may justify Semrush and Ahrefs; reporting, measurement, or performance analysis may justify GA4, Looker Studio, and Google Tag Manager; content production may justify Photoshop, Illustrator, or Premiere Pro; website or content operations may justify WordPress and HTML/CSS. Do this only when the tool is in the source CV and directly relevant to the target role. Do not wait for the job post to name the tool.\n10. Adapt assertively but credibly. Transferable skills may be reframed in the job's vocabulary, but do not claim a specific software, channel, methodology, language level, credential, responsibility, or result that source evidence cannot reasonably support.\n\nPERSONALISATION:\n11. Make the summary, role title, skills, experience bullets, and education descriptions tell one coherent story for this role. Keep the writing concise and natural, never generic.\n12. Treat Freelance Growth & Digital as an adaptable evidence base for app growth, ASO, acquisition, monetisation, WordPress, creative production, and client projects. Tailor Continuous Self-Training toward relevant growth, ASO, AI, digital tools, experimentation, and learning; tailor the English and Linguistics degree toward relevant bilingual communication, writing, editorial analysis, content, and cross-cultural skills.\n13. Use at most 3 concise, achievement-focused bullets per experience. Preserve numbers exactly when present. Keep the full CV suitable for one A4 page.\n14. Use normal hyphens only, never em dashes or en dashes.${jobRule}\n\nBefore answering, silently check: valid JSON, exact schema, correct language, clear role title, a newly tailored skills array, only credible claims, and concise one-page content.\n\nDEFAULT SOURCE CV JSON (${trackName}):\n${JSON.stringify(source,null,2)}\n\nTARGET JOB DESCRIPTION:\n${state.job}\n\nPRIORITY INSTRUCTION:\n${state.priority||'None.'}`;
}

try {
  console.log("Testing alternance:");
  console.log(promptText('alternance').substring(0, 100));
  console.log("Testing job:");
  console.log(promptText('job').substring(0, 100));
} catch(e) {
  console.error("Error in promptText:", e);
}
