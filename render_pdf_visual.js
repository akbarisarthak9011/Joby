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

async function renderPdfVisual() {
  const executablePath = getBrowserExecutable();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set A4 viewport at 96 DPI: 210mm = 794px, 297mm = 1123px
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3016', { waitUntil: 'networkidle0' });

  // 1. Take preview screenshot of the live app paper
  const paper = await page.$('.cv-paper');
  if (paper) {
    const previewBuffer = await paper.screenshot();
    fs.writeFileSync('C:/Users/mfsen/.gemini/antigravity/brain/dcb4165d-26b0-42e7-bf0d-079ce461e57d/cv_preview_current.png', previewBuffer);
    console.log('Saved cv_preview_current.png');
  }

  // 2. Extract HTML and call /api/export-pdf
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
  fs.writeFileSync('C:/Users/mfsen/.gemini/antigravity/brain/dcb4165d-26b0-42e7-bf0d-079ce461e57d/exported_test.pdf', Buffer.from(pdfBuf));
  console.log('Exported CV PDF byte length:', pdfBuf.byteLength);

  const pdfText = Buffer.from(pdfBuf).toString('latin1');
  const countMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  console.log('CV PDF Page count:', countMatches ? countMatches.length : 'unknown');

  // 3. Test Cover letter page
  await page.evaluate(() => {
    const cb = document.querySelector('#cover-letter');
    if (cb && !cb.checked) {
      cb.click();
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const letterPaper = await page.$('.cover-letter-page');
  if (letterPaper) {
    const letterBuffer = await letterPaper.screenshot();
    fs.writeFileSync('C:/Users/mfsen/.gemini/antigravity/brain/dcb4165d-26b0-42e7-bf0d-079ce461e57d/cover_letter_preview.png', letterBuffer);
    console.log('Saved cover_letter_preview.png');

    const letterHtml = await page.evaluate(() => {
      const p = document.querySelector('.cover-letter-page');
      return p ? p.outerHTML : '';
    });

    const letterRes = await fetch('http://localhost:3016/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: letterHtml, css: '', coverLetter: true })
    });
    const letterPdfBuf = await letterRes.arrayBuffer();
    const letterPdfText = Buffer.from(letterPdfBuf).toString('latin1');
    const letterMatches = letterPdfText.match(/\/Type\s*\/Page\b/g);
    console.log('Cover Letter PDF Page count:', letterMatches ? letterMatches.length : 'unknown');
  }

  // 4. Emulate print media and take full print screenshot
  await page.emulateMediaType('print');
  const printBuffer = await page.screenshot({ fullPage: true });
  fs.writeFileSync('C:/Users/mfsen/.gemini/antigravity/brain/dcb4165d-26b0-42e7-bf0d-079ce461e57d/print_page_full.png', printBuffer);
  console.log('Saved print_page_full.png');

  await browser.close();
}

renderPdfVisual().catch(console.error);
