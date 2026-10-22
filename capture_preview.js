import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

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
  await page.setViewport({ width: 1400, height: 1800, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3016', { waitUntil: 'networkidle0' });

  // Take full screenshot of CV Studio
  await page.screenshot({ path: 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/before_studio.png', fullPage: false });
  console.log('Saved before_studio.png');

  // Switch to Tracker view and capture
  const trackerBtn = await page.$('[data-view-btn="tracker"]');
  if (trackerBtn) {
    await trackerBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/before_tracker.png', fullPage: false });
    console.log('Saved before_tracker.png');
  }

  await browser.close();
}

capture().catch(console.error);
