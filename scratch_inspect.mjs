import puppeteer from 'puppeteer';
import os from 'os';
import path from 'path';
import fs from 'fs';
(async () => {
  const tmpDir = path.join(os.tmpdir(), 'puppeteer_inspect_' + Date.now());
  const browser = await puppeteer.launch({ headless: 'new', userDataDir: tmpDir, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1600 });
  await page.goto('http://localhost:3016', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/fullpage_check.png', fullPage: true });
  const paperEl = await page.;
  if (paperEl) await paperEl.screenshot({ path: 'C:/Users/mfsen/.gemini/antigravity/brain/bcbbe55c-baaa-41ba-8e70-961e8138d994/paper_check.png' });
  await browser.close();
  console.log('Screenshots taken successfully');
})();