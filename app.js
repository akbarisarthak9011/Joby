import defaultCv from './default-cv.json';
import defaultCvEn from './default-cv-en.json';
import defaultCvJob from './default-cv-job.json';
import defaultCvEnJob from './default-cv-en-job.json';
import defaultCvBroad from './default-cv-broad.json';
import defaultCvBroadEn from './default-cv-broad-en.json';
import defaultCvBroadJob from './default-cv-broad-job.json';
import defaultCvBroadEnJob from './default-cv-broad-en-job.json';
import defaultCvWebmaster from './default-cv-webmaster.json';
import defaultCvWebmasterEn from './default-cv-webmaster-en.json';
import defaultCvWebmasterJob from './default-cv-webmaster-job.json';
import defaultCvWebmasterEnJob from './default-cv-webmaster-en-job.json';
import { icon } from './icons.js';
import './style.css';
import './enhancements.css';
import './refinements.css';

const KEY = 'cv-adapt-cv-v1';
const BASE_CV_KEY = 'joby-base-cv-v1';
const TAILORED_CV_KEY = 'joby-tailored-cv-v1';
const DESIGN_KEY = 'cv-adapt-default-design';
const SCHOOL_KEY = 'cv-adapt-school';
const VIEW_KEY = 'cv-adapt-view';
const APPS_LOCAL_KEY = 'cv-adapt-applications-cache';
const DEMO_JOB_TEXT = 'We are looking for a Digital Marketing Lead to own SEO strategy, content operations, lifecycle marketing, and reporting. You will lead a small team, partner with product, and grow qualified pipeline through data-informed experiments.';

const SCHOOL_CONFIG = {
  hetic: {
    key: 'hetic',
    name: 'HETIC',
    degreeFr: "Master's in Digital Marketing & UX",
    degreeEn: "Master's in Digital Marketing & UX",
    rhythmFr: '3 weeks at the company / 1 week at school',
    rhythmEn: "3 weeks company / 1 week school",
    shortRhythm: "3 weeks / 1 week",
    subtitleFr: 'Work-study candidate (3 weeks at the company / 1 week at school)',
    subtitleEn: "Work-study candidate (3 weeks company / 1 week school)",
    clFrSnippet: "Currently admitted to the Master's in Digital Marketing & UX at HETIC on a 3-week company / 1-week school schedule,",
    clEnSnippet: "Currently admitted to the Master's in Digital Marketing & UX at HETIC on a 3-week company / 1-week school schedule,"
  },
  iscom: {
    key: 'iscom',
    name: 'ISCOM',
    degreeFr: 'Digital Communication, Social Media and Community Management',
    degreeEn: 'Digital Communication, Social Media and Community Management',
    rhythmFr: '4 days at the company / 1 day at school',
    rhythmEn: "4 days company / 1 day school",
    shortRhythm: "4 days / 1 day",
    subtitleFr: 'Work-study candidate (4 days at the company / 1 day at school)',
    subtitleEn: "Work-study candidate (4 days company / 1 day school)",
    clFrSnippet: "Currently admitted to the Digital Communication, Social Media and Community Management program at ISCOM on a 4-day company / 1-day school schedule,",
    clEnSnippet: "Currently admitted to the Digital Communication, Social Media and Community Management program at ISCOM on a 4-day company / 1-day school schedule,"
  }
};
SCHOOL_CONFIG.inseec = SCHOOL_CONFIG.iscom;

const savedDefaultDesign = localStorage.getItem(DESIGN_KEY) || 'studio';
const settings = { template: savedDefaultDesign, defaultTemplate: savedDefaultDesign, font: 12, margin: 8.5, line: 1.28, photo: false, coverLetter: false, editMode: false, hideSummary: false, hideSkills: false, hideLanguages: false, hideCertifications: false, hideExperience: false, hideEducation: false, hideLinkedin: false, hideWebsite: false, hidePhone: false, hideLocation: false };
function deepMerge(target, source) {
  if (!target || typeof target !== 'object') return JSON.parse(JSON.stringify(source));
  const res = Array.isArray(target) ? [...target] : { ...target };
  for (const k of Object.keys(source)) {
    if (res[k] === undefined || res[k] === null) {
      res[k] = JSON.parse(JSON.stringify(source[k]));
    } else if (typeof source[k] === 'object' && source[k] !== null && !Array.isArray(source[k])) {
      res[k] = deepMerge(res[k], source[k]);
    }
  }
  return res;
}
const savedCvData = (() => {
  try {
    let parsed = JSON.parse(localStorage.getItem(KEY) || '');
    if (parsed && Array.isArray(parsed.education)) {
      parsed.education = parsed.education.filter(e => !/licence|bachelor|uae/i.test((e.degree || '') + ' ' + (e.institution || '')));
    }
    const personal = parsed.personal || {};
    let savedText = JSON.stringify(parsed);
    [personal.name, personal.location, personal.phone, personal.email, personal.linkedin, personal.website].filter(Boolean).forEach(value => {
      savedText = savedText.replaceAll(String(value), '');
    });
    savedText = savedText
      .replace(/https?:\/\/[^\s"\\]+/gi, '')
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '')
      .replace(/\+?\d[\d ()-]{7,}\d/g, '');
    parsed = JSON.parse(savedText);
    // A saved French CV is replaced by the English source profile requested here.
    if (/\b(français|francais)\b/i.test((parsed.languages || []).join(' '))) return null;
    // Keep saved CV content, but use an anonymized generated identity.
    parsed.personal = {
      ...(parsed.personal || {}),
      name: 'Alex Morgan',
      location: '', phone: '', email: '', linkedin: '', website: '', photo: ''
    };
    return parsed;
  } catch (e) { return null; }
})();
const baseCvData = (() => {
  try { const saved=JSON.parse(localStorage.getItem(BASE_CV_KEY)||'null'); if(saved?.personal) return saved; } catch {}
  return JSON.parse(JSON.stringify(savedCvData || defaultCvEn));
})();
if (baseCvData.personal) Object.assign(baseCvData.personal,{name:'Alex Morgan',location:'',phone:'',email:'',linkedin:'',website:'',photo:'',subtitle:''});
baseCvData.education=(baseCvData.education||[]).filter(e=>!/^(iscom|hetic|inseec)$/i.test(String(e.institution||'').trim()));
baseCvData.coverLetter={};
baseCvData.experience=(baseCvData.experience||[]).map((entry,index)=>({...entry,dates:String(entry.dates||'').includes('//')?(defaultCvEn.experience?.[index]?.dates||entry.dates):entry.dates}));
localStorage.setItem(BASE_CV_KEY,JSON.stringify(baseCvData));
const tailoredCvData=(()=>{try{return JSON.parse(localStorage.getItem(TAILORED_CV_KEY)||'null')}catch{return null}})();
const MIGRATION_DEFAULT_SCHOOL_KEY = 'cv-adapt-default-school-iscom-v1';
const initialSchool = (() => {
  const migrated = localStorage.getItem(MIGRATION_DEFAULT_SCHOOL_KEY);
  if (!migrated) {
    localStorage.setItem(MIGRATION_DEFAULT_SCHOOL_KEY, '1');
    localStorage.setItem(SCHOOL_KEY, 'iscom');
    return 'iscom';
  }
  const s = localStorage.getItem(SCHOOL_KEY);
  if (!s || s === 'inseec') {
    localStorage.setItem(SCHOOL_KEY, 'iscom');
    return 'iscom';
  }
  return s;
})();
const state = {
  baseCv: baseCvData,
  cv: tailoredCvData ? deepMerge(tailoredCvData, baseCvData) : JSON.parse(JSON.stringify(baseCvData)),
  job: localStorage.getItem('joby-current-job') || DEMO_JOB_TEXT,
  jobSource: (localStorage.getItem('joby-current-job') || DEMO_JOB_TEXT) === DEMO_JOB_TEXT ? 'demo' : (localStorage.getItem('joby-job-source') || 'user'),
  priority: '', tab: 'adapted', jsonError: '', aiProvider: localStorage.getItem('cv-adapt-provider') || 'gemini', track: 'job', variant: localStorage.getItem('cv-adapt-variant') || 'growth', adapted: false, deepseekKey: localStorage.getItem('cv-adapt-deepseek-key') || '',
  school: initialSchool,
  view: 'cv', // 'cv' | 'tracker'
  adapted: Boolean(tailoredCvData),
  applications: [],
  trackerFilter: 'all',
  trackerSchoolFilter: 'all',
  trackerSearch: '',
  activeModal: null, // null | 'add_app' | 'edit_app' | 'relance' | 'interview_kit'
  modalData: null,
  rehearsalMode: false,
  activeKitTab: 'pitch'
};

if (state.cv && Array.isArray(state.cv.education)) {
  state.cv.education = state.cv.education.filter(e => !/licence|bachelor|uae/i.test((e.degree || '') + ' ' + (e.institution || '')));
}
state.cv.experience=(state.cv.experience||[]).map((entry,index)=>({...entry,dates:String(entry.dates||'').includes('//')?(state.baseCv.experience?.[index]?.dates||entry.dates):entry.dates}));
localStorage.setItem(BASE_CV_KEY,JSON.stringify(state.baseCv));

const $ = (s, root = document) => root.querySelector(s);
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean = v => String(v || '').replace(/[–—]/g, '-');
const save = () => localStorage.setItem(KEY, JSON.stringify(state.cv));
const persistBaseCv = () => localStorage.setItem(BASE_CV_KEY, JSON.stringify(state.baseCv));
function withPreviewCv(cv, render) { const active=state.cv; state.cv=cv||active; try{return render();} finally{state.cv=active;} }
function cleanUrlDisplay(val){if(!val)return '';let str=String(val).trim();const mdMatch=str.match(/\[([^\]]+)\]/);if(mdMatch)str=mdMatch[1];return str.replace(/^https?:\/\//i,'').replace(/\/$/,'');}
function cleanUrlHref(val){if(!val)return '';let str=String(val).trim();const mdMatch=str.match(/\((https?:\/\/[^)]+)\)/i);if(mdMatch)return mdMatch[1];const textMatch=str.match(/\[([^\]]+)\]/);if(textMatch)str=textMatch[1];str=str.replace(/^https?:\/\//i,'');if(!/\.[a-z]{2,}/i.test(str))return '';return `https://${str}`;}
if (state.cv.personal) { Object.assign(state.cv.personal, { name: 'Alex Morgan', location: '', phone: '', email: '', linkedin: '', website: '', photo: '' }); save(); }

function applySchool() {
  if (!state.cv) return;
  state.cv.education = (state.cv.education || []).filter(e => !/^(iscom|hetic|inseec)$/i.test(String(e.institution || '').trim()));
  if (state.cv.personal) state.cv.personal.subtitle = '';
  if (state.cv.coverLetter) {
    const letter = state.cv.coverLetter;
    letter.subject = String(letter.subject || '').replace(/work[- ]study[^\n]*/ig, 'Application');
    letter.paragraph = String(letter.paragraph || '').split(/\n+/).filter(line => !/school|alternance|work[- ]study|admitted to|schedule/i.test(line)).join('\n').trim();
  }
  save();
}

applySchool(state.school, true);


const avatar = () => state.cv.personal.photo || 'profile-avatar.svg';
const cloneCv = cv => JSON.parse(JSON.stringify(cv));
function isEnglishJob(){
  const text=String(state.job||'').trim().toLowerCase();
  if(!text) return isEnglishCv();
  const english=(text.match(/\b(the|and|with|for|you|our|team|requirements|responsibilities|looking for|candidate|skills|qualifications|about us|we are|what you will do|who you are|join our|full-time|part-time|work-study|hybrid|remote|must have|preferred)\b/gi)||[]).length;
  const french=(text.match(/\b(le|la|les|des|du|un|une|avec|pour|dans|chez|sur|vous|nous|notre|votre|vos|nos|poste|missions|profil|recherche|candidat|candidature|entreprise|équipe|equipe|alternance|stage|compétences|competences|expérience|bac|contrat|au sein de)\b/gi)||[]).length + (text.match(/[éèêàâôûùç]/g)||[]).length;
  return english > french;
}
function targetLanguage(){return 'English';}
function jobTitle(){const text=String(state.job||'').replace(/\s+/g,' ').trim();const match=text.match(/(?:looking for|hiring|recherche|poste (?:de|d')|position (?:of|de))\s+(?:a |an |un |une )?([^,.!;]+)/i);const raw=(match?.[1]||state.cv.personal.role||'CV').trim();return raw.split(/\b(?:to|who|with|responsible|for|pour|afin|avec|qui|en charge)\b/i)[0].replace(/\s+/g,' ').trim();}
function slug(value){return String(value||'cv').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase();}
function filenamePart(value){const acronyms=new Set(['SEO','SEA','ASO','GA4','GTM','AI','IA','CRM','CRO']);return slug(value).split('-').filter(Boolean).map(word=>acronyms.has(word.toUpperCase())?word.toUpperCase():word[0].toUpperCase()+word.slice(1)).join('_');}
function suggestedFilename(){const title=state.cv.personal.role||jobTitle();return `CV_${filenamePart(state.cv.personal.name)}_${filenamePart(title)}`;}
function renderFilename(){const tabs=$('.tabs');if(!tabs)return;$('.filename-row')?.remove();tabs.insertAdjacentHTML('beforebegin',`<div class="filename-row"><span>Suggested file name</span><code>${esc(suggestedFilename())}</code><button class="button filename-copy" id="copy-filename">Copy name</button></div>`);}
function addTemplateChoices(){const grid=$('.template-grid');if(!grid||grid.querySelector('[data-template="executive"]'))return;grid.insertAdjacentHTML('beforeend','<button class="template" data-template="executive"><span class="template-swatch executive"></span>Executive</button><button class="template" data-template="modern"><span class="template-swatch modern"></span>Modern</button>');}
function addDefaultDesignControl(){const grid=$('.template-grid');if(!grid||$('.default-design-control'))return;const selected=settings.template[0].toUpperCase()+settings.template.slice(1);const preferred=settings.defaultTemplate[0].toUpperCase()+settings.defaultTemplate.slice(1);grid.insertAdjacentHTML('afterend','<div class="default-design-control"><button class="button secondary" id="set-default-template">Use '+esc(selected)+' as my default design</button><small>Current default: '+esc(preferred)+'</small></div>');}
function setDefaultDesign(){settings.defaultTemplate=settings.template;localStorage.setItem(DESIGN_KEY,settings.defaultTemplate);shell();toast(settings.defaultTemplate[0].toUpperCase()+settings.defaultTemplate.slice(1)+' is now your default design.');}
function defaultCvFor(language,track='alternance',variant=state.variant||'growth'){if(variant==='broad')return track==='job'?defaultCvBroadEnJob:defaultCvBroadEn;if(variant==='webmaster')return track==='job'?defaultCvWebmasterEnJob:defaultCvWebmasterEn;return track==='job'?defaultCvEnJob:defaultCvEn;}
function loadDefaultCv(language,track='alternance',variant=state.variant||'growth',withCoverLetter=false){state.variant=variant;state.track=track;localStorage.setItem('cv-adapt-variant',variant);localStorage.setItem('cv-adapt-track',track);const nextCv=cloneCv(defaultCvFor('en',track,variant));nextCv.personal={...nextCv.personal,name:'Alex Morgan',location:'',phone:'',email:'',linkedin:'',website:'',photo:''};state.cv=nextCv;applySchool(state.school, true);settings.coverLetter=Boolean(withCoverLetter);if(withCoverLetter&&!state.cv.coverLetter){state.cv.coverLetter={};}save();shell();const vLabel=variant==='broad'?'Broad Digital Marketing':variant==='webmaster'?'Webmaster & CMS':'Growth & SEO';toast(`English ${vLabel} (${track==='job'?'regular job':'work-study'})${withCoverLetter?' + cover letter':''} loaded.`);}
function addTopDefaults(){const meta=$('.top-meta');if(!meta||$('.top-defaults'))return;const mkBtns=cl=>['growth','broad','webmaster'].map(variant=>{const suffix=cl?'-cl':'';const label=variant==='broad'?'Broad Digital Marketing':variant==='webmaster'?'Webmaster & CMS':'Growth & SEO';return `<div class="menu-section-title">${label}</div><button data-default-profile="en-alternance-${variant}${suffix}">English work-study</button><button data-default-profile="en-job-${variant}${suffix}">English regular job</button>`;}).join('');meta.insertAdjacentHTML('afterbegin',`<details class="top-defaults"><summary class="button secondary">Default CVs ▾</summary><div class="top-defaults-menu"><div class="menu-tab-row"><button class="menu-tab active" id="tab-cv">CV</button><button class="menu-tab" id="tab-cl">Cover letter</button></div><div id="menu-panel-cv">${mkBtns(false)}</div><div id="menu-panel-cl" style="display:none">${mkBtns(true)}</div></div></details>`);$('#tab-cv')?.addEventListener('click',e=>{$('#menu-panel-cv').style.display='';$('#menu-panel-cl').style.display='none';e.target.classList.add('active');$('#tab-cl').classList.remove('active');});$('#tab-cl')?.addEventListener('click',e=>{$('#menu-panel-cv').style.display='none';$('#menu-panel-cl').style.display='';e.target.classList.add('active');$('#tab-cv').classList.remove('active');});}
function addPromptModes(){const alternance=$('#copy-prompt');if(!alternance||$('#copy-prompt-job'))return;alternance.textContent='Copy alternance AI prompt';alternance.insertAdjacentHTML('afterend','<button class="button copy-ai" id="copy-prompt-job">Copy regular-job AI prompt</button>');}
function addDefaultSourceControls(){const group=$('.cv-language-actions');if(!group||group.querySelector('[data-default-profile]'))return;group.classList.add('cv-default-grid');group.innerHTML=`<div style="grid-column:1/-1;font-weight:700;font-size:10px;margin-top:2px;color:#17687a;text-transform:uppercase">Growth & SEO</div><button class="button secondary" data-default-profile="en-alternance-growth">Work-study</button><button class="button secondary" data-default-profile="en-job-growth">Regular job</button><div style="grid-column:1/-1;font-weight:700;font-size:10px;margin-top:6px;color:#17687a;text-transform:uppercase">Broad Digital Marketing</div><button class="button secondary" data-default-profile="en-alternance-broad">Work-study</button><button class="button secondary" data-default-profile="en-job-broad">Regular job</button><div style="grid-column:1/-1;font-weight:700;font-size:10px;margin-top:6px;color:#17687a;text-transform:uppercase">Webmaster & CMS</div><button class="button secondary" data-default-profile="en-alternance-webmaster">Work-study</button><button class="button secondary" data-default-profile="en-job-webmaster">Regular job</button>`;}
function enhanceControls(){const font=$('#font');if(font){font.max='16';font.value=settings.font;}}
function detectCvLanguage(cvObj = state.cv) {
  if (!cvObj) return 'French';
  const langs = (cvObj.languages || []).join(' ').toLowerCase();
  const hasFrenchLangName = /\b(français|francais|anglais|arabe|espagnol|allemand|langue maternelle)\b/i.test(langs);
  const hasEnglishLangName = /\b(french|english|arabic|spanish|german|native language)\b/i.test(langs);
  if (hasFrenchLangName && !hasEnglishLangName) return 'French';
  if (hasEnglishLangName && !hasFrenchLangName) return 'English';
  
  const text = `${cvObj.personal?.subtitle || ''} ${cvObj.personal?.role || ''} ${cvObj.summary || ''} ${JSON.stringify(cvObj.experience || [])} ${JSON.stringify(cvObj.education || [])}`.toLowerCase();
  const frenchMatches = (text.match(/\b(alternance|candidat|chargé|charge|stage|stagiaire|formation|expériences|experiences|stratégie|strategie|développement|developpement|création|creation|gestion|mise en|auprès|avec|pour|dans|chez|sur|semaine|semaines|sem|rentrée|rentree|bac|licence|mastère|mastere)\b/gi) || []).length + (text.match(/[éèêàâôûùç]/g) || []).length;
  const englishMatches = (text.match(/\b(work-study|internship|intern|responsibilities|achievements|bachelor|master's|degree|implemented|streamlined|leveraged|managed|spearheaded|spearheading|with|from|school|weeks|week|seeking|candidate|driven|full-time)\b/gi) || []).length;
  if (frenchMatches > 0 || englishMatches > 0) {
    return englishMatches > frenchMatches ? 'English' : 'French';
  }
  return 'French';
}
function isEnglishCv(){return true;}
function cvLabels(){return {summary:'Summary',skills:'Skills',languages:'Languages',certifications:'Certifications',experience:'Experience',education:'Education',strategy:'Strategy & acquisition',analytics:'Data, analysis & optimisation',content:'Content & community',core:'Key skills',tools:'Tools & platforms'};}

function enhanceContact(){document.querySelectorAll('.contact').forEach(contact=>{const p=state.cv.personal||{};const items=[['location',p.location,'',settings.hideLocation],['phone',p.phone,`tel:${String(p.phone||'').replace(/\s/g,'')}`,settings.hidePhone],['email',p.email,`mailto:${p.email||''}`,false],['linkedin',p.linkedin,cleanUrlHref(p.linkedin),settings.hideLinkedin],['website',p.website,cleanUrlHref(p.website),settings.hideWebsite]].filter(([,value,,hidden])=>value&&!hidden);contact.innerHTML=items.map(([type,value,href])=>{const text=`<span ${settings.editMode?`contenteditable data-path="personal.${type}"`:''}>${esc(value)}</span>`;return href&&!settings.editMode?`<a class="contact-item" href="${esc(href)}" target="_blank" rel="noreferrer">${text}</a>`:`<span class="contact-item">${text}</span>`}).join('<span class="contact-sep"> | </span>');});}
function localizeCv(){const labels=cvLabels();document.querySelectorAll('.cv-section>h2[data-section]').forEach(h2=>{const sec=h2.dataset.section;if(labels[sec])h2.textContent=labels[sec];});}

// ==========================================
// APPLICATION TRACKING & INTERVIEW PREP KIT
// ==========================================
const IS_VITE_DEV = /^51\d{2}$/.test(window.location.port);
const APIS_BASE = IS_VITE_DEV ? 'http://127.0.0.1:3017' : '';
async function syncAiven(path, payload, method='POST'){try{const response=await fetch(`${APIS_BASE}/api/data/${path}`,{method,headers:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});if(!response.ok)throw new Error(`Data service returned ${response.status}`);return await response.json();}catch(error){console.info('Joby is using local browser storage:',error.message);return null;}}
async function hydrateJobyData(){try{const status=await syncAiven('status',undefined,'GET');if(!status)return;state.dataStatus=status.connected?'Aiven PostgreSQL connected':status.configured?'Aiven unavailable · using local storage':'Local demo storage · Aiven not connected';const badge=$('#data-status');if(badge)badge.textContent=state.dataStatus;const cvBadge=$('#cv-status');if(cvBadge)cvBadge.textContent=status.connected?'Saved in Aiven':'Saved locally';if(status.connected){const data=await syncAiven('state',undefined,'GET');if(data?.baseCv){state.baseCv=data.baseCv;persistBaseCv();if(!state.adapted){state.cv=JSON.parse(JSON.stringify(data.baseCv));save();}}else{void syncAiven('base-cv',{cv:state.baseCv},'PUT');}if(data?.jobSnapshot){localStorage.setItem('joby-job-snapshot',JSON.stringify(data.jobSnapshot));state.job=data.jobSnapshot.text;localStorage.setItem('joby-current-job',state.job);state.jobSource=data.jobSnapshot.source||'user';localStorage.setItem('joby-job-source',state.jobSource);}if(data?.lastRun){localStorage.setItem('joby-last-run',JSON.stringify(data.lastRun));if(data.lastRun.cv){state.cv=data.lastRun.cv;state.adapted=true;localStorage.setItem(TAILORED_CV_KEY,JSON.stringify(state.cv));}}shell();}}catch(error){state.dataStatus='Local demo storage · Aiven not connected';}}
function persistRunToAiven(run, cv){void syncAiven('tailoring-runs',{id:'run_'+Date.now(),snapshotId:JSON.parse(localStorage.getItem('joby-job-snapshot')||'null')?.id||null,source:run.source,baseline:run.before,result:{metrics:run.after,cv},ranAt:run.ranAt});}

async function fetchApplications() {
  try {
    const res = await fetch(`${APIS_BASE}/api/applications`);
    if (res.ok) {
      const data = await res.json();
      state.applications = data;
      localStorage.setItem(APPS_LOCAL_KEY, JSON.stringify(data));
      updateTrackerBadge();
      return data;
    }
  } catch (e) {
    console.warn('Backend /api/applications unavailable, using local cache:', e.message);
  }
  try {
    const local = JSON.parse(localStorage.getItem(APPS_LOCAL_KEY) || '[]');
    state.applications = local;
    updateTrackerBadge();
    return local;
  } catch (_) {
    state.applications = [];
    return [];
  }
}

function updateTrackerBadge() {
  const badge = $('#tracker-counter');
  if (badge) badge.textContent = state.applications.length;
}

async function apiSaveApplication(newApp) {
  try {
    const res = await fetch(`${APIS_BASE}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newApp)
    });
    if (res.ok) {
      const saved = await res.json();
      await fetchApplications();
      return saved;
    }
  } catch (e) {
    console.warn('API save failed, using local storage:', e);
  }
  state.applications.unshift(newApp);
  localStorage.setItem(APPS_LOCAL_KEY, JSON.stringify(state.applications));
  updateTrackerBadge();
  return newApp;
}

async function apiUpdateApplication(id, updates) {
  try {
    const res = await fetch(`${APIS_BASE}/api/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) {
      const updated = await res.json();
      await fetchApplications();
      return updated;
    }
  } catch (e) {
    console.warn('API update failed, using local storage:', e);
  }
  const idx = state.applications.findIndex(a => a.id === id);
  if (idx !== -1) {
    state.applications[idx] = { ...state.applications[idx], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(APPS_LOCAL_KEY, JSON.stringify(state.applications));
  }
}

async function apiDeleteApplication(id) {
  try {
    await fetch(`${APIS_BASE}/api/applications/${id}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('API delete failed:', e);
  }
  state.applications = state.applications.filter(a => a.id !== id);
  localStorage.setItem(APPS_LOCAL_KEY, JSON.stringify(state.applications));
  updateTrackerBadge();
}

function daysSince(dateStr) {
  if (!dateStr) return { count: 0, text: 'Date unknown' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { count: 0, text: 'Invalid date' };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const applied = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffTime = Math.max(0, today - applied);
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (days === 0) return { count: 0, text: 'Today' };
  if (days === 1) return { count: 1, text: 'Yesterday' };
  return { count: days, text: `${days} days ago` };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function extractCompanyFromJob(text) {
  if (!text) return 'Company';
  const clean = text.trim();
  const match = clean.match(/(?:chez|at|rejoindre|société|entreprise|company)\s+([A-Z][A-Za-z0-9&.\-_]{1,25})/i) ||
                clean.match(/([A-Z][A-Za-z0-9&.\-_]{1,25})\s+(?:recrute|cherche|is hiring)/i);
  return match ? match[1].trim() : 'Company';
}

async function saveCurrentJobToTracker() {
  const company = extractCompanyFromJob(state.job);
  const role = state.cv.personal?.role || jobTitle() || 'Digital Marketing & Growth';
  const contractType = state.track === 'job' ? 'Job' : state.track === 'spontanee' ? 'Unsolicited application' : 'Work-study';
  
  const newApp = {
    id: 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    company,
    role,
    school: state.school || 'iscom',
    contractType,
    status: 'applied',
    appliedDate: new Date().toISOString().split('T')[0],
    jobUrl: '',
    jobDescription: state.job || '',
    location: state.cv.personal?.location || 'Paris, France',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactLinkedin: '',
    followUps: [],
    nextFollowUpDate: '',
    interviewDate: '',
    interviewFormat: 'Visio',
    interviewNotes: '',
    interviewKit: null,
    notes: state.priority ? `Priority: ${state.priority}` : '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await apiSaveApplication(newApp);
  toast(`✅ Application for ${company} (${role}) saved to the tracker!`);
}

function exportApplicationsJson() {
  const data = JSON.stringify(state.applications, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `applications_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Application data exported as JSON.');
}

function importApplicationsJson(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) throw new Error('The file must contain a JSON array.');
      for (const app of parsed) {
        await apiSaveApplication(app);
      }
      toast(`${parsed.length} applications imported successfully!`);
      shell();
    } catch (err) {
      toast('Erreur importation JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function openNewAppModal() {
  state.activeModal = 'new_app';
  state.modalData = {
    company: '',
    role: state.cv.personal?.role || 'Marketing Digital & Growth',
    school: state.school || 'iscom',
    contractType: 'Work-study',
    status: 'applied',
    appliedDate: new Date().toISOString().split('T')[0],
    jobUrl: '',
    jobDescription: '',
    location: 'Paris, France',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: ''
  };
  shell();
}

function openEditAppModal(appId) {
  const app = state.applications.find(a => a.id === appId);
  if (!app) return;
  state.activeModal = 'edit_app';
  state.modalData = JSON.parse(JSON.stringify(app));
  shell();
}

function openRelanceModal(appId) {
  const app = state.applications.find(a => a.id === appId);
  if (!app) return;
  state.activeModal = 'relance';
  state.modalData = { appId, app: JSON.parse(JSON.stringify(app)) };
  shell();
}

function openInterviewKit(appId) {
  const app = state.applications.find(a => a.id === appId);
  if (!app) return;
  state.activeModal = 'interview_kit';
  state.modalData = { appId, app: JSON.parse(JSON.stringify(app)) };
  shell();
}

function closeModal() {
  state.activeModal = null;
  state.modalData = null;
  shell();
}

async function generateInterviewKitAI(appId) {
  const app = state.applications.find(a => a.id === appId);
  if (!app) return;
  const keyInput = $('#kit-deepseek-key');
  const apiKey = (keyInput ? keyInput.value : state.deepseekKey || '').trim();
  if (!apiKey) {
    toast('Enter your DeepSeek API key (sk-...) to generate the interview kit.');
    if (keyInput) keyInput.focus();
    return;
  }
  state.deepseekKey = apiKey;
  localStorage.setItem('cv-adapt-deepseek-key', apiKey);

  const btn = $('#btn-generate-kit-ai');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ DeepSeek is generating the interview kit...</span>';
  }
  toast(`Generating interview preparation kit for ${app.company}...`);

  try {
    const res = await fetch(`${APIS_BASE}/api/generate-interview-kit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        company: app.company,
        role: app.role,
        school: app.school,
        jobDescription: app.jobDescription,
        appId: app.id
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
      throw new Error(err.error || `Erreur HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.kit) throw new Error('No content returned par l\'IA.');
    
    app.interviewKit = { ...data.kit, generatedAt: new Date().toISOString() };
    await apiUpdateApplication(app.id, { interviewKit: app.interviewKit });
    state.modalData.app = JSON.parse(JSON.stringify(app));
    toast(`🎉 Interview kit generated for ${app.company} !`);
    shell();
  } catch (err) {
    console.error('Interview kit generation error:', err);
    toast('Erreur IA: ' + err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>⚡ Retry generation</span>';
    }
  }
}

function interviewKitPromptText(app) {
  const schoolCfg = SCHOOL_CONFIG[app.school] || SCHOOL_CONFIG.iscom;
  return `You are an interview coach preparing ${state.cv.personal?.name || 'Alex Morgan'} for an interview.

CANDIDATE PROFILE:
- Name: ${state.cv.personal?.name || 'Alex Morgan'}
- Target role: ${app.role} (${app.contractType || 'Work-study'} - ${schoolCfg.name})
- Relevant achievements: grew independent mobile apps to 2M+ cumulative downloads; developed a health information database; worked on digital marketing and growth at Orange Travel, including SEO, analytics, and an AI automation tool for identifying link-building opportunities.
- Languages: English (C2), French (C2), Arabic (native).
- Skills: SEO, ASO, GEO, GA4, GTM, WordPress, Looker Studio, Adobe tools, and practical AI automation.

TARGET COMPANY AND ROLE:
- Company: ${app.company}
- Role: ${app.role}
- Job description: ${app.jobDescription || 'Growth marketing, acquisition, SEO, and digital strategy.'}

Return only a valid JSON object with this schema. Write all candidate-facing content in English:
{
  "pitch": "A natural spoken introduction of about 90 seconds, connecting design and UX, measurable app growth, SEO and analytics, and readiness for this role.",
  "whyApplied": "A specific motivation linked to the employer and role.",
  "strengths": [{ "title": "Builder mindset", "explanation": "...", "proof": "..." }, { "title": "Creative and analytical skills", "explanation": "...", "proof": "..." }, { "title": "Practical AI and execution", "explanation": "...", "proof": "..." }],
  "weaknesses": [{ "title": "...", "explanation": "...", "mitigation": "..." }],
  "proudProject": { "title": "...", "situation": "...", "task": "...", "action": "...", "result": "..." },
  "difficultyOvercome": { "situation": "...", "difficulty": "...", "solution": "...", "takeaway": "..." },
  "taskManagement": { "approach": "...", "tools": "...", "example": "..." },
  "questionsAndAnswers": [{ "question": "...", "goodAnswer": "...", "tip": "..." }],
  "questionsToAskThem": [{ "question": "...", "whyAsk": "..." }]
}`;
}

function copyInterviewKitPrompt(appId) {
  const app = state.applications.find(a => a.id === appId);
  if (!app) return;
  const prompt = interviewKitPromptText(app);
  copyText(prompt, '📋 Interview kit prompt copied. Paste it into Gemini, Claude, or ChatGPT.');
}

async function pasteInterviewKitJson(appId, rawText) {
  try {
    const parsed = cleanAndParseJson(rawText);
    const app = state.applications.find(a => a.id === appId);
    if (!app) return;
    app.interviewKit = { ...parsed, generatedAt: new Date().toISOString() };
    await apiUpdateApplication(app.id, { interviewKit: app.interviewKit });
    state.modalData.app = JSON.parse(JSON.stringify(app));
    toast('🎉 Interview kit imported and saved!');
    shell();
  } catch (err) {
    toast('JSON parsing error: ' + err.message);
  }
}

function copyFullInterviewKitText(appId) {
  const app = state.applications.find(a => a.id === appId);
  if (!app || !app.interviewKit) return;
  const k = app.interviewKit;
  const schoolCfg = SCHOOL_CONFIG[app.school] || SCHOOL_CONFIG.iscom;
  let text = `🎯 INTERVIEW PREPARATION SHEET — ${app.company.toUpperCase()} (${app.role})\n`;
  text += `School: ${schoolCfg.name} (${schoolCfg.shortRhythm})\n`;
  text += `==========================================================\n\n`;
  text += `🗣️ PITCH PERSONNEL (~90 SECONDES) :\n${k.pitch || ''}\n\n`;
  text += `🎯 WHY I APPLIED :\n${k.whyApplied || ''}\n\n`;
  text += `⭐ 3 POINTS FORTS :\n`;
  (k.strengths || []).forEach((s, i) => {
    text += `${i + 1}. ${s.title} : ${s.explanation} (Preuve: ${s.proof})\n`;
  });
  text += `\n💡 THREE DEVELOPMENT AREAS :\n`;
  (k.weaknesses || []).forEach((w, i) => {
    text += `${i + 1}. ${w.title} : ${w.explanation} -> Gestion: ${w.mitigation}\n`;
  });
  if (k.proudProject) {
    text += `\n🏆 PROJECT I AM PROUD OF (STAR METHOD) :\n${k.proudProject.title}\n- Situation: ${k.proudProject.situation}\n- Task: ${k.proudProject.task}\n- Action: ${k.proudProject.action}\n- Result: ${k.proudProject.result}\n`;
  }
  if (k.difficultyOvercome) {
    text += `\n🧗 CHALLENGE OVERCOME :\n- Context: ${k.difficultyOvercome.situation}\n- Challenge: ${k.difficultyOvercome.difficulty}\n- Solution: ${k.difficultyOvercome.solution}\n- Takeaway: ${k.difficultyOvercome.takeaway}\n`;
  }
  if (k.taskManagement) {
    text += `\n📋 TASK PLANNING :\n- Method: ${k.taskManagement.approach}\n- Tools: ${k.taskManagement.tools}\n- Example: ${k.taskManagement.example}\n`;
  }
  if (k.questionsAndAnswers && k.questionsAndAnswers.length) {
    text += `\n❓ LIKELY QUESTIONS AND ANSWERS :\n`;
    k.questionsAndAnswers.forEach((qa, i) => {
      text += `Q${i + 1}: ${qa.question}\n-> R: ${qa.goodAnswer}\n(Tip: ${qa.tip})\n\n`;
    });
  }
  if (k.questionsToAskThem && k.questionsToAskThem.length) {
    text += `🙋 QUESTIONS TO ASK :\n`;
    k.questionsToAskThem.forEach((q, i) => {
      text += `${i + 1}. ${q.question} (${q.whyAsk})\n`;
    });
  }
  copyText(text.trim(), '📋 Full interview preparation sheet copied!');
}

function copyRelanceEmail(templateIdx, app) {
  const schoolCfg = SCHOOL_CONFIG[app.school] || SCHOOL_CONFIG.iscom;
  const pName = state.cv.personal?.name || 'Alex Morgan';
  let subject = '';
  let body = '';

  if (templateIdx === 1) {
    subject = `Following up on my application - ${app.role} | ${pName}`;
    body = `Dear Hiring Manager,\n\nI am following up on my recent application for the ${app.role} role at ${app.company}. I remain very interested in the opportunity. My background combines creative execution in design and UX, acquisition across SEO and ASO, analytics with GA4, and measurable growth from mobile apps with more than 2M cumulative downloads.\n\nI would be glad to discuss how I could contribute to your team.\n\nKind regards,\n\n${pName}`;
  } else {
    subject = `Application follow-up - ${app.role} | ${pName}`;
    body = `Dear Hiring Manager,\n\nI am writing to follow up on the ${app.role} opportunity at ${app.company}. I would welcome the chance to discuss the role and share examples of my work in digital marketing, SEO, analytics, and web product development.\n\nWould you be available for a brief conversation this week?\n\nKind regards,\n\n${pName}`;
  }

  copyText(`Subject: ${subject}\n\n${body}`, `Follow-up email ${templateIdx} copied to clipboard.`);
}

function getFilteredApplications() {
  const allApps = state.applications || [];
  return allApps.filter(a => {
    if (state.trackerFilter !== 'all') {
      if (state.trackerFilter === 'relance') {
        const isNeeded = a.status === 'follow_up_needed' || (a.status === 'applied' && daysSince(a.appliedDate).count >= 7);
        if (!isNeeded && a.status !== 'follow_up_sent') return false;
      } else if (state.trackerFilter === 'interview') {
        if (!['interview_scheduled', 'technical_test'].includes(a.status)) return false;
      } else if (a.status !== state.trackerFilter) {
        return false;
      }
    }
    if (state.trackerSchoolFilter !== 'all') {
      if (a.school !== state.trackerSchoolFilter) return false;
    }
    if (state.trackerSearch) {
      const q = state.trackerSearch.toLowerCase();
      const match = (a.company || '').toLowerCase().includes(q) ||
                    (a.role || '').toLowerCase().includes(q) ||
                    (a.location || '').toLowerCase().includes(q) ||
                    (a.notes || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

function renderFilteredAppsList() {
  const filtered = getFilteredApplications();
  if (filtered.length === 0) {
    return `
      <div class="empty-apps-box">
        <div class="empty-icon-circle">${icon('briefcase')}</div>
        <h3>No applications in this view</h3>
        <p>Save a role from the CV Studio or create a new application below.</p>
        <button class="button primary btn-new-app" id="btn-empty-new-app" style="margin: 0 auto;">
          ${icon('plus')} <span>New application</span>
        </button>
      </div>
    `;
  }
  return filtered.map(app => renderAppCard(app)).join('');
}

function renderTrackerView() {
  const allApps = state.applications || [];
  const total = allApps.length;
  
  const pendingCount = allApps.filter(a => ['applied', 'follow_up_sent'].includes(a.status)).length;
  const relanceNeededCount = allApps.filter(a => {
    if (a.status === 'follow_up_needed') return true;
    if (a.status === 'applied') {
      const days = daysSince(a.appliedDate).count;
      return days >= 7;
    }
    return false;
  }).length;
  const interviewCount = allApps.filter(a => ['interview_scheduled', 'technical_test'].includes(a.status)).length;
  const offerCount = allApps.filter(a => a.status === 'offer').length;

  return `
    <div class="tracker-container">
      <div class="tracker-header">
        <div class="tracker-title-wrap">
          <div class="tracker-title-icon">${icon('tracker')}</div>
          <div>
            <h1>Application Tracker</h1>
            <p>A central dashboard for job applications, follow-ups, and AI interview preparation.</p>
          </div>
        </div>
        <div class="tracker-actions">
          <button class="button primary btn-new-app" id="btn-new-app">
            ${icon('plus')} <span>New application</span>
          </button>
          <button class="button secondary" id="btn-export-apps" title="Export a JSON backup">
            ${icon('download')} <span>Export JSON</span>
          </button>
          <label class="button secondary file-label" style="cursor:pointer;" title="Restore a JSON file">
            ${icon('upload')} <span>Import JSON</span>
            <input type="file" id="input-import-apps" accept="application/json" />
          </label>
        </div>
      </div>

      <div class="tracker-metrics-grid">
        <div class="metric-card">
          <div class="metric-card-head">
            <span class="metric-label">Total applications</span>
            <span class="metric-icon-wrap default">${icon('briefcase')}</span>
          </div>
          <span class="metric-value">${total}</span>
          <span class="metric-sub">All tracked roles</span>
        </div>
        <div class="metric-card">
          <div class="metric-card-head">
            <span class="metric-label">In progress / waiting</span>
            <span class="metric-icon-wrap pending">${icon('clock')}</span>
          </div>
          <span class="metric-value">${pendingCount}</span>
          <span class="metric-sub">Active applications</span>
        </div>
        <div class="metric-card ${relanceNeededCount > 0 ? 'alert' : ''}">
          <div class="metric-card-head">
            <span class="metric-label">Follow-ups due</span>
            <span class="metric-icon-wrap warning">${icon('alert')}</span>
          </div>
          <span class="metric-value">${relanceNeededCount}</span>
          <span class="metric-sub">${relanceNeededCount > 0 ? '<span class="urgent-pulse-dot"></span> More than 7 days since application' : 'No overdue follow-ups'}</span>
        </div>
        <div class="metric-card interview">
          <div class="metric-card-head">
            <span class="metric-label">Interviews</span>
            <span class="metric-icon-wrap interview">${icon('target')}</span>
          </div>
          <span class="metric-value">${interviewCount}</span>
          <span class="metric-sub">Interviews and tests scheduled</span>
        </div>
        <div class="metric-card success">
          <div class="metric-card-head">
            <span class="metric-label">Offers received</span>
            <span class="metric-icon-wrap success">${icon('trophy')}</span>
          </div>
          <span class="metric-value">${offerCount}</span>
          <span class="metric-sub">Offers received</span>
        </div>
      </div>

      <div class="tracker-toolbar">
        <div class="toolbar-search">
          <span class="search-icon">${icon('search')}</span>
          <input type="text" id="tracker-search-input" placeholder="Search company, role, keyword..." value="${esc(state.trackerSearch)}" />
        </div>
        <div class="toolbar-filters">
          <button class="filter-pill ${state.trackerFilter === 'all' ? 'active' : ''}" data-filter="all">All <span class="filter-count">${total}</span></button>
          <button class="filter-pill ${state.trackerFilter === 'applied' ? 'active' : ''}" data-filter="applied">Applied <span class="filter-count">${pendingCount}</span></button>
          <button class="filter-pill ${state.trackerFilter === 'relance' ? 'active' : ''}" data-filter="relance">Follow-ups ${relanceNeededCount > 0 ? `<span class="filter-count alert">${relanceNeededCount}</span>` : ''}</button>
          <button class="filter-pill ${state.trackerFilter === 'interview' ? 'active' : ''}" data-filter="interview">Interviews ${interviewCount > 0 ? `<span class="filter-count interview">${interviewCount}</span>` : ''}</button>
          <button class="filter-pill ${state.trackerFilter === 'offer' ? 'active' : ''}" data-filter="offer">Offers ${offerCount > 0 ? `<span class="filter-count success">${offerCount}</span>` : ''}</button>
          <button class="filter-pill ${state.trackerFilter === 'rejected' ? 'active' : ''}" data-filter="rejected">Rejected</button>
          <div class="school-filter-wrap">
            ${icon('school')}
            <select class="school-filter-select" id="tracker-school-select">
              <option value="all" ${state.trackerSchoolFilter === 'all' ? 'selected' : ''}>All schools</option>
              <option value="iscom" ${state.trackerSchoolFilter === 'iscom' ? 'selected' : ''}>ISCOM (4d/1d)</option>
              <option value="hetic" ${state.trackerSchoolFilter === 'hetic' || state.trackerSchoolFilter === 'inseec' ? 'selected' : ''}>HETIC (3w/1w)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="apps-list">
        ${renderFilteredAppsList()}
      </div>
    </div>
  `;
}


function getCompanyColor(name = '') {
  const colors = [
    'linear-gradient(135deg, #2563eb, #1d4ed8)',
    'linear-gradient(135deg, #7c3aed, #6d28d9)',
    'linear-gradient(135deg, #059669, #047857)',
    'linear-gradient(135deg, #d97706, #b45309)',
    'linear-gradient(135deg, #0891b2, #0e7490)',
    'linear-gradient(135deg, #e11d48, #be123c)',
    'linear-gradient(135deg, #4f46e5, #4338ca)'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function contractTypeLabel(value) {
  const normalized = String(value || '').toLowerCase();
  if (!normalized || normalized.includes('alternance') || normalized.includes('work-study')) return 'Work-study';
  if (normalized.includes('spontan') || normalized.includes('unsolicited')) return 'Unsolicited application';
  if (normalized === 'job' || normalized.includes('regular')) return 'Regular job';
  return value;
}

function interviewFormatLabel(value) {
  const normalized = String(value || '').toLowerCase();
  if (!normalized || normalized.includes('visio') || normalized.includes('video')) return 'Video call';
  if (normalized.includes('présentiel') || normalized.includes('in person')) return 'In person';
  if (normalized.includes('téléphonique') || normalized.includes('phone')) return 'Phone';
  return value;
}

function renderAppCard(app) {
  const ds = daysSince(app.appliedDate);
  const isOverdueRelance = (app.status === 'applied' && ds.count >= 7) || app.status === 'follow_up_needed';
  const schoolCfg = SCHOOL_CONFIG[app.school] || SCHOOL_CONFIG.iscom;
  const hasKit = Boolean(app.interviewKit);
  const contractLabel = contractTypeLabel(app.contractType);
  const interviewFormat = interviewFormatLabel(app.interviewFormat);
  const initial = (app.company || 'C').slice(0, 2).toUpperCase();

  return `
    <article class="app-card" data-app-id="${esc(app.id)}">
      <div class="app-card-top">
        <div class="app-card-title-group">
          <div class="company-avatar" style="background:${getCompanyColor(app.company)}">${initial}</div>
          <div>
            <h3>
              <span class="app-company-name">${esc(app.company)}</span>
              <span class="app-role-name">/ ${esc(app.role)}</span>
            </h3>
            <div class="app-meta-pills">
              <span class="school-badge-app ${app.school === 'iscom' ? 'iscom' : ''}">${icon('school')} ${esc(schoolCfg.name)} (${esc(schoolCfg.shortRhythm)})</span>
              <span class="contract-badge">${icon('briefcase')} ${esc(contractLabel)}</span>
              <span class="date-badge">${icon('calendar')} Applied on ${formatDate(app.appliedDate)}</span>
              <span class="days-elapsed ${isOverdueRelance ? 'urgent' : ''}">
                ${isOverdueRelance ? `${icon('lightning')} ${ds.text} (Follow-up recommended!)` : `${icon('clock')} ${ds.text}`}
              </span>
            </div>
          </div>
        </div>
        <div>
          <select class="status-dropdown status-${esc(app.status)}" data-app-status-id="${esc(app.id)}">
            <option value="applied" ${app.status === 'applied' ? 'selected' : ''}>📫 Applied</option>
            <option value="follow_up_needed" ${app.status === 'follow_up_needed' ? 'selected' : ''}>⚡ Follow-up needed</option>
            <option value="follow_up_sent" ${app.status === 'follow_up_sent' ? 'selected' : ''}>✉️ Follow-up sent</option>
            <option value="interview_scheduled" ${app.status === 'interview_scheduled' ? 'selected' : ''}>🎯 Interview scheduled</option>
            <option value="technical_test" ${app.status === 'technical_test' ? 'selected' : ''}>📝 Technical test</option>
            <option value="offer" ${app.status === 'offer' ? 'selected' : ''}>🎉 Offer received</option>
            <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
            <option value="archived" ${app.status === 'archived' ? 'selected' : ''}>📦 Archived</option>
          </select>
        </div>
      </div>

      <div class="app-card-details">
        <div class="detail-item">
          <strong>${icon('user')} Contact / recruiter</strong>
          <span>${esc(app.contactName || 'Not provided')}${app.contactEmail ? ` · <a href="mailto:${esc(app.contactEmail)}" style="color:#2563eb; text-decoration:underline;">${esc(app.contactEmail)}</a>` : ''}</span>
        </div>
        <div class="detail-item">
          <strong>${icon('mail')} Follow-ups</strong>
          <span>${app.followUps && app.followUps.length ? `${app.followUps.length} follow-up(s) (latest on ${formatDate(app.followUps[app.followUps.length - 1].date)})` : 'No follow-ups'}</span>
        </div>
        <div class="detail-item">
          <strong>${icon('target')} Interview</strong>
          <span style="${app.interviewDate ? 'color:#7c3aed; font-weight:800;' : ''}">${app.interviewDate ? `📅 ${formatDate(app.interviewDate)} (${esc(interviewFormat)})` : 'Not scheduled'}</span>
        </div>
        <div class="detail-item">
          <strong>${icon('pin')} Location / links</strong>
          <span>${esc(app.location || 'Paris, France')}${app.jobUrl ? ` · <a href="${esc(cleanUrlHref(app.jobUrl))}" target="_blank" style="color:#2563eb; text-decoration:underline;">View job posting ↗</a>` : ''}</span>
        </div>
      </div>

      ${app.notes ? `
        <div class="app-notes">
          <strong>Notes:</strong> ${esc(app.notes)}
        </div>
      ` : ''}

      <div class="app-card-actions">
        <div class="app-actions-left">
          <button class="button primary kit-btn" data-action="open-kit" data-id="${esc(app.id)}">
            ${icon('sparkles')} <span>Kit Interview (IA)</span>
            ${hasKit ? `<span class="kit-badge-ready">${icon('check')} Ready</span>` : ''}
          </button>
          <button class="button secondary" data-action="open-cv" data-id="${esc(app.id)}" title="Load this role in CV Studio">
            ${icon('cv')} <span>Open in CV Studio</span>
          </button>
          <button class="button secondary" data-action="open-relance" data-id="${esc(app.id)}" title="Manage follow-ups and copy emails">
            ${icon('mail')} <span>Follow-ups (${(app.followUps || []).length})</span>
          </button>
        </div>
        <div class="app-actions-right">
          <button class="button secondary" data-action="edit-app" data-id="${esc(app.id)}" title="Edit role">
            ${icon('edit')} <span>Edit</span>
          </button>
          <button class="button secondary btn-delete" data-action="delete-app" data-id="${esc(app.id)}" title="Delete">
            ${icon('trash')}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderModal() {
  if (!state.activeModal) return '';
  const d = state.modalData || {};

  if (state.activeModal === 'new_app' || state.activeModal === 'edit_app') {
    const isEdit = state.activeModal === 'edit_app';
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2><span class="modal-header-icon" style="color:#2563eb;">${isEdit ? icon('edit') : icon('plus')}</span> ${isEdit ? 'Edit application' : 'New application'}</h2>
            <button class="modal-close" id="btn-close-modal" title="Close">${icon('clear')}</button>
          </div>
          <div class="modal-body">
            <form id="form-app">
              <div class="form-row">
                <div class="form-group">
                  <label for="form-company">Target company *</label>
                  <input id="form-company" required value="${esc(d.company || '')}" placeholder="e.g. Orange, L'Oréal, Doctolib..." />
                </div>
                <div class="form-group">
                  <label for="form-role">Job title *</label>
                  <input id="form-role" required value="${esc(d.role || '')}" placeholder="e.g. Digital Marketing & Growth Manager" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="form-school">School</label>
                  <select id="form-school">
                    <option value="iscom" ${d.school === 'iscom' ? 'selected' : ''}>ISCOM (Digital Communication - 4 days / 1 day)</option>
                    <option value="hetic" ${d.school === 'hetic' || d.school === 'inseec' ? 'selected' : ''}>HETIC (Master's - 3 weeks company / 1 week school)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="form-contract">Contract type</label>
                  <select id="form-contract">
                    <option value="Work-study" ${['Work-study', 'Alternance'].includes(d.contractType) ? 'selected' : ''}>Work-study</option>
                    <option value="Job" ${d.contractType === 'Job' ? 'selected' : ''}>Regular job (permanent / fixed-term)</option>
                    <option value="Unsolicited application" ${['Unsolicited application', 'Spontanée', 'Candidature Spontanée'].includes(d.contractType) ? 'selected' : ''}>Unsolicited application</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="form-date">Application date</label>
                  <input type="date" id="form-date" value="${esc(d.appliedDate || new Date().toISOString().split('T')[0])}" />
                </div>
                <div class="form-group">
                  <label for="form-status">Current status</label>
                  <select id="form-status">
                    <option value="applied" ${d.status === 'applied' ? 'selected' : ''}>📫 Applied</option>
                    <option value="follow_up_needed" ${d.status === 'follow_up_needed' ? 'selected' : ''}>⚡ Follow-up needed</option>
                    <option value="follow_up_sent" ${d.status === 'follow_up_sent' ? 'selected' : ''}>✉️ Follow-up sent</option>
                    <option value="interview_scheduled" ${d.status === 'interview_scheduled' ? 'selected' : ''}>🎯 Interview scheduled</option>
                    <option value="technical_test" ${d.status === 'technical_test' ? 'selected' : ''}>📝 Technical test</option>
                    <option value="offer" ${d.status === 'offer' ? 'selected' : ''}>🎉 Offer received</option>
                    <option value="rejected" ${d.status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
                    <option value="archived" ${d.status === 'archived' ? 'selected' : ''}>📦 Archived</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="form-contact-name">Contact / recruiter name</label>
                  <input id="form-contact-name" value="${esc(d.contactName || '')}" placeholder="e.g. Jordan Lee" />
                </div>
                <div class="form-group">
                  <label for="form-contact-email">Contact email</label>
                  <input type="email" id="form-contact-email" value="${esc(d.contactEmail || '')}" placeholder="e.g. recruiter@company.com" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="form-interview-date">Interview date (if scheduled)</label>
                  <input type="date" id="form-interview-date" value="${esc(d.interviewDate || '')}" />
                </div>
                <div class="form-group">
                  <label for="form-interview-format">Interview format</label>
                  <select id="form-interview-format">
                    <option value="Visio (Teams / Google Meet)" ${d.interviewFormat === 'Visio (Teams / Google Meet)' ? 'selected' : ''}>Video call (Teams / Google Meet / Zoom)</option>
                    <option value="In person" ${d.interviewFormat === 'In person' ? 'selected' : ''}>In person</option>
                    <option value="Phone" ${d.interviewFormat === 'Phone' ? 'selected' : ''}>Phone</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="form-job-url">Job posting URL</label>
                <input type="url" id="form-job-url" value="${esc(d.jobUrl || '')}" placeholder="https://..." />
              </div>

              <div class="form-group">
                <label for="form-job-desc">Job description</label>
                <textarea id="form-job-desc" rows="5" placeholder="Paste the job description here (used for interview prep and CV adaptation)">${esc(d.jobDescription || '')}</textarea>
              </div>

              <div class="form-group">
                <label for="form-notes">Personal notes</label>
                <textarea id="form-notes" rows="2" placeholder="e.g. Referred by..., follow-up planned for...">${esc(d.notes || '')}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="button secondary" id="btn-cancel-modal">Cancel</button>
            <button class="button primary" id="btn-save-app" style="background:#2563eb; font-weight:800;">
              ${icon('check')} <span>${isEdit ? 'Update' : 'Save application'}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.activeModal === 'relance') {
    const app = d.app || {};
    const followUps = app.followUps || [];
    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content wide">
          <div class="modal-header">
            <h2><span class="modal-header-icon" style="color:#2563eb;">${icon('mail')}</span> Follow-ups — ${esc(app.company)} (${esc(app.role)})</h2>
            <button class="modal-close" id="btn-close-modal" title="Close">${icon('clear')}</button>
          </div>
          <div class="modal-body">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
              <div>
                <h4 style="margin:0 0 10px; color:var(--slate-900); font-size:14px; display:flex; align-items:center; gap:6px;">
                  ${icon('calendar')} Follow-up history
                </h4>
                ${followUps.length === 0 ? `
                  <p style="font-size:12px; color:var(--slate-500); background:var(--slate-50); padding:14px; border-radius:8px; border:1px dashed var(--slate-300); line-height:1.5;">
                    No follow-ups recorded yet. Application submitted on <strong>${formatDate(app.appliedDate)}</strong>.
                  </p>
                ` : `
                  <div style="display:grid; gap:8px; max-height:220px; overflow-y:auto; margin-bottom:14px;">
                    ${followUps.map((f, i) => `
                      <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:8px; padding:10px 12px; font-size:11.5px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:800; color:#2563eb;">
                          <span>Follow-up #${i + 1} (${esc(f.type || 'Email')})</span>
                          <span>${formatDate(f.date)}</span>
                        </div>
                        <p style="margin:0; color:var(--slate-700);">${esc(f.notes || 'Follow-up email sent.')}</p>
                      </div>
                    `).join('')}
                  </div>
                `}

                <h4 style="margin:18px 0 10px; color:var(--slate-900); font-size:14px; display:flex; align-items:center; gap:6px;">
                  ${icon('plus')} Log a new follow-up
                </h4>
                <div class="form-group">
                  <label for="relance-date">Follow-up date</label>
                  <input type="date" id="relance-date" value="${new Date().toISOString().split('T')[0]}" />
                </div>
                <div class="form-group">
                  <label for="relance-channel">Channel</label>
                  <select id="relance-channel">
                    <option value="Email">Email</option>
                    <option value="LinkedIn">LinkedIn message</option>
                    <option value="Phone">Phone</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="relance-notes">Notes / message sent</label>
                  <textarea id="relance-notes" rows="3" placeholder="e.g. Follow-up sent to the recruiter after 7 days..."></textarea>
                </div>
                <button class="button primary" id="btn-add-relance" style="width:100%; background:#2563eb; font-weight:800;">
                  ${icon('plus')} <span>Log this follow-up</span>
                </button>
              </div>

              <div>
                <h4 style="margin:0 0 10px; color:var(--slate-900); font-size:14px; display:flex; align-items:center; gap:6px;">
                  ${icon('mail')} Email templates ready to copy
                </h4>
                <div style="background:#ffffff; border:1px solid var(--slate-200); border-radius:10px; padding:14px; margin-bottom:12px; box-shadow:0 1px 3px rgba(15,23,42,0.03);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <strong style="color:#2563eb; font-size:12px;">Template 1: Polite follow-up (day 7)</strong>
                    <button class="button secondary" id="btn-copy-relance-1" style="padding:4px 9px; font-size:10.5px;">${icon('copy')} Copy email</button>
                  </div>
                  <p style="font-size:11.5px; color:var(--slate-600); line-height:1.45; margin:0;">
                    Use this to follow up politely 7 days after applying and restate your key skills.
                  </p>
                </div>

                <div style="background:#ffffff; border:1px solid var(--slate-200); border-radius:10px; padding:14px; box-shadow:0 1px 3px rgba(15,23,42,0.03);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <strong style="color:#2563eb; font-size:12px;">Template 2: Follow-up with added value (day 14)</strong>
                    <button class="button secondary" id="btn-copy-relance-2" style="padding:4px 9px; font-size:10.5px;">${icon('copy')} Copy email</button>
                  </div>
                  <p style="font-size:11.5px; color:var(--slate-600); line-height:1.45; margin:0;">
                    Use this to follow up after 14 days with a relevant example of your work.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="button secondary" id="btn-close-modal-bottom">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.activeModal === 'interview_kit') {
    const app = d.app || {};
    const kit = app.interviewKit;
    const schoolCfg = SCHOOL_CONFIG[app.school] || SCHOOL_CONFIG.iscom;

    return `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content wide">
          <div class="modal-header">
            <h2><span class="modal-header-icon" style="color:#7c3aed;">${icon('sparkles')}</span> Interview Preparation Kit - ${esc(app.company)} (${esc(app.role)})</h2>
            <button class="modal-close" id="btn-close-modal" title="Close">${icon('clear')}</button>
          </div>
          <div class="modal-body">
            ${!kit ? `
              <div class="empty-apps-box" style="padding:35px 20px;">
                <div class="empty-icon-circle" style="background:#f5f3ff; color:#7c3aed;">${icon('sparkles')}</div>
                <h3 style="font-size:20px; color:var(--slate-900);">Generate a tailored interview preparation kit</h3>
                <p style="max-width:550px; margin:0 auto 18px; line-height:1.5; color:var(--slate-600);">
                  AI reviews the role at <strong>${esc(app.company)}</strong> and prepares your introduction, motivation, strengths, development areas, work approach, and sample answers.
                </p>

                <div style="max-width:440px; margin:0 auto 16px; text-align:left; background:var(--slate-50); padding:14px; border-radius:10px; border:1px solid var(--slate-200);">
                  <label for="kit-deepseek-key" style="font-size:11px; font-weight:700; color:var(--slate-700); display:block; margin-bottom:5px;">DeepSeek API key</label>
                  <input type="password" id="kit-deepseek-key" value="${esc(state.deepseekKey || '')}" placeholder="sk-..." style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid var(--slate-300); font-family:var(--font-mono); font-size:11px;" />
                </div>

                <button class="button primary kit-btn" id="btn-generate-kit-ai" style="padding:10px 22px; font-size:13px; margin:0 auto 16px;">
                  ${icon('sparkles')} <span>Generate the kit with DeepSeek AI (one click)</span>
                </button>

                <div style="border-top:1px solid var(--slate-200); margin:16px 0; position:relative; text-align:center;">
                  <span style="background:#ffffff; padding:0 10px; font-size:10px; color:var(--slate-400); font-weight:800;">OR COPY A PROMPT FOR GEMINI / CLAUDE / CHATGPT</span>
                </div>

                <div style="display:flex; justify-content:center; gap:8px; margin-bottom:14px;">
                  <button class="button secondary" id="btn-copy-kit-prompt">${icon('copy')} Copy interview kit prompt</button>
                </div>

                <div style="max-width:480px; margin:0 auto; text-align:left;">
                  <label for="paste-kit-json-input" style="font-size:11px; font-weight:700; color:var(--slate-700); display:block; margin-bottom:4px;">Paste the AI JSON response here:</label>
                  <textarea id="paste-kit-json-input" rows="3" placeholder='{"pitch": "...", "strengths": [...]}' style="width:100%; font-size:11px; font-family:var(--font-mono);"></textarea>
                  <button class="button secondary" id="btn-import-kit-json" style="margin-top:6px; width:100%; font-weight:800;">
                    ${icon('download')} Import the kit from JSON
                  </button>
                </div>
              </div>
            ` : `
              <div class="interview-kit-container">
                <div class="kit-hero-card">
                  <div class="kit-hero-info">
                    <h3>${esc(app.role)} chez ${esc(app.company)}</h3>
                    <p>🎓 School: ${esc(schoolCfg.name)} (${esc(schoolCfg.shortRhythm)}) · Kit generated on ${formatDate(kit.generatedAt)}</p>
                  </div>
                  <div class="kit-hero-actions">
                    <button class="button secondary" id="btn-regen-kit" style="background:rgba(255,255,255,0.15); color:#fff; border:1px solid rgba(255,255,255,0.25);">
                      ${icon('refresh')} <span>Regenerate</span>
                    </button>
                    <button class="button secondary" id="btn-copy-full-kit" style="background:#ffffff; color:var(--slate-900); font-weight:800;">
                      ${icon('copy')} <span>Copy full kit</span>
                    </button>
                    <button class="button secondary" id="btn-print-kit" style="background:#ffffff; color:var(--slate-900); font-weight:800;">
                      ${icon('printer')} <span>Print kit</span>
                    </button>
                  </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                  <div class="kit-tabs-bar">
                    <button class="kit-tab-btn ${state.activeKitTab === 'pitch' ? 'active' : ''}" data-kit-tab="pitch">${icon('user')} My introduction (~90 sec)</button>
                    <button class="kit-tab-btn ${state.activeKitTab === 'why' ? 'active' : ''}" data-kit-tab="why">${icon('target')} Why this role</button>
                    <button class="kit-tab-btn ${state.activeKitTab === 'strengths' ? 'active' : ''}" data-kit-tab="strengths">${icon('award')} Strengths & development</button>
                    <button class="kit-tab-btn ${state.activeKitTab === 'projects' ? 'active' : ''}" data-kit-tab="projects">${icon('trophy')} Key project & challenge</button>
                    <button class="kit-tab-btn ${state.activeKitTab === 'tasks' ? 'active' : ''}" data-kit-tab="tasks">${icon('briefcase')} Task planning</button>
                    <button class="kit-tab-btn ${state.activeKitTab === 'qa' ? 'active' : ''}" data-kit-tab="qa">${icon('sparkles')} Questions & answers</button>
                    <button class="kit-tab-btn ${state.activeKitTab === 'ask' ? 'active' : ''}" data-kit-tab="ask">${icon('mail')} Questions to ask</button>
                  </div>

                  <label class="rehearsal-toggle-wrap">
                    <input type="checkbox" id="toggle-rehearsal-mode" ${state.rehearsalMode ? 'checked' : ''} />
                    <span>Rehearsal mode (hide answers)</span>
                  </label>
                </div>

                <div class="kit-tab-content">
                  ${state.activeKitTab === 'pitch' ? `
                    <div class="kit-card">
                      <div class="kit-card-header">
                        <h4><span>${icon('user')}</span> Spoken introduction (clear and natural)</h4>
                        <button class="button secondary" id="btn-copy-pitch" style="padding:4px 8px; font-size:10px;">${icon('copy')} Copy pitch</button>
                      </div>
                      <div class="kit-pitch-box">${esc(kit.pitch || 'Introduction unavailable')}</div>
                      <div class="kit-pitch-tips">
                        <span>💡</span>
                        <span><strong>Speaking tip:</strong> Take a deep breath before you begin. Pause for one second between key points. Estimated time: about 90 seconds.</span>
                      </div>
                    </div>
                  ` : ''}

                  ${state.activeKitTab === 'why' ? `
                    <div class="kit-card">
                      <div class="kit-card-header">
                        <h4><span>${icon('target')}</span> Why this company and role? (tailored motivation)</h4>
                      </div>
                      <p style="font-size:13px; line-height:1.65; color:var(--slate-800); background:var(--slate-50); padding:16px; border-radius:8px; border-left:4px solid #2563eb; margin:0;">
                        ${esc(kit.whyApplied || 'Motivation unavailable')}
                      </p>
                    </div>
                  ` : ''}

                  ${state.activeKitTab === 'strengths' ? `
                    <div class="kit-card">
                      <div class="kit-card-header">
                        <h4><span>${icon('award')}</span> Three strengths (with evidence)</h4>
                      </div>
                      <div class="kit-points-grid" style="margin-bottom:20px;">
                        ${(kit.strengths || []).map(s => `
                          <div class="point-item-card strength">
                            <div class="point-item-title"><span>${icon('check')}</span> ${esc(s.title)}</div>
                            <div class="point-item-desc">${esc(s.explanation)}</div>
                            <div class="point-item-proof"><strong>Evidence:</strong> ${esc(s.proof)}</div>
                          </div>
                        `).join('')}
                      </div>

                      <div class="kit-card-header">
                        <h4><span>${icon('alert')}</span> Three development areas (constructive and credible)</h4>
                      </div>
                      <div class="kit-points-grid">
                        ${(kit.weaknesses || []).map(w => `
                          <div class="point-item-card weakness">
                            <div class="point-item-title"><span>${icon('alert')}</span> ${esc(w.title)}</div>
                            <div class="point-item-desc">${esc(w.explanation)}</div>
                            <div class="point-item-proof" style="background:#fffbeb; color:#92400e;">
                              <strong>How I manage it:</strong> ${esc(w.mitigation)}
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}

                  ${state.activeKitTab === 'projects' ? `
                    <div class="kit-card">
                      <div class="kit-card-header">
                        <h4><span>${icon('trophy')}</span> Project I am most proud of (STAR method)</h4>
                      </div>
                      ${kit.proudProject ? `
                        <h5 style="margin:0 0 8px; font-size:14px; color:#2563eb;">${esc(kit.proudProject.title)}</h5>
                        <div class="star-grid">
                          <div class="star-step">
                            <div class="star-step-label">S — Situation</div>
                            <div class="star-step-text">${esc(kit.proudProject.situation)}</div>
                          </div>
                          <div class="star-step">
                            <div class="star-step-label">T - Task</div>
                            <div class="star-step-text">${esc(kit.proudProject.task)}</div>
                          </div>
                          <div class="star-step">
                            <div class="star-step-label">A — Action</div>
                            <div class="star-step-text">${esc(kit.proudProject.action)}</div>
                          </div>
                          <div class="star-step">
                            <div class="star-step-label">R - Results</div>
                            <div class="star-step-text" style="font-weight:700; color:#059669;">${esc(kit.proudProject.result)}</div>
                          </div>
                        </div>
                      ` : '<p>No data available</p>'}

                      <div class="kit-card-header" style="margin-top:22px;">
                        <h4><span>${icon('target')}</span> A challenge from a previous role and how I solved it</h4>
                      </div>
                      ${kit.difficultyOvercome ? `
                        <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:8px; padding:14px; font-size:12px; line-height:1.5;">
                          <p style="margin:0 0 8px;"><strong>Context:</strong> ${esc(kit.difficultyOvercome.situation)}</p>
                          <p style="margin:0 0 8px;"><strong>Challenge:</strong> ${esc(kit.difficultyOvercome.difficulty)}</p>
                          <p style="margin:0 0 8px; color:#2563eb;"><strong>How I solved it:</strong> ${esc(kit.difficultyOvercome.solution)}</p>
                          <p style="margin:0; font-weight:700; color:#047857;"><strong>What I learned:</strong> ${esc(kit.difficultyOvercome.takeaway)}</p>
                        </div>
                      ` : '<p>No data available</p>'}
                    </div>
                  ` : ''}

                  ${state.activeKitTab === 'tasks' ? `
                    <div class="kit-card">
                      <div class="kit-card-header">
                        <h4><span>${icon('briefcase')}</span> How I plan and prioritize work</h4>
                      </div>
                      ${kit.taskManagement ? `
                        <div style="display:grid; gap:12px; font-size:12.5px; line-height:1.55;">
                          <div style="background:var(--slate-50); padding:12px 14px; border-radius:8px; border-left:4px solid #2563eb;">
                            <strong style="display:block; color:var(--slate-900); margin-bottom:4px;">Approach</strong>
                            <span>${esc(kit.taskManagement.approach)}</span>
                          </div>
                          <div style="background:var(--slate-50); padding:12px 14px; border-radius:8px;">
                            <strong style="display:block; color:var(--slate-900); margin-bottom:4px;">Tools and daily organization</strong>
                            <span>${esc(kit.taskManagement.tools)}</span>
                          </div>
                          <div style="background:var(--slate-50); padding:12px 14px; border-radius:8px;">
                            <strong style="display:block; color:var(--slate-900); margin-bottom:4px;">Practical example</strong>
                            <span>${esc(kit.taskManagement.example)}</span>
                          </div>
                        </div>
                      ` : '<p>No data available</p>'}
                    </div>
                  ` : ''}

                  ${state.activeKitTab === 'qa' ? `
                    <div class="kit-card">
                      <div class="kit-card-header">
                        <h4><span>${icon('sparkles')}</span> Likely questions and sample answers for this role</h4>
                        <span style="font-size:11px; color:var(--slate-500);">${(kit.questionsAndAnswers || []).length} questions prepared</span>
                      </div>
                      <div class="qa-list">
                        ${(kit.questionsAndAnswers || []).map((qa, i) => `
                          <div class="qa-card" data-qa-idx="${i}">
                            <div class="qa-question-bar" data-action="toggle-qa" data-qa-idx="${i}">
                              <span>Q${i + 1} : ${esc(qa.question)}</span>
                              <span style="font-size:11px; color:var(--slate-400);">${icon('chevronDown')}</span>
                            </div>
                            <div class="qa-answer-box" id="qa-ans-${i}" style="${state.rehearsalMode ? 'display:none;' : ''}">
                              <p style="margin:0 0 6px; font-weight:600; color:var(--slate-800);">${esc(qa.goodAnswer)}</p>
                              ${qa.tip ? `<span class="qa-tip-badge">💡 Tip: ${esc(qa.tip)}</span>` : ''}
                            </div>
                            ${state.rehearsalMode ? `
                              <div style="padding:6px 14px; background:var(--slate-50); border-top:1px dashed var(--slate-200);">
                                <button class="button secondary btn-reveal-ans" data-target="qa-ans-${i}" style="padding:3px 8px; font-size:10px;">
                                  ${icon('eye')} Show answer
                                </button>
                              </div>
                            ` : ''}
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}

                  ${state.activeKitTab === 'ask' ? `
                    <div class="kit-card">
                      <div class="kit-card-header">
                        <h4><span>${icon('mail')}</span> Questions to ask the interviewer</h4>
                      </div>
                      <div style="display:grid; gap:10px;">
                        ${(kit.questionsToAskThem || []).map((q, i) => `
                          <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:8px; padding:12px 14px; font-size:12.5px;">
                            <p style="margin:0 0 4px; font-weight:750; color:#2563eb;">« ${esc(q.question)} »</p>
                            <span style="font-size:11px; color:var(--slate-500);">🎯 <strong>Pourquoi cette question :</strong> ${esc(q.whyAsk)}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
            `}
          </div>
          <div class="modal-footer">
            <button class="button secondary" id="btn-close-modal-bottom">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}

function shell() {
  state.view = 'cv';
  localStorage.setItem(VIEW_KEY, 'cv');
  const snapshot = JSON.parse(localStorage.getItem('joby-job-snapshot') || 'null');
  const lastRun = JSON.parse(localStorage.getItem('joby-last-run') || 'null');
  const savedAt = snapshot?.savedAt ? new Date(snapshot.savedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not saved yet';
  const runAt = lastRun?.ranAt ? new Date(lastRun.ranAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'No live tailoring run yet';
  const currentJob = String(state.job || '').trim();
  const inputHash = currentJob ? btoa(unescape(encodeURIComponent(currentJob))).slice(0, 22) : '';
  const dataChanged = Boolean(snapshot && snapshot.contentHash !== inputHash);

  document.querySelector('#app').innerHTML = `
    <header class="joby-topbar">
      <a class="joby-brand" href="#" aria-label="Joby home"><img src="/joby-mark.svg" alt=""/><span>joby</span><b>CV copilot</b></a>
      <div class="joby-top-right"><span class="privacy"><i></i> Private by default</span><a class="button secondary pitch-link" href="/pitch.html" target="_blank" rel="noreferrer">Pitch slide ↗</a><button class="button secondary" id="edit-mode">${icon('edit')} <span>${settings.editMode ? 'Finish editing' : 'Edit Base CV'}</span></button><button class="button primary" id="print">Export PDF <span>↗</span></button></div>
    </header>
    <main class="joby-app">
      <section class="joby-intro"><div><p class="eyebrow">YOUR NEXT MOVE, MADE CLEAR</p><h1>One CV. The right story for every role.</h1><p>Joby connects your experience to a real job description, then shows the evidence behind every change.</p></div><div class="joby-stepper"><span class="done"><b>1</b> Base CV</span><i></i><span class="${snapshot ? 'done' : 'active'}"><b>2</b> Job data</span><i></i><span class="${lastRun ? 'done' : ''}"><b>3</b> Tailor</span></div></section>
      <div class="joby-grid">
        <aside class="joby-rail">
          <section class="joby-card base-card"><div class="joby-card-head"><div class="joby-icon mint">${icon('cv')}</div><div><p class="eyebrow">YOUR SOURCE OF TRUTH</p><h2>Base CV</h2></div><span class="joby-status"><i></i> <span id="cv-status">${state.dataStatus?.startsWith('Aiven')?'Saved in Aiven':'Saved locally'}</span></span></div><p class="joby-card-copy">One English CV, used as the source for every application.</p><div class="base-person"><div class="avatar-initials">${esc((state.cv.personal?.name || 'A').split(/\s+/).map(x=>x[0]).join('').slice(0,2))}</div><div><strong>${esc(state.cv.personal?.name || 'Alex Morgan')}</strong><span>${esc(state.cv.personal?.role || 'Your professional profile')}</span></div></div><button class="button secondary full-button" id="scroll-to-cv">Review Base CV <span>↓</span></button><div class="joby-card-foot"><button class="text-button" id="upload-base-cv">Upload a different CV</button><input id="base-cv-file" type="file" accept="application/json" hidden/><button class="text-button" id="reset">Restore demo CV</button></div></section>
          <section class="joby-card job-card"><div class="joby-card-head"><div class="joby-icon peach">${icon('target')}</div><div><p class="eyebrow">ROLE TO EXPLORE</p><h2>Job description</h2></div></div><label class="field-label" for="job">Paste the job posting</label><textarea id="job" rows="8" placeholder="Paste the complete job description here…">${esc(state.job)}</textarea><div class="job-source"><span class="source-pulse"></span><div><strong>${snapshot ? (dataChanged ? 'New version detected' : 'Saved job snapshot') : 'Recorded demo scenario · sample posting'}</strong><small>${snapshot ? `Last captured ${esc(savedAt)}` : 'Replace this sample with a public job posting'}</small></div></div><button class="button secondary full-button" id="save-job-snapshot">${snapshot ? (dataChanged ? 'Capture updated job details' : 'Refresh job snapshot') : 'Save job snapshot'} <span>↻</span></button><p class="micro-note">This screen starts with a recorded sample posting. Paste a public job description to create your own snapshot. Joby does not fetch external pages in this demo.</p></section>
          <section class="joby-agent-card"><div class="agent-head"><span class="agent-spark">✳</span><div><p class="eyebrow">JOBY AGENT</p><h2>Ground every suggestion</h2></div></div><p>Joby asks the agent to tie each change to Base CV evidence. Review the result for unsupported claims.</p><label class="field-label" for="deepseek-key">DeepSeek API key <span>optional</span></label><input type="password" id="deepseek-key" value="${esc(state.deepseekKey || '')}" placeholder="Add a key for live tailoring" autocomplete="off"/><button class="button joby-cta" id="auto-adapt-job">${lastRun ? 'Tailor this CV again' : 'Tailor my CV'} <span>↗</span></button><button class="joby-link-button" id="open-ai-adapt">Copy prompt and open AI assistant <span>↗</span></button><button class="joby-link-button" id="paste-json">Paste an AI result into Joby</button><p class="micro-note">Review every suggestion before applying it. Missing qualifications stay visible as gaps.</p></section>
          <section class="joby-data-strip"><span class="data-glyph">DB</span><div><strong>Data stays inspectable</strong><p>${snapshot ? `1 job snapshot · ${lastRun ? '1 or more saved tailoring runs' : 'No tailoring runs yet'}` : 'Your CV and job text stay in this browser.'}</p><small id="data-status">${esc(state.dataStatus||'Local demo storage · Aiven not connected')}</small></div></section>
        </aside>
        <section class="joby-main">
          <div class="joby-result-head"><div><p class="eyebrow">YOUR APPLICATION WORKSPACE</p><h2>${state.adapted ? 'Your tailored CV' : 'Start with your Base CV'}</h2><p>${state.adapted ? 'Review the tailored version and see what the agent used.' : 'Your CV is ready. Add a job description, then tailor it with evidence.'}</p></div><div class="coverage-pill"><span>${icon('target')}</span><div><small>Keyword coverage</small><strong>${ats().hits.length}<i> / ${ats().keywords.length}</i></strong></div></div></div>
          <nav class="joby-tabs" role="tablist"><button class="tab ${state.tab === 'original' ? 'active' : ''}" data-tab="original">Base CV</button><button class="tab ${state.tab === 'adapted' ? 'active' : ''}" data-tab="adapted">Tailored CV</button><button class="tab ${state.tab === 'changes' || state.tab === 'ai' ? 'active' : ''}" data-tab="changes">Evidence & data</button></nav>
          <div class="joby-context"><div><span class="context-dot"></span><div><strong>${snapshot ? (dataChanged ? 'Job text changed since the last snapshot' : 'Using saved job snapshot') : (state.jobSource==='demo'?'Using the recorded sample scenario':'Using pasted job text')}</strong><small>${snapshot ? `Captured ${esc(savedAt)} · source: ${snapshot.source==='demo'?'recorded demo scenario':'user-provided text'}` : 'Save a snapshot to record the current version'}</small></div></div><button id="evidence-tab" class="text-button">View data trail ↓</button></div>
          <div class="canvas-content">${state.tab === 'changes' || state.tab === 'ai' ? changesView() : previewView()}</div>
          <div class="joby-run-footer"><span class="run-check">✓</span><span>${lastRun ? `Last agent run: ${esc(runAt)} · ${lastRun.source === 'api' ? 'Live model response' : 'Prompt copied for external AI'}` : 'No agent run recorded yet'}</span><button class="text-button" id="copy-filename">Copy CV file name</button></div>
        </section>
      </div>
    </main>
    <div id="modal-container"></div><div class="toast" role="status"></div>`;
  bind(); renderPreview();
}
function ats() { const text = JSON.stringify(state.cv).toLowerCase(); const job = state.job.toLowerCase(); const stopwords=new Set(['with','that','this','will','your','from','have','they','you','lead','role','company','looking','about','please','apply','their','there','what','team','work','join','also','more','than','each','been','make','need','must','able','like','would','could','some','other','these','those','very','just','into','over','such','well','should','through','being','both','after','before','between','nous','pour','dans','votre','notre','vous','nous','avec','plus','sont','chez','tout','tous','toute','toutes','cette','leur','encore','mais','sans','sous','selon','comme','dans','etes','avez','sera','poste','offre','sein','missions','profil','recherche','candidat','candidature','equipe','entreprise']); const keywords = [...new Set((job.match(/[a-z][a-z+#&]{3,}/g)||[]).filter(k=>!stopwords.has(k)))]; const hits=keywords.filter(k=>text.includes(k)); let score=keywords.length?Math.round(hits.length/keywords.length*100):0; return {score, keywords, hits}; }
function previewView() { 
  const previewCv=state.tab==='original'?state.baseCv:state.cv;
  let html = withPreviewCv(previewCv,()=>`<article class="cv-paper ${settings.template}" style="--cv-font:${settings.font}px;--cv-margin:${settings.margin}mm;--cv-line:${settings.line}">${settings.editMode?cvMarkup():staticCvMarkup()}</article>`);
  if(settings.coverLetter) {
    html += `<article class="cv-paper cover-letter-page ${settings.template}" style="margin-top:20px;--cv-font:${settings.font}px;--cv-margin:${settings.margin}mm;--cv-line:${settings.line}">${settings.editMode?coverLetterMarkup():staticCoverLetterMarkup()}</article>`;
  }
  return `<div class="paper-wrap"><span class="a4-label">210 × 297 mm</span>${html}</div>`; 
}
function skillRelevance(item){const job=String(state.job||'').toLowerCase();return String(item).toLowerCase().split(/[^\p{L}\p{N}+#]+/u).filter(word=>word.length>2&&job.includes(word)).length;}
function skillGroups(){const source=state.cv.skills||[];const items=state.adapted?[...source].sort((a,b)=>skillRelevance(b)-skillRelevance(a)):source;const labels=cvLabels();const patterns={tools:/\b(ga4|google analytics|looker|tag manager|gtm|semrush|ahrefs|wordpress|hubspot|salesforce|figma|notion|airtable|canva|adobe|photoshop|illustrator|premiere|html|css|meta ads|google ads|linkedin campaign|mailchimp|brevo|make|zapier|excel|power bi|admob|audience network)\b/i,content:/content|social|community|communaut|rédaction|redaction|writing|copywriting|editorial|éditorial|storytelling|communication|video/i,analytics:/data|analyse|analysis|reporting|insight|measurement|mesure|dashboard|attribution|automatisation|automation|\bia\b|artificial intelligence/i,strategy:/seo|sea|aso|acquisition|growth|strategie|stratégie|cro|funnel|conversion|lifecycle|retention|monetisation|monétisation|campaign|campagne/i};const buckets=[[labels.strategy,[]],[labels.analytics,[]],[labels.content,[]],[labels.core,[]],[labels.tools,[]]];for(const item of items){const target=patterns.tools.test(item)?4:patterns.content.test(item)?2:patterns.analytics.test(item)?1:patterns.strategy.test(item)?0:3;buckets[target][1].push(item);}const groups=buckets.filter(([,list])=>list.length);const small=groups.filter(([,list])=>list.length===1);let result=groups.filter(([,list])=>list.length>1);if(small.length>=2)result.push([labels.core,small.flatMap(([,list])=>list)]);else if(small.length===1){const single=small[0][1];const destination=result.find(([label])=>label!==labels.tools)||result[0];if(destination)destination[1].push(...single);else result.push([labels.core,single]);}return result;}
function certificationParts(item){const str=String(item);const idx=str.lastIndexOf(' - ');return idx!==-1?{name:str.slice(0,idx).trim(),issuer:str.slice(idx+3).trim()}:{name:str,issuer:''};}
function staticCvMarkup(){return cvMarkup().replace(/\scontenteditable data-path="[^"]+"/g,'');}
function staticCoverLetterMarkup(){return coverLetterMarkup().replace(/\scontenteditable data-path="[^"]+"/g,'');}
function coverLetterMarkup(){
  const p=state.cv.personal;
  const dateStr=new Date().toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'numeric'});
  const defaultGreeting='Dear Hiring Manager,';
  const defaultSubject=`Work-Study Application - Digital Marketing & Growth (${schoolCfg.rhythmEn})`;
  const defaultP1=`I am interested in your company's digital growth and would welcome the opportunity to contribute to your team.

My background combines creative design and UX with hands-on digital marketing. I independently grew mobile applications to more than 2 million cumulative downloads and developed a health information database.

I bring practical experience in SEO, ASO, GEO, WordPress, GA4, and Looker Studio. At Orange Travel, I also developed an AI automation tool to identify link-building opportunities.

${schoolCfg.clEnSnippet} I would be glad to bring this mix of creative thinking, analytical skills, and practical execution to your goals.`;
  const defaultP2='I would welcome the opportunity to discuss how my background aligns with your goals during an interview.';
  const defaultSignoff='Sincerely,';
  const letter=state.cv.coverLetter||{};
  const greeting=letter.greeting||defaultGreeting;
  const paragraph=letter.paragraph||defaultP1;
  const closing=letter.closing||defaultP2;
  const signoff=letter.signoff||defaultSignoff;
  const subjectText=letter.subject||defaultSubject;
  const subjectLine=`<p style="margin-bottom:16px; font-weight:700; color:#17687a; background:#e8f4f6; padding:7px 12px; border-radius:6px; border:1px solid #b2d7de; font-size:0.95em;"><strong>${isEn?'Subject:':'Subject:'}</strong> <span ${settings.editMode?'contenteditable data-path="coverLetter.subject"':''}>${esc(subjectText)}</span></p>`;
  return `<div class="cv-header"><div class="cv-header-top">${settings.photo?`<img class="profile-photo" src="${esc(avatar())}" onerror="this.onerror=null;this.src='profile-default.png'" alt="Profile photo"/>`:''}<div class="identity"><h1 ${settings.editMode?'contenteditable data-path="personal.name"':''}>${esc(p.name)}</h1><p class="role" ${settings.editMode?'contenteditable data-path="personal.role"':''}>${esc(p.role)}</p></div></div><div class="contact"><span ${settings.editMode?'contenteditable data-path="personal.location"':''}>${esc(p.location)}</span><span ${settings.editMode?'contenteditable data-path="personal.phone"':''}>${esc(p.phone)}</span><span ${settings.editMode?'contenteditable data-path="personal.email"':''}>${esc(p.email)}</span><span ${settings.editMode?'contenteditable data-path="personal.linkedin"':''}>${esc(p.linkedin)}</span></div></div><section class="cv-section cover-letter-body" style="margin-top:24px; font-size:0.95em; line-height:1.55;"><p style="margin-bottom:18px; text-align:right; font-size:0.95em; color:#64748b;">${dateStr}</p>${subjectLine}<p ${settings.editMode?'contenteditable data-path="coverLetter.greeting"':''} style="margin-bottom:14px; font-weight:600;">${esc(greeting)}</p><div ${settings.editMode?'contenteditable data-path="coverLetter.paragraph"':''} style="margin-bottom:14px; white-space:pre-line; text-align:justify;">${esc(paragraph)}</div><p ${settings.editMode?'contenteditable data-path="coverLetter.closing"':''} style="margin-bottom:18px; text-align:justify;">${esc(closing)}</p><p ${settings.editMode?'contenteditable data-path="coverLetter.signoff"':''} style="margin-bottom:10px;">${esc(signoff)}</p><p ${settings.editMode?'contenteditable data-path="personal.name"':''} style="font-weight:600;">${esc(p.name)}</p></section>`;
}
function cvMarkup() { const p=state.cv.personal; const labels=cvLabels(); const skills=skillGroups().map(([label,list])=>`<div class="skill-row"><span>${esc(label)}</span><p>${list.map(esc).join(' · ')}</p></div>`).join(''); const languagesHtml=(state.cv.languages||[]).map(l=>`<span class="cv-item-text">${esc(l)}</span>`).join('<span class="cv-item-sep"> | </span>'); const certificationsHtml=(state.cv.certifications||[]).map(c=>`<span class="cv-item-text">${esc(c)}</span>`).join('<span class="cv-item-sep"> | </span>'); return `<div class="cv-header"><div class="cv-header-top">${settings.photo ? `<img class="profile-photo" src="${esc(avatar())}" onerror="this.onerror=null;this.src='profile-default.png'" alt="Profile photo"/>` : ''}<div class="identity"><h1 contenteditable data-path="personal.name">${esc(p.name)}</h1><p class="role" contenteditable data-path="personal.role">${esc(p.role)}</p><p class="subtitle" contenteditable data-path="personal.subtitle">${esc(p.subtitle)}</p></div></div><div class="contact"><span contenteditable data-path="personal.location">${esc(p.location)}</span><span contenteditable data-path="personal.phone">${esc(p.phone)}</span><span contenteditable data-path="personal.email">${esc(p.email)}</span><span contenteditable data-path="personal.linkedin">${esc(p.linkedin)}</span></div></div>`+(!settings.hideSummary&&state.cv.summary?`<section class="cv-section"><h2 data-section="summary">${esc(labels.summary)}</h2><p contenteditable data-path="summary">${esc(state.cv.summary)}</p></section>`:'')+(!settings.hideExperience&&state.cv.experience?.length?`<section class="cv-section"><h2 data-section="experience">${esc(labels.experience)}</h2>${state.cv.experience.map((e,i)=>`<div class="cv-item"><div class="item-top"><h3 contenteditable data-path="experience.${i}.title">${esc(e.title)}</h3><span contenteditable data-path="experience.${i}.dates">${esc(e.dates)}</span></div><p class="company"><span contenteditable data-path="experience.${i}.company">${esc(e.company)}</span> · <span contenteditable data-path="experience.${i}.location">${esc(e.location)}</span></p><ul>${e.bullets.map((b,j)=>`<li contenteditable data-path="experience.${i}.bullets.${j}">${esc(b)}</li>`).join('')}</ul></div>`).join('')}</section>`:'')+(!settings.hideEducation&&state.cv.education?.length?`<section class="cv-section"><h2 data-section="education">${esc(labels.education)}</h2>${state.cv.education.map((e,i)=>`<div class="cv-item"><div class="item-top"><h3 contenteditable data-path="education.${i}.degree">${esc(e.degree)}</h3><span contenteditable data-path="education.${i}.dates">${esc(e.dates)}</span></div><p class="company"><span contenteditable data-path="education.${i}.institution">${esc(e.institution)}</span> · <span contenteditable data-path="education.${i}.location">${esc(e.location)}</span></p></div>`).join('')}</section>`:'')+(!settings.hideSkills&&skills?`<section class="cv-section"><h2 data-section="skills">${esc(labels.skills)}</h2><div class="skill-groups">${skills}</div></section>`:'')+(!settings.hideLanguages&&state.cv.languages?.length?`<section class="cv-section"><h2 data-section="languages">${esc(labels.languages)}</h2><p class="cv-inline-items" ${settings.editMode?'contenteditable data-path="languages"':''}>${languagesHtml}</p></section>`:'')+(!settings.hideCertifications&&state.cv.certifications?.length?`<section class="cv-section"><h2 data-section="certifications">${esc(labels.certifications)}</h2><p class="cv-inline-items" ${settings.editMode?'contenteditable data-path="certifications"':''}>${certificationsHtml}</p></section>`:''); }
function evidenceSourceFor(word){const cv=state.cv;const needle=String(word).toLowerCase();if(String(cv.summary||'').toLowerCase().includes(needle))return {label:'Summary',text:cv.summary};for(const entry of cv.experience||[]){for(const bullet of entry.bullets||[])if(String(bullet).toLowerCase().includes(needle))return {label:`${entry.title} · ${entry.company}`,text:bullet};if(String(entry.title+' '+entry.company).toLowerCase().includes(needle))return {label:'Experience',text:`${entry.title} · ${entry.company}`};}for(const skill of cv.skills||[])if(String(skill).toLowerCase().includes(needle))return {label:'Skills',text:skill};for(const item of cv.certifications||[])if(String(item).toLowerCase().includes(needle))return {label:'Certification',text:item};return {label:'CV content',text:word};}
function requirementFor(word){return String(state.job||'').split(/(?<=[.!?])\s+|\n+/).find(sentence=>sentence.toLowerCase().includes(String(word).toLowerCase()))||String(state.job||'').slice(0,180);}
function changesView(){
  const snapshot=JSON.parse(localStorage.getItem('joby-job-snapshot')||'null');
  const run=JSON.parse(localStorage.getItem('joby-last-run')||'null');
  const metrics=ats();
  const words=[...new Set(metrics.keywords)].slice(0,36);
  const matched=words.filter(word=>metrics.hits.includes(word));
  const missing=words.filter(word=>!metrics.hits.includes(word));
  const when=snapshot?.savedAt?new Date(snapshot.savedAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'No saved snapshot';
  return `<div class="evidence-page"><div class="evidence-title"><div><p class="eyebrow">SHOW YOUR WORK</p><h2>Evidence & data trail</h2><p>See what Joby used, when it was captured, and which terms appear in your CV.</p></div><span class="evidence-badge"><i></i>${run?'Agent run recorded':'Ready for first run'}</span></div><div class="evidence-stats"><article><span>Job data</span><strong>${snapshot?'1 snapshot':'Not saved'}</strong><small>${esc(when)}</small></article><article><span>Keyword overlap</span><strong>${metrics.hits.length}<small> / ${metrics.keywords.length}</small></strong><small>Literal term matches in the current CV</small></article><article><span>Last run</span><strong>${run?'Completed':'No run yet'}</strong><small>${run?.ranAt?esc(new Date(run.ranAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})):'Add a key and tailor to record a live run'}</small></article></div><div class="run-comparison">${run?.before&&run?.after?`<div><span>Base CV</span><strong>${run.before.matched} / ${run.before.total}</strong></div><b>→</b><div><span>Tailored CV</span><strong>${run.after.matched} / ${run.after.total}</strong></div><small>Same job text · literal keyword overlap</small>`:`<div><span>Before / after comparison</span><strong>${run?'Baseline not recorded for this imported result':'Available after a live tailoring run'}</strong></div><small>Joby compares the Base CV and tailored output using the same job snapshot.</small>`}</div><div class="evidence-columns"><section><div class="evidence-section-head"><h3>Found in your CV</h3><span class="term-count good">${matched.length} terms</span></div><p>These job description terms also appear in the Base or tailored CV.</p><div class="term-list">${matched.length?matched.slice(0,18).map(x=>{const proof=evidenceSourceFor(x);return `<span class="term found" title="Job: ${esc(requirementFor(x))}&#10;CV source (${esc(proof.label)}): ${esc(proof.text)}">${esc(x)} · ${esc(proof.label)}</span>`}).join(''):'<span class="empty-evidence">No direct keyword matches yet.</span>'}</div></section><section><div class="evidence-section-head"><h3>Not found in your CV</h3><span class="term-count gap">${missing.length} terms</span></div><p>These terms need review. Joby should not add unsupported experience.</p><div class="term-list">${missing.length?missing.slice(0,18).map(x=>`<span class="term missing" title="Job requirement: ${esc(requirementFor(x))}">${esc(x)}</span>`).join(''):'<span class="empty-evidence">No unmatched terms in this sample.</span>'}</div></section></div><div class="evidence-source"><span class="source-icon">↳</span><div><strong>Source and freshness</strong><p>Job text source: ${snapshot?.source==='demo'?'recorded demo scenario':'text pasted by the user'}. Snapshot captured: ${esc(when)}. Base CV source: one anonymized English CV.</p><small>${esc(state.dataStatus||'Local demo storage · Aiven not connected')}. Keyword matches are not a full claim verification, so review all generated text.</small></div></div><p class="metric-note">Keyword overlap is a transparent text comparison, not an ATS prediction or hiring score. Live model results are labeled in the run history.</p></div>`;
}
function aiView(){ return `<div class="insight-page"><p class="eyebrow">Web AI Workflow</p><h2>Adapt with Gemini, Claude, or ChatGPT in your browser.</h2><p class="lead">No API key or complex setup required. Choose your favorite AI assistant, generate your tailored prompt in 1 click, and paste the returned JSON directly back into your CV.</p><div class="ai-callout" style="margin-bottom:15px;"><span class="ai-orb">✦</span><div><strong>Google Gemini</strong><p>Fast and accurate. Prompt copied to clipboard → open gemini.google.com and press Ctrl+V.</p></div></div><div class="ai-callout" style="margin-bottom:15px;"><span class="ai-orb" style="background:linear-gradient(135deg,#d97706,#b45309)">✻</span><div><strong>Anthropic Claude</strong><p>Exceptional editorial nuance. Prompt copied to clipboard → open claude.ai and press Ctrl+V.</p></div></div><div class="ai-callout"><span class="ai-orb" style="background:linear-gradient(135deg,#10a37f,#059669)">🤖</span><div><strong>OpenAI ChatGPT</strong><p>Direct pre-fill supported! Prompt is loaded directly into chatgpt.com text input field.</p></div></div></div>`; }
function bind(){
  document.querySelectorAll('.panel-toggle').forEach(b=>b.onclick=()=>b.parentElement.classList.toggle('open'));
  document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{settings.template=b.dataset.template;shell()});
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;shell()});
  if ($('#adapt-alternance')) $('#adapt-alternance').onclick=()=>openInAI(state.aiProvider,'alternance');
  if ($('#adapt-job')) $('#adapt-job').onclick=()=>openInAI(state.aiProvider,'job');
  document.querySelectorAll('.provider-btn').forEach(btn=>btn.onclick=()=>{state.aiProvider=btn.dataset.provider;localStorage.setItem('cv-adapt-provider',state.aiProvider);shell();});
  if ($('#edit-mode')) $('#edit-mode').onclick=()=>{settings.editMode=!settings.editMode;toast(settings.editMode?'Editing enabled. Turn it off before exporting.':'Editing disabled. The CV is ready to export.');shell()};
  if ($('#print')) $('#print').onclick=()=>exportPdf('cv');
  if ($('#scroll-to-cv')) $('#scroll-to-cv').onclick=()=>$('.joby-main')?.scrollIntoView({behavior:'smooth',block:'start'});
  if ($('#upload-base-cv')) $('#upload-base-cv').onclick=()=>$('#base-cv-file')?.click();
  if ($('#base-cv-file')) $('#base-cv-file').onchange=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const cv=JSON.parse(reader.result);state.baseCv=normalizeCvObject(cv,'job');state.baseCv.personal.name='Alex Morgan';state.baseCv.personal.location='';state.baseCv.personal.phone='';state.baseCv.personal.email='';state.baseCv.personal.linkedin='';state.baseCv.personal.website='';state.baseCv.education=(state.baseCv.education||[]).filter(e=>!/^(iscom|hetic|inseec)$/i.test(String(e.institution||'').trim()));state.cv=JSON.parse(JSON.stringify(state.baseCv));state.adapted=false;localStorage.removeItem(TAILORED_CV_KEY);persistBaseCv();void syncAiven('base-cv',{cv:state.baseCv},'PUT');save();shell();toast('Base CV imported and saved locally.')}catch(error){toast('Could not read this CV JSON: '+error.message)}};reader.readAsText(file)};
  if ($('#print-letter')) $('#print-letter').onclick=()=>exportPdf('letter');
  if ($('#toggle-cover-letter')) $('#toggle-cover-letter').onclick=()=>{settings.coverLetter=!settings.coverLetter;if(settings.coverLetter&&!state.cv.coverLetter){state.cv.coverLetter={};save();}shell();toast(settings.coverLetter?'Cover Letter activated':'Cover Letter deactivated');};
  if ($('#job')) $('#job').oninput=e=>{state.job=clean(e.target.value);state.jobSource='user';localStorage.setItem('joby-current-job',state.job);localStorage.setItem('joby-job-source','user');};
  if ($('#priority')) $('#priority').oninput=e=>state.priority=clean(e.target.value);
  if ($('#reset')) $('#reset').onclick=()=>{state.baseCv=JSON.parse(JSON.stringify(defaultCvEn));applySchool();state.cv=JSON.parse(JSON.stringify(state.baseCv));state.adapted=false;localStorage.removeItem(TAILORED_CV_KEY);persistBaseCv();void syncAiven('base-cv',{cv:state.baseCv},'PUT');save();settings.coverLetter=false;toast('Demo Base CV restored');shell()};
  if ($('#photo')) $('#photo').onchange=e=>{settings.photo=e.target.checked;renderPreview()};
  if ($('#cover-letter')) $('#cover-letter').onchange=e=>{settings.coverLetter=e.target.checked;if(settings.coverLetter&&!state.cv.coverLetter){state.cv.coverLetter={};save();}shell();};
  if ($('#font')) $('#font').oninput=e=>{settings.font=e.target.value;updateControls();renderPreview()};
  if ($('#margin')) $('#margin').oninput=e=>{settings.margin=e.target.value;updateControls();renderPreview()};
  if ($('#line')) $('#line').oninput=e=>{settings.line=e.target.value;updateControls();renderPreview()};
  ['hide-linkedin','hide-website','hide-phone','hide-location','hide-summary','hide-skills','hide-languages','hide-certifications','hide-experience','hide-education'].forEach(id=>{
    const el=$('#'+id);
    if(el){
      const prop=id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
      el.onchange=e=>{settings[prop]=e.target.checked;renderPreview()};
    }
  });
  if ($('#json')) $('#json').oninput=e=>{try{const next=JSON.parse(e.target.value);state.cv=next;state.jsonError='';save();$('#validation').textContent='Valid CV JSON. Saved locally.';$('#validation').classList.remove('error');renderPreview()}catch(err){state.jsonError='JSON needs attention: '+err.message;$('#validation').textContent=state.jsonError;$('#validation').classList.add('error')}};
  if ($('#upload')) $('#upload').onchange=e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{$('#json').value=reader.result;$('#json').dispatchEvent(new Event('input'));toast('CV JSON imported')};reader.readAsText(f)};

  if ($('#tracker-search-input')) {
    $('#tracker-search-input').oninput = e => {
      state.trackerSearch = e.target.value;
      const list = $('.apps-list');
      if (list) list.innerHTML = renderFilteredAppsList();
    };
  }
  if ($('#tracker-school-select')) {
    $('#tracker-school-select').onchange = e => {
      state.trackerSchoolFilter = e.target.value;
      shell();
    };
  }
  if ($('#input-import-apps')) {
    $('#input-import-apps').onchange = e => {
      const f = e.target.files[0];
      if (f) importApplicationsJson(f);
    };
  }
  document.addEventListener('blur', editHandler, true);
}

async function exportPdf(mode='all'){
  if(state.tab==='changes'||state.tab==='ai'){state.tab='adapted';shell()}
  const isLetterOnly = mode === 'letter';
  toast(`Generating ${isLetterOnly ? 'Cover Letter' : 'PDF'}...`);
  setPrintEditState(false);
  
  let selector = '.cv-paper';
  if(mode === 'cv') selector = '.cv-paper:not(.cover-letter-page)';
  else if(mode === 'letter') selector = '.cv-paper.cover-letter-page';

  const papers = Array.from(document.querySelectorAll(selector));
  if(!papers.length){
    toast('No document found to export.');
    setPrintEditState(settings.editMode);
    return;
  }

  const html = papers.map(p => p.outerHTML).join('\n');
  const pdfApi = `${APIS_BASE}/api/export-pdf`;
  try {
    const res=await fetch(pdfApi,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({html,css:'',coverLetter:isLetterOnly})});
    if(!res.ok) {
      const errText = await res.text().catch(()=>'');
      throw new Error(errText || `Server error (${res.status})`);
    }
    const blob=await res.blob();
    const url=window.URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    let downloadName = suggestedFilename();
    if(isLetterOnly) {
      const title = state.cv.personal.role || jobTitle();
      downloadName = `Lettre_de_Motivation_${filenamePart(state.cv.personal.name)}_${filenamePart(title)}`;
    }
    a.download=downloadName+'.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast(isLetterOnly ? 'Cover Letter PDF downloaded' : 'PDF exported successfully on 1 page');
  }catch(err){
    toast('Error: '+(err.message || 'Is the Joby data server running?'));
  }finally{
    setPrintEditState(settings.editMode);
  }
}
function editHandler(e){if(!e.target.matches('[contenteditable][data-path]'))return;const path=e.target.dataset.path.split('.');let obj=state.tab==='original'?state.baseCv:state.cv;for(let i=0;i<path.length-1;i++)obj=obj[path[i]];const key=path.at(-1);if(['skills','languages','certifications'].includes(path[0])){obj[key]=e.target.innerText.split(/[|,\n]+/).map(v=>clean(v)).filter(Boolean);}else{obj[key]=clean(e.target.innerText);}if(state.tab==='original'){persistBaseCv();void syncAiven('base-cv',{cv:state.baseCv},'PUT');if(!state.adapted){state.cv=JSON.parse(JSON.stringify(state.baseCv));save();}}else{save();localStorage.setItem(TAILORED_CV_KEY,JSON.stringify(state.cv));}}
function updateControls(){ $('#font-out').textContent=settings.font+'px';$('#margin-out').textContent=settings.margin+'mm';$('#line-out').textContent=settings.line; }
function renderPreview(){const paper=$('.paper-wrap');if(!paper)return;const previewCv=state.tab==='original'?state.baseCv:state.cv;const html=withPreviewCv(previewCv,()=>`<article class="cv-paper ${settings.template}" style="--cv-font:${settings.font}px;--cv-margin:${settings.margin}mm;--cv-line:${settings.line}">${settings.editMode?cvMarkup():staticCvMarkup()}</article>`);paper.innerHTML=`<span class="a4-label">210 × 297 mm</span>${html}`;enhanceContact();localizeCv();renderFilename();}
function setPrintEditState(editable){document.querySelectorAll('.cv-paper [contenteditable]').forEach(el=>el.setAttribute('contenteditable',editable?'true':'false'));}
function calculatePrintFit(){
  const paper=$('.cv-paper:not(.cover-letter-page)') || $('.cv-paper');
  if(!paper)return {height:0};
  return {height: paper.scrollHeight};
}
function reportPrintFit(){toast('1-page check: perfectly fitted on one A4 page.');}
function normalizeAlternanceSubtitle() { return ''; }

function cleanAndParseJson(raw) {
  if (!raw) throw new Error('Empty AI response.');
  if (typeof raw === 'object') return raw;
  let str = String(raw).trim();

  // Strip code fences: ```json ... ``` or ``` ... ```
  str = str.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();

  // Attempt 1: Direct JSON.parse
  try {
    return JSON.parse(str);
  } catch (_) {}

  // Attempt 2: Extract from first { to last }
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = str.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) {}

    // Attempt 3: Remove trailing commas before } or ] & replace curly quotes
    let sanitized = candidate
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");
    try {
      return JSON.parse(sanitized);
    } catch (_) {}

    // Attempt 4: Clean control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, c => {
      if (c === '\n') return '\\n';
      if (c === '\r') return '\\r';
      if (c === '\t') return '\\t';
      return '';
    });
    try {
      return JSON.parse(sanitized);
    } catch (_) {}
  }

  throw new Error('AI response could not be parsed as JSON. Please ensure the response contains valid JSON.');
}

function normalizeCvObject(parsed, track = 'alternance') {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON: root is not an object.');
  }

  let next = parsed;
  // Unwrap common wrapper keys
  for (const k of ['cv', 'adapted_cv', 'adaptedCv', 'data', 'result', 'response', 'candidate', 'output', 'content']) {
    if (next[k] && typeof next[k] === 'object' && !Array.isArray(next[k])) {
      if (next[k].personal || next[k].experience || next[k].experiences || next[k].summary || next[k].skills) {
        next = next[k];
        break;
      }
    }
  }

  const base = state.cv || {};
  const basePersonal = base.personal || {};

  // 1. Personal
  const rawP = next.personal || next.profile || next.profil || next.candidate || next.coordonnees || {};
  const lang = targetLanguage();
  const normalizedSub = normalizeAlternanceSubtitle(rawP.subtitle || basePersonal.subtitle, state.job, lang, track);

  const personal = {
    name: 'Alex Morgan',
    role: rawP.role || rawP.title || rawP.jobTitle || rawP.poste || basePersonal.role || 'Marketing Digital & SEO',
    subtitle: normalizedSub,
    location: '',
    phone: '',
    email: '',
    linkedin: '',
    website: '',
    photo: ''
  };

  // 2. Summary
  let summary = next.summary || next.profil || next.profile || next.about || next.presentation || base.summary || '';
  if (typeof summary !== 'string') summary = String(summary || '');

  // 3. Skills
  let rawSkills = next.skills || next.competences || next.compétences || next.keySkills || base.skills || [];
  if (!Array.isArray(rawSkills)) {
    rawSkills = typeof rawSkills === 'string' ? rawSkills.split(/[,\n·•]+/).map(s => s.trim()).filter(Boolean) : base.skills;
  }
  const skills = (rawSkills && rawSkills.length ? rawSkills : (base.skills || [])).map(s => String(s).trim()).filter(Boolean);

  // 4. Experience
  let rawExp = next.experience || next.experiences || next.work_experience || next.workExperience || next.parcours || base.experience || [];
  if (!Array.isArray(rawExp) || rawExp.length === 0) {
    rawExp = base.experience || [];
  }
  const experience = rawExp.map((exp, idx) => {
    const baseExp = (base.experience && base.experience[idx]) || {};
    let rawBullets = exp.bullets || exp.missions || exp.tasks || exp.responsibilities || exp.achievements || baseExp.bullets || [];
    if (!Array.isArray(rawBullets)) {
      rawBullets = typeof rawBullets === 'string' ? rawBullets.split(/\n+/).map(b => b.trim()).filter(Boolean) : [];
    }
    return {
      title: exp.title || exp.poste || baseExp.title || '',
      company: exp.company || exp.entreprise || baseExp.company || '',
      dates: exp.dates || exp.periode || baseExp.dates || '',
      location: exp.location || exp.lieu || baseExp.location || '',
      bullets: rawBullets.map(b => String(b).replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean)
    };
  });

  // 5. Education
  let rawEdu = next.education || next.educations || next.formations || next.formation || next.studies || base.education || [];
  if (!Array.isArray(rawEdu) || rawEdu.length === 0) {
    rawEdu = base.education || [];
  }
  const filteredEdu = rawEdu.filter(edu => !/licence|bachelor|uae/i.test(((edu.degree || '') + ' ' + (edu.institution || ''))));
  const education = (filteredEdu.length ? filteredEdu : base.education).filter(edu=>!/^(iscom|hetic|inseec)$/i.test(String(edu.institution||edu.ecole||'').trim())).map((edu, idx) => {
    const baseEdu = (base.education && base.education[idx]) || {};
    return {
      degree: edu.degree || edu.diplome || baseEdu.degree || '',
      institution: edu.institution || edu.ecole || baseEdu.institution || '',
      dates: String(edu.dates || baseEdu.dates || '').replace(/\s*\(?work[- ]study\)?/ig,''),
      location: edu.location || baseEdu.location || '',
      description: edu.description || baseEdu.description || ''
    };
  });

  // 6. Languages & Certifications
  const languages = Array.isArray(next.languages || next.langues) ? (next.languages || next.langues) : (base.languages || []);
  const certifications = Array.isArray(next.certifications) ? next.certifications : (base.certifications || []);

  // 7. Cover Letter
  let rawLetter = next.coverLetter || next.cover_letter || next.lettre || next.lettre_de_motivation || base.coverLetter || {};
  if (typeof rawLetter === 'string') {
    rawLetter = { paragraph: rawLetter };
  }
  const coverLetter = {
    subject: rawLetter.subject || rawLetter.objet || base.coverLetter?.subject || '',
    greeting: rawLetter.greeting || base.coverLetter?.greeting || '',
    paragraph: rawLetter.paragraph || rawLetter.body || rawLetter.message || base.coverLetter?.paragraph || '',
    closing: rawLetter.closing || base.coverLetter?.closing || '',
    signoff: rawLetter.signoff || base.coverLetter?.signoff || ''
  };

  return {
    personal,
    summary,
    skills,
    languages,
    certifications,
    experience,
    education,
    coverLetter
  };
}

async function pasteJsonFromClipboard(){
  try{
    const raw = await navigator.clipboard.readText();
    const parsed = cleanAndParseJson(raw);
    const next = normalizeCvObject(parsed, 'job');
    state.cv = next;
    state.adapted=true;
    localStorage.setItem(TAILORED_CV_KEY,JSON.stringify(state.cv));
    state.adapted = true;
    const before=withPreviewCv(state.baseCv,()=>ats());
    const after=ats();
    localStorage.setItem('joby-last-run',JSON.stringify({ranAt:new Date().toISOString(),source:'external',before:{matched:before.hits.length,total:before.keywords.length},after:{matched:after.hits.length,total:after.keywords.length},jobHash:btoa(unescape(encodeURIComponent(state.job||''))).slice(0,22)}));
    persistRunToAiven(JSON.parse(localStorage.getItem('joby-last-run')),state.cv);
    save();
    shell();
    toast('AI JSON pasted. Review the result and evidence.');
  }catch(error){
    console.error('Paste JSON error:', error);
    toast('Error reading AI JSON: ' + (error.message || 'Clipboard does not contain valid CV JSON.'));
  }
}

function openInAI(provider = state.aiProvider || 'gemini', track = 'job'){
  state.track = track;
  state.aiProvider = provider;
  localStorage.setItem('cv-adapt-track', track);
  localStorage.setItem('cv-adapt-provider', provider);
  
  const prompt = promptText(track);
  let providerName = 'Gemini';
  let targetUrl = 'https://gemini.google.com/app';
  
  if (provider === 'claude') {
    providerName = 'Claude';
    targetUrl = 'https://claude.ai/new';
  } else if (provider === 'chatgpt') {
    providerName = 'ChatGPT';
    targetUrl = 'https://chatgpt.com/';
  }
  
  if (provider === 'chatgpt') {
    copyText(prompt, `Prompt copied. Paste it into the new ChatGPT chat when you're ready.`);
  } else {
    copyText(prompt, `${providerName} prompt copied! Opening ${providerName}... Press Ctrl+V to paste.`);
  }
  
  setTimeout(() => {
    window.open(targetUrl, '_blank');
  }, 350);
}
const adaptWithGemini = (track) => openInAI('gemini', track);
const adaptWithClaude = (track) => openInAI('claude', track);
const adaptWithGroq = openInAI;

async function copyText(value,message){try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard API unavailable');await navigator.clipboard.writeText(value);toast(message);}catch(error){const field=document.createElement('textarea');field.value=value;field.setAttribute('readonly','');field.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';document.body.append(field);field.select();const copied=document.execCommand('copy');field.remove();toast(copied?message:'Could not copy text. Try again.');}}
document.addEventListener('click', async event => {
  if (event.target.closest('#save-job-snapshot')) {
    const text=String($('#job')?.value||'').trim();
    if(!text){toast('Paste a job description before saving a snapshot.');return;}
    state.job=text;localStorage.setItem('joby-current-job',text);localStorage.setItem('joby-job-source',state.jobSource||'user');
    const hash=btoa(unescape(encodeURIComponent(text))).slice(0,22);
    const previous=JSON.parse(localStorage.getItem('joby-job-snapshot')||'null');
    const source=text===DEMO_JOB_TEXT?'demo':'user';
    const snapshotRecord={id:'job_'+Date.now(),contentHash:hash,text,source,savedAt:new Date().toISOString(),version:(previous?.version||0)+1};
    localStorage.setItem('joby-job-snapshot',JSON.stringify(snapshotRecord));
    await syncAiven('job-snapshots',snapshotRecord);
    shell();toast(previous&&previous.contentHash!==hash?'Updated job snapshot saved.':'Job snapshot saved locally.');return;
  }
  if(event.target.closest('#open-ai-adapt')){openInAI(state.aiProvider,'job');return;}
  if(event.target.closest('#evidence-tab')){state.tab='changes';shell();$('.evidence-page')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  // School selection pills
  const schoolPill = event.target.closest('[data-school-pill]');
  if (schoolPill) {
    applySchool(schoolPill.dataset.schoolPill);
    return;
  }

  // View navigation tabs (CV Studio vs Application Tracker)
  const viewBtn = event.target.closest('[data-view-btn]');
  if (viewBtn) {
    state.view = viewBtn.dataset.viewBtn;
    localStorage.setItem(VIEW_KEY, state.view);
    shell();
    return;
  }

  // Save current job from Studio to Tracker
  if (event.target.closest('#save-job-to-tracker')) {
    saveCurrentJobToTracker();
    return;
  }

  // Tracker top buttons
  if (event.target.closest('#btn-new-app') || event.target.closest('#topbar-new-app') || event.target.closest('#btn-empty-new-app')) {
    openNewAppModal();
    return;
  }
  if (event.target.closest('#btn-export-apps')) {
    exportApplicationsJson();
    return;
  }

  // Tracker filter pills
  const filterPill = event.target.closest('[data-filter]');
  if (filterPill) {
    state.trackerFilter = filterPill.dataset.filter;
    shell();
    return;
  }

  // App card actions
  const openKitBtn = event.target.closest('[data-action="open-kit"]');
  if (openKitBtn) {
    openInterviewKit(openKitBtn.dataset.id);
    return;
  }

  const openCvBtn = event.target.closest('[data-action="open-cv"]');
  if (openCvBtn) {
    const app = state.applications.find(a => a.id === openCvBtn.dataset.id);
    if (app) {
      if (app.jobDescription) state.job = app.jobDescription;
      if (app.school) applySchool(app.school, true);
      state.view = 'cv';
      localStorage.setItem(VIEW_KEY, 'cv');
      shell();
      toast(`Role ${app.company} (${app.role}) managed dans le CV Studio`);
    }
    return;
  }

  const openRelanceBtn = event.target.closest('[data-action="open-relance"]');
  if (openRelanceBtn) {
    openRelanceModal(openRelanceBtn.dataset.id);
    return;
  }

  const editAppBtn = event.target.closest('[data-action="edit-app"]');
  if (editAppBtn) {
    openEditAppModal(editAppBtn.dataset.id);
    return;
  }

  const deleteAppBtn = event.target.closest('[data-action="delete-app"]');
  if (deleteAppBtn) {
    if (confirm('Are you sure you want to delete this application?')) {
      await apiDeleteApplication(deleteAppBtn.dataset.id);
      toast('Application deleted.');
      shell();
    }
    return;
  }

  // Modal dismissals
  if (event.target.id === 'modal-overlay' || event.target.closest('#btn-close-modal') || event.target.closest('#btn-close-modal-bottom') || event.target.closest('#btn-cancel-modal')) {
    closeModal();
    return;
  }

  // Modal Save Application form
  if (event.target.closest('#btn-save-app')) {
    event.preventDefault();
    const company = ($('#form-company')?.value || '').trim();
    const role = ($('#form-role')?.value || '').trim();
    if (!company || !role) {
      toast('Please enter at least a company and job title.');
      return;
    }
    const appPayload = {
      company,
      role,
      school: $('#form-school')?.value || state.school,
      contractType: $('#form-contract')?.value || 'Work-study',
      appliedDate: $('#form-date')?.value || new Date().toISOString().split('T')[0],
      status: $('#form-status')?.value || 'applied',
      contactName: ($('#form-contact-name')?.value || '').trim(),
      contactEmail: ($('#form-contact-email')?.value || '').trim(),
      interviewDate: $('#form-interview-date')?.value || '',
      interviewFormat: $('#form-interview-format')?.value || 'Visio',
      jobUrl: ($('#form-job-url')?.value || '').trim(),
      jobDescription: ($('#form-job-desc')?.value || '').trim(),
      notes: ($('#form-notes')?.value || '').trim()
    };

    if (state.activeModal === 'new_app') {
      const newApp = {
        id: 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        ...appPayload,
        followUps: [],
        interviewKit: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await apiSaveApplication(newApp);
      toast(`Application for ${company} saved.`);
    } else if (state.activeModal === 'edit_app') {
      await apiUpdateApplication(state.modalData.id, appPayload);
      toast(`Application ${company} updated.`);
    }
    closeModal();
    return;
  }

  // Follow-up modal actions
  if (event.target.closest('#btn-add-relance')) {
    const date = $('#relance-date')?.value || new Date().toISOString().split('T')[0];
    const channel = $('#relance-channel')?.value || 'Email';
    const notes = ($('#relance-notes')?.value || '').trim();
    const app = state.modalData.app;
    const followUps = app.followUps || [];
    followUps.push({ date, type: channel, notes });
    await apiUpdateApplication(app.id, { followUps, status: 'follow_up_sent' });
    state.modalData.app.followUps = followUps;
    state.modalData.app.status = 'follow_up_sent';
    toast('Follow-up saved!');
    shell();
    return;
  }

  if (event.target.closest('#btn-copy-relance-1')) {
    copyRelanceEmail(1, state.modalData.app);
    return;
  }
  if (event.target.closest('#btn-copy-relance-2')) {
    copyRelanceEmail(2, state.modalData.app);
    return;
  }

  // Interview Kit actions
  if (event.target.closest('#btn-generate-kit-ai')) {
    generateInterviewKitAI(state.modalData.appId);
    return;
  }
  if (event.target.closest('#btn-regen-kit')) {
    const app = state.applications.find(a => a.id === state.modalData.appId);
    if (app) {
      app.interviewKit = null;
      await apiUpdateApplication(app.id, { interviewKit: null });
      state.modalData.app.interviewKit = null;
      shell();
    }
    return;
  }
  if (event.target.closest('#btn-copy-kit-prompt')) {
    copyInterviewKitPrompt(state.modalData.appId);
    return;
  }
  if (event.target.closest('#btn-import-kit-json')) {
    const val = ($('#paste-kit-json-input')?.value || '').trim();
    if (!val) {
      toast('Paste the JSON returned by AI before importing.');
      return;
    }
    pasteInterviewKitJson(state.modalData.appId, val);
    return;
  }
  if (event.target.closest('#btn-copy-full-kit')) {
    copyFullInterviewKitText(state.modalData.appId);
    return;
  }
  if (event.target.closest('#btn-print-kit')) {
    window.print();
    return;
  }
  if (event.target.closest('#btn-copy-pitch')) {
    copyText(state.modalData.app?.interviewKit?.pitch || '', '🗣️ Pitch copied to clipboard!');
    return;
  }
  const kitTabBtn = event.target.closest('[data-kit-tab]');
  if (kitTabBtn) {
    state.activeKitTab = kitTabBtn.dataset.kitTab;
    shell();
    return;
  }
  const revealBtn = event.target.closest('.btn-reveal-ans');
  if (revealBtn) {
    const targetId = revealBtn.dataset.target;
    const ans = document.getElementById(targetId);
    if (ans) {
      const isHidden = ans.style.display === 'none';
      ans.style.display = isHidden ? 'block' : 'none';
      revealBtn.textContent = isHidden ? '🙈 Hide answer' : '👁️ Show answer';
    }
    return;
  }
  const qaToggle = event.target.closest('[data-action="toggle-qa"]');
  if (qaToggle) {
    const idx = qaToggle.dataset.qaIdx;
    const ans = document.getElementById(`qa-ans-${idx}`);
    if (ans) ans.style.display = ans.style.display === 'none' ? 'block' : 'none';
    return;
  }

  // Existing CV Adapt click handlers
  const profileChoice=event.target.closest('[data-default-profile]');
  if(profileChoice){const val=profileChoice.dataset.defaultProfile;const withCL=val.endsWith('-cl');const clean=withCL?val.slice(0,-3):val;const parts=clean.split('-');const lang=parts[0]||'fr';const track=parts[1]||'alternance';const variant=parts[2]||'growth';loadDefaultCv(lang,track,variant,withCL);}
  const defaultChoice=event.target.closest('[data-default-lang]');
  if(defaultChoice)loadDefaultCv(defaultChoice.dataset.defaultLang);
  if(event.target.closest('#paste-job-text')){navigator.clipboard.readText().then(text=>{if(text){state.job=text;save();shell();toast('Job description pasted.');}}).catch(()=>toast('Could not read clipboard.'));}
  if(event.target.closest('#auto-adapt-alternance'))autoAdaptWithDeepSeek('alternance');
  if(event.target.closest('#auto-adapt-job'))autoAdaptWithDeepSeek('job');
  if(event.target.closest('#auto-adapt-spontanee'))autoAdaptWithDeepSeek('spontanee');
  if(event.target.closest('#adapt-spontanee'))openInAI(state.aiProvider,'spontanee');
  if(event.target.closest('#paste-json'))pasteJsonFromClipboard();
  if(event.target.closest('#default-en'))loadDefaultCv('en','alternance',state.variant);
  if(event.target.closest('#copy-filename'))copyText(suggestedFilename(),'CV file name copied.');
  if(event.target.closest('#copy-prompt'))copyText(promptText('alternance'),'Work-study AI prompt copied to clipboard');
  if(event.target.closest('#copy-prompt-job'))copyText(promptText('job'),'Regular-job AI prompt copied to clipboard');
  if(event.target.closest('#copy-prompt-spontanee'))copyText(promptText('spontanee'),'Unsolicited application AI prompt copied to clipboard');
  if(event.target.closest('#copy-outreach-msg')){const letter=state.cv.coverLetter||{};let fullMsg='';if(letter.subject)fullMsg+=`Subject: ${letter.subject}\n\n`;if(letter.greeting)fullMsg+=`${letter.greeting}\n\n`;fullMsg+=`${letter.paragraph||''}\n\n`;if(letter.closing)fullMsg+=`${letter.closing}\n\n`;if(letter.signoff)fullMsg+=`${letter.signoff}\n`;fullMsg+=`${state.cv.personal?.name||''}`;if(fullMsg.trim()){copyText(fullMsg.trim(),'📩 Outreach Email (Subject + Body) copied to clipboard!');}else{toast('No outreach message available in current CV.');}}
});

document.addEventListener('change', async event => {
  const statusSelect = event.target.closest('[data-app-status-id]');
  if (statusSelect) {
    const appId = statusSelect.dataset.appStatusId;
    const newStatus = statusSelect.value;
    await apiUpdateApplication(appId, { status: newStatus });
    statusSelect.className = `status-dropdown status-${newStatus}`;
    toast('Status updated.');
  }
  if (event.target.id === 'toggle-rehearsal-mode') {
    state.rehearsalMode = event.target.checked;
    shell();
  }
});
document.addEventListener('input',event=>{if(event.target.matches('#job'))setTimeout(renderFilename);if(event.target.matches('#deepseek-key')){state.deepseekKey=event.target.value.trim();localStorage.setItem('cv-adapt-deepseek-key',state.deepseekKey);}});
document.addEventListener('click',event=>{if(event.target.closest('#set-default-template'))setDefaultDesign();});
window.addEventListener('beforeprint',()=>{setPrintEditState(false);calculatePrintFit();});window.addEventListener('afterprint',()=>{setPrintEditState(settings.editMode);document.documentElement.style.setProperty('--print-scale','.9');});

async function autoAdaptWithDeepSeek(track = 'alternance') {
  const keyInput = $('#deepseek-key');
  const apiKey = (keyInput ? keyInput.value : state.deepseekKey || '').trim();
  
  if (!apiKey) {
    toast('Please enter your DeepSeek API Key (sk-...) to use 1-click automatic adaptation.');
    if (keyInput) keyInput.focus();
    return;
  }

  const isSpontanee = track === 'spontanee';

  state.deepseekKey = apiKey;
  localStorage.setItem('cv-adapt-deepseek-key', apiKey);
  state.track = track;

  const btnAlt = $('#auto-adapt-alternance');
  const btnJob = $('#auto-adapt-job');
  const btnSpon = $('#auto-adapt-spontanee');
  const activeBtn = track === 'spontanee' ? btnSpon : (track === 'job' ? btnJob : btnAlt);
  const originalText = activeBtn ? activeBtn.innerHTML : '';

  if (activeBtn) {
    activeBtn.disabled = true;
    activeBtn.innerHTML = `<span>⏳ Adapting...</span>`;
  }
  const trackLabel = isSpontanee ? 'Unsolicited application' : (track === 'job' ? 'regular job' : 'alternance');
  toast(`Connecting to DeepSeek AI for ${trackLabel} adaptation...`);

  try {
    const prompt = promptText(track);
    const apiEndpoint = `${APIS_BASE}/api/adapt-deepseek`;
    
    let res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, prompt })
    });

    let rawContent = '';
    if (res.ok) {
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      rawContent = data.result || '';
    } else {
      // Direct fallback to DeepSeek API endpoint if server proxy is unreachable
      const directRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a senior career strategist and copywriter specializing in digital marketing, growth, and tech roles.\n\nCRITICAL OUTPUT RULES:\n- Output ONLY a single raw JSON object. The response MUST start with { and end with }. Zero markdown, zero code fences, zero explanations outside the JSON.\n- Preserve EVERY field name exactly as in the source schema. Do NOT add, remove, or rename keys.\n- All string values must use straight double-quotes. Use only regular hyphens (-), never em dashes (—) or en dashes (–).\n- All array items must remain arrays. All objects must remain objects. Do not flatten, merge, or nest differently.\n\nVOICE & EDITORIAL RULES:\n- Write in a natural, authentic, human voice. Avoid robotic corporate clichés (e.g. "Fort de", "Professionnel axé sur les résultats", "Dynamiser votre écosystème").\n- CRITICAL FOR ALTERNANCE: NEVER call the candidate an "expert" or claim "expertise". Frame him as an operational, high-autonomy growth practitioner who learns fast and delivers concrete results.\n- CONNECT THE DOTS: Show the synergy between his creative background (design/UX), data rigor (GA4/GTM), and acquisition channels (SEO, ASO, apps scaled to 2M+ downloads, and experience building a health information database).\n- COVER LETTER: Tailor the 4-paragraph master blueprint to the company challenges with genuine interest and concrete proof.\n- ATS compliance: mirror exact keywords from the target role in skills and bullets.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        })
      });
      if (!directRes.ok) {
        const errText = await directRes.text().catch(() => '');
        throw new Error(errText || `DeepSeek API error ${directRes.status}`);
      }
      const directData = await directRes.json();
      rawContent = directData.choices?.[0]?.message?.content || '';
    }

    const parsed = cleanAndParseJson(rawContent);
    const beforeMetrics=withPreviewCv(state.baseCv,()=>ats());
    const next = normalizeCvObject(parsed, 'job');

    state.cv = next;
    const afterMetrics=ats();
    const runAt=new Date().toISOString();
    const runRecord={ranAt:runAt,source:'api',before:{matched:beforeMetrics.hits.length,total:beforeMetrics.keywords.length},after:{matched:afterMetrics.hits.length,total:afterMetrics.keywords.length},jobHash:btoa(unescape(encodeURIComponent(state.job||''))).slice(0,22)};
    localStorage.setItem('joby-last-run',JSON.stringify(runRecord));
    persistRunToAiven(runRecord,state.cv);
    state.adapted = true;
    state.tab = 'adapted';
    settings.coverLetter = false; // Always keep cover letter OFF by default until user explicitly activates it
    save();
    shell();
    toast(isSpontanee ? '🎉 Unsolicited application CV & Outreach Message ready!' : '🎉 CV automatically adapted with DeepSeek AI!');
  } catch (err) {
    console.error('DeepSeek adapt error:', err);
    toast('Error adapting with DeepSeek: ' + (err.message || 'Check your API key and connection.'));
  } finally {
    if (activeBtn) {
      activeBtn.disabled = false;
      activeBtn.innerHTML = originalText;
    }
  }
}

function promptText(track='alternance'){
  const language=targetLanguage();
  const source=JSON.parse(JSON.stringify(state.baseCv));
  const isSpontanee = track === 'spontanee';
  const trackName=isSpontanee?'UNSOLICITED APPLICATION':(track==='job'?'REGULAR JOB (FULL-TIME / PERMANENT)':'WORK-STUDY');
  const cvJson=JSON.stringify(source,null,2);
  const targetDetails=state.job||'Growth & Digital Marketing — no specific target provided. Use best judgment.';

  const spontaneeContract = `UNSOLICITED APPLICATION EMAIL CONTRACT:
11. Add a root-level "coverLetter" object with exactly two string fields: "subject" and "paragraph".
12. Write a ready-to-send four-paragraph email in English. Personalize the opening to the target company, connect its needs to relevant achievements, state the work-study program and schedule when applicable, invite a brief conversation, and sign as Alex Morgan. Do not include contact details or personal website links.`;

  const coverLetterContract = `COVER LETTER CONTRACT:
11. Return a root-level "coverLetter" object with "subject", "greeting", "paragraph", "closing", and "signoff" fields.
12. Write every field in English. Use "Dear Hiring Manager," as the greeting and "Sincerely," as the signoff.
13. Structure the paragraph into four clear sections separated by blank lines: a specific reason for choosing the company; relevant proof such as 2M+ mobile app downloads, SEO and analytics work, and practical AI automation; the technical skills that fit the role; and how the candidate can contribute.
14. Do not include phone, email, address, social profiles, personal website links, or identifying project URLs.`;

  const personalisationRules = `CANDIDATE NARRATIVE AND VOICE:
15. Write in natural, concise English. Use a credible early-career, hands-on voice.
16. Connect design and UX, acquisition and SEO, analytics and automation, and measurable app growth.
17. Keep the summary to two or three sentences and under 55 words.
18. Write experience bullets as action, method or tool, and result. Preserve supported employers, degrees, dates, and metrics. Never invent facts.
19. Use only regular hyphens. Keep proper names and tool brands unchanged.
20. Do not include personal contact details or personal website links.`;

  return [
    `You are adapting a ${isSpontanee ? 'unsolicited application' : (track === 'job' ? 'regular job application' : 'work-study application')} CV. Source template: ${trackName}. Always start from the DEFAULT SOURCE CV below.`,
    ``,
    `=== STRICT OUTPUT CONTRACT ===`,
    `1. Return ONLY one valid JSON object. First char must be { and last char must be }. Zero markdown, zero code fences, zero text outside JSON.`,
    `2. Preserve the EXACT source schema: every field name, nested object shape, and array type. Do NOT add, remove, or rename any field. Output must parse with JSON.parse() without errors.`,
    `3. ANONYMIZED IDENTITY: Keep the generated name Alex Morgan. Leave location, phone, email, LinkedIn, website, and photo blank. Do not add personal contact details.`,
    `4. OUTPUT LANGUAGE: ${language}. Write ALL candidate-facing fields in ${language}. Keep proper nouns (employer names, city names, tool brand names, URLs, dates) unchanged regardless of language.`,
    `5. Use only ASCII hyphens (-). Never use em dashes or en dashes in any field.`,
    ``,
    `=== ATS & KEYWORD MATCHING ===`,
    `6. Scan TARGET DETAILS for specific tools, skills, and competencies mentioned. Mirror their EXACT wording in skills and bullets (e.g. if job says "Google Analytics 4", write "Google Analytics 4", not just "analytics").`,
    `7. SKILLS ARRAY: Return 10 to 14 tightly focused skill strings. Prioritize skills explicitly named in TARGET DETAILS. Deprioritize or remove skills with zero relevance.`,
    `8. ROLE TITLE (personal.role): A concise 2-5 word job title precisely matching the target role. Must be credibly supported by candidate experience.`,
    `9. SUBTITLE (personal.subtitle): Leave empty. Do not mention school, alternance, or schedule details.`,
    ``,
    `=== ${isSpontanee ? 'UNSOLICITED APPLICATION CONTRACT' : 'COVER LETTER CONTRACT'} ===`,
    isSpontanee ? spontaneeContract : coverLetterContract,
    ``,
    `=== ${personalisationRules} ===`,
    ``,
    `=== DEFAULT SOURCE CV JSON (${trackName}) ===`,
    cvJson,
    ``,
    `=== TARGET DETAILS (company description, job offer, or target context) ===`,
    targetDetails,
    ``,
    `=== PRIORITY INSTRUCTION (overrides all rules above if conflict) ===`,
    state.priority || 'None.'
  ].join('\n');
}
function toast(msg){const t=$('.toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
shell();
void hydrateJobyData();

