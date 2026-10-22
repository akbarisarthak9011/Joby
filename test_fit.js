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

async function testFit() {
  const executablePath = getBrowserExecutable();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set A4 viewport
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3016', { waitUntil: 'networkidle0' });

  // Apply clean 1-page typography & spacing directly on .cv-paper
  const fitResult = await page.evaluate(() => {
    const paper = document.querySelector('.cv-paper');
    
    // Remove any overflow:hidden or max-height clamping
    paper.style.maxHeight = 'none';
    paper.style.overflow = 'visible';

    // Target A4 printable height (1122.5px total - top/bottom margins)
    const TARGET_HEIGHT = 1110;
    
    let font = 12.5;
    let margin = 8;
    let line = 1.28;
    let sectionGap = 8;
    let itemGap = 5;

    paper.style.setProperty('--cv-font', `${font}px`);
    paper.style.setProperty('--cv-margin', `${margin}mm`);
    paper.style.setProperty('--cv-line', `${line}`);
    paper.style.setProperty('--section-gap', `${sectionGap}px`);
    paper.style.setProperty('--item-gap', `${itemGap}px`);

    // Measure
    while (paper.scrollHeight > TARGET_HEIGHT && font > 10.5) {
      font -= 0.2;
      paper.style.setProperty('--cv-font', `${font}px`);
    }

    return {
      font,
      margin,
      line,
      scrollHeight: paper.scrollHeight,
      target: TARGET_HEIGHT
    };
  });

  console.log('Fitted parameters:', fitResult);

  // Take screenshot of the fitted paper
  const paper = await page.$('.cv-paper');
  const screenshotBuffer = await paper.screenshot();
  fs.writeFileSync('C:/Users/mfsen/.gemini/antigravity/brain/dcb4165d-26b0-42e7-bf0d-079ce461e57d/cv_fitted_test.png', screenshotBuffer);
  console.log('Saved cv_fitted_test.png');

  await browser.close();
}

testFit().catch(console.error);
