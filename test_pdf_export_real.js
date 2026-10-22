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

async function testPdfReal() {
  const executablePath = getBrowserExecutable();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3016', { waitUntil: 'networkidle0' });

  // Get raw outerHTML of .cv-paper
  const html = await page.evaluate(() => {
    const paper = document.querySelector('.cv-paper');
    return paper.outerHTML;
  });

  // Call the server /api/export-pdf
  const res = await fetch('http://localhost:3016/api/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, css: '' })
  });

  const pdfBuf = await res.arrayBuffer();
  fs.writeFileSync('C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/real_export_result.pdf', Buffer.from(pdfBuf));
  console.log('Exported real_export_result.pdf, size:', pdfBuf.byteLength);

  // Read page count from PDF buffer
  const pdfText = Buffer.from(pdfBuf).toString('latin1');
  const countMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  console.log('PDF Page count:', countMatches ? countMatches.length : 'unknown');

  await browser.close();
}

testPdfReal().catch(console.error);
