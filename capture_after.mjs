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

async function capture() {
  const executablePath = getBrowserExecutable();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950, deviceScaleFactor: 1.5 });
  await page.goto('http://localhost:3016', { waitUntil: 'networkidle0' });

  // 1. Capture Studio & CV Paper
  await page.screenshot({ path: 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/after_studio.png', fullPage: false });
  await page.screenshot({ path: 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/fullpage_check.png', fullPage: true });
  console.log('Saved after_studio.png and fullpage_check.png');

  const paperEl = await page.$('.cv-paper');
  if (paperEl) {
    await paperEl.screenshot({ path: 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/paper_check.png' });
    console.log('Saved paper_check.png');
  }

  const debug = await page.evaluate(() => {
    const paper = document.querySelector('.cv-paper');
    const cs = paper ? window.getComputedStyle(paper) : null;
    return {
      template: paper ? paper.className : 'none',
      borderTop: cs ? cs.borderTop : 'none',
      borderBottom: cs ? cs.borderBottom : 'none',
      boxShadow: cs ? cs.boxShadow : 'none',
      height: paper ? paper.offsetHeight : 0,
      scrollHeight: paper ? paper.scrollHeight : 0
    };
  });
  console.log('CV PAPER DEBUG:', JSON.stringify(debug, null, 2));

  // 2. Export PDF and capture visual preview
  const paperHtml = await page.evaluate(() => {
    const p = document.querySelector('.cv-paper');
    return p ? p.outerHTML : '';
  });

  const res = await fetch('http://localhost:3016/api/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: paperHtml, css: '' })
  });
  const pdfBuf = await res.arrayBuffer();
  const pdfPath = 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/real_export_result.pdf';
  fs.writeFileSync(pdfPath, Buffer.from(pdfBuf));
  console.log('Saved real_export_result.pdf, size:', pdfBuf.byteLength);

  // 3. Render PDF in Chromium to verify visual output
  try {
    const pdfViewerPage = await browser.newPage();
    await pdfViewerPage.setViewport({ width: 1200, height: 1600 });
    await pdfViewerPage.goto('file:///' + pdfPath.replace(/\\/g, '/'), { waitUntil: 'load', timeout: 6000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));
    await pdfViewerPage.screenshot({
      path: 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/pdf_preview.png'
    });
    console.log('Saved pdf_preview.png');
    await pdfViewerPage.close();
  } catch (err) {
    console.warn('PDF viewer screenshot failed:', err.message);
  }

  // 4. Capture @media print view of the page
  await page.emulateMediaType('print');
  await page.screenshot({
    path: 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/cv_print_check_preview.png',
    fullPage: true
  });
  console.log('Saved cv_print_check_preview.png');
  await page.emulateMediaType('screen');

  // 5. Switch to Tracker view
  const trackerBtn = await page.$('[data-view-btn="tracker"]');
  if (trackerBtn) {
    await trackerBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/after_tracker.png', fullPage: false });
    console.log('Saved after_tracker.png');

    // 6. Open kit on first application if exists
    const kitBtn = await page.$('[data-action="open-kit"]');
    if (kitBtn) {
      await kitBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/after_kit_modal.png', fullPage: false });
      console.log('Saved after_kit_modal.png');
    }
  }

  await browser.close();
}

capture().catch(console.error);
