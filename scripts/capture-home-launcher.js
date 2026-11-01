const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { SignJWT } = require('jose');

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'preone-dev-jwt-secret-2f8b7c9d4e6a1f3b5c8d0e'
);

async function signSession(payload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setIssuer('preone')
    .setExpirationTime('7d')
    .sign(SECRET);
}

async function run() {
  const screenshotsDir = path.resolve('public', 'launcher-audit');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const payload = {
    uid: 'e177fbe1-248d-4839-bbd0-189cf97c5196',
    email: 'admin@preone.com',
    name: 'Admin User',
    tenantId: 'bfb4894b-98b8-4c4a-b826-4a5d020e3a79',
    role: 'OWNER',
    roles: ['OWNER'],
  };

  const token = await signSession(payload);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 860 },
  });

  await context.addCookies([
    {
      name: 'preone_session',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();
  console.log('Navigating to http://localhost:3000/app/home...');
  await page.goto('http://localhost:3000/app/home', { waitUntil: 'networkidle' });

  await page.waitForSelector('.module-card');

  // Verify computed styles in resting state
  const cards = await page.$$eval('.module-card', (elements) => {
    return elements.map((el) => {
      const style = window.getComputedStyle(el);
      const titleEl = el.querySelector('.module-card-title');
      const titleStyle = titleEl ? window.getComputedStyle(titleEl) : null;
      return {
        module: el.getAttribute('data-module'),
        bg: style.backgroundColor,
        border: style.borderColor,
        titleColor: titleStyle ? titleStyle.color : null,
        transform: style.transform,
      };
    });
  });

  console.log('\n--- RESTING MODULE CARD COMPUTED STYLES ---');
  for (const c of cards) {
    console.log(`[${c.module}] bg: ${c.bg} | border: ${c.border} | title: ${c.titleColor}`);
  }

  // 1. Capture Full Home Launcher resting state
  const restingPath = path.join(screenshotsDir, '01_home_launcher_resting_state.png');
  await page.screenshot({ path: restingPath, fullPage: false });
  console.log(`\nSaved resting state screenshot: ${restingPath}`);

  // Helper for hover inspection and capture
  async function inspectAndCaptureHover(moduleKey, filename) {
    const selector = `.module-card[data-module="${moduleKey}"]`;
    const cardEl = await page.$(selector);
    if (!cardEl) {
      console.warn(`Could not find card for module: ${moduleKey}`);
      return;
    }

    // Scroll into view if needed and hover
    await cardEl.scrollIntoViewIfNeeded();
    await cardEl.hover({ force: true });
    await page.waitForTimeout(300); // Wait for transition

    const hoverStyle = await page.$eval(selector, (el) => {
      const style = window.getComputedStyle(el);
      const titleEl = el.querySelector('.module-card-title');
      const titleStyle = titleEl ? window.getComputedStyle(titleEl) : null;
      return {
        bg: style.backgroundColor,
        border: style.borderColor,
        titleColor: titleStyle ? titleStyle.color : null,
        transform: style.transform,
        boxShadow: style.boxShadow,
      };
    });

    console.log(`\n[HOVER on ${moduleKey}]`);
    console.log(`  bg: ${hoverStyle.bg}`);
    console.log(`  border: ${hoverStyle.border}`);
    console.log(`  titleColor: ${hoverStyle.titleColor}`);
    console.log(`  transform: ${hoverStyle.transform}`);

    const filePath = path.join(screenshotsDir, filename);
    await page.screenshot({ path: filePath });
    console.log(`  Saved screenshot: ${filePath}`);

    // Unhover
    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
  }

  // 2. Hover states on required modules
  await inspectAndCaptureHover('dashboard', '02_hover_dashboard.png');
  await inspectAndCaptureHover('admissions', '03_hover_admissions.png');
  await inspectAndCaptureHover('finance', '04_hover_fees_finance.png');
  await inspectAndCaptureHover('setup', '05_hover_setup.png');

  await browser.close();
  console.log('\nAll visual verifications and screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error during run:', err);
  process.exit(1);
});
