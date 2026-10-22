import puppeteer from 'puppeteer';
import fs from 'fs';

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
        if (p && fs.existsSync(p)) return p;
    }
    return undefined;
}

async function testEn() {
  const executablePath = getBrowserExecutable();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3016', { waitUntil: 'networkidle0' });

  // Switch to English default CV
  await page.click('#default-en');
  await new Promise(r => setTimeout(r, 500));

  const paperHtml = await page.evaluate(() => {
    const p = document.querySelector('.cv-paper:not(.cover-letter-page)');
    return p.outerHTML;
  });

  const res = await fetch('http://localhost:3016/api/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: paperHtml, css: '', coverLetter: false })
  });

  const pdfBuf = await res.arrayBuffer();
  const pdfText = Buffer.from(pdfBuf).toString('latin1');
  const countMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  console.log('English CV PDF Page count:', countMatches ? countMatches.length : 'unknown');

  await browser.close();
}

testEn().catch(console.error);
