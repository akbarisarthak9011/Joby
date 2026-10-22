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

async function testExact() {
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
    const paper = document.querySelector('.cv-paper:not(.cover-letter-page)');
    return paper.outerHTML;
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link rel="stylesheet" href="http://localhost:3016/assets/index-CAodb0bM.css">
      <style>
        @page { size: A4; margin: 0; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          width: 210mm !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box !important;
        }
        .cv-paper {
          width: 210mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          box-sizing: border-box !important;
          padding: var(--cv-margin, 8mm) !important;
          font-size: var(--cv-font, 11.8px) !important;
          line-height: var(--cv-line, 1.28) !important;
          box-shadow: none !important;
          overflow: hidden !important;
        }
        .cv-paper .cv-section {
          margin-top: var(--section-gap, 8px) !important;
        }
        .cv-paper .cv-item {
          margin-bottom: var(--item-gap, 5px) !important;
        }
        .cv-paper .cv-header {
          padding-bottom: var(--header-gap, 10px) !important;
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `;

  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

  // Auto-fit check:
  const finalMetrics = await page.evaluate(() => {
    const paper = document.querySelector('.cv-paper');
    paper.style.maxHeight = 'none';
    paper.style.overflow = 'visible';

    const A4_HEIGHT = 1122.5;
    let font = 12.0;
    let margin = 8;
    let line = 1.28;
    let sectionGap = 8;
    let itemGap = 5;

    paper.style.setProperty('--cv-font', `${font}px`);
    paper.style.setProperty('--cv-margin', `${margin}mm`);
    paper.style.setProperty('--cv-line', `${line}`);
    paper.style.setProperty('--section-gap', `${sectionGap}px`);
    paper.style.setProperty('--item-gap', `${itemGap}px`);

    while (paper.scrollHeight > A4_HEIGHT && font > 9.5) {
      font -= 0.15;
      paper.style.setProperty('--cv-font', `${font.toFixed(2)}px`);
    }

    return {
      scrollHeight: paper.scrollHeight,
      font: font.toFixed(2),
      margin,
      A4_HEIGHT
    };
  });

  console.log('Final Metrics before PDF:', finalMetrics);

  const pdfBuf = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });

  fs.writeFileSync('C:/Users/mfsen/.gemini/antigravity/brain/dcb4165d-26b0-42e7-bf0d-079ce461e57d/exact_one_page.pdf', pdfBuf);

  // Take screenshot
  const screenshot = await page.screenshot({ fullPage: true });
  fs.writeFileSync('C:/Users/mfsen/.gemini/antigravity/brain/dcb4165d-26b0-42e7-bf0d-079ce461e57d/exact_one_page_screenshot.png', screenshot);

  const pdfText = Buffer.from(pdfBuf).toString('latin1');
  const countMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  console.log('PDF Page count:', countMatches ? countMatches.length : 'unknown');

  await browser.close();
}

testExact().catch(console.error);
