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

async function capture() {
  const artifactDir = path.resolve(
    'C:/Users/Nuke/.gemini/antigravity/brain/e0b57167-0833-46e3-bc14-63145ff2eaaf'
  );
  const publicDir = path.resolve('public', 'launcher-audit');

  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
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

  const viewports = [
    { name: 'classic-premium-home-desktop-1440', width: 1440, height: 900, deviceScaleFactor: 2 },
    { name: 'classic-premium-home-tablet-768', width: 768, height: 1024, deviceScaleFactor: 2 },
    { name: 'classic-premium-home-mobile-390', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  ];

  for (const vp of viewports) {
    console.log(`\nCapturing viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor || 1,
      isMobile: vp.isMobile || false,
      hasTouch: vp.hasTouch || false,
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
    await page.goto('http://localhost:3000/app/home', { waitUntil: 'networkidle' });
    await page.waitForSelector('.module-card');
    await page.waitForTimeout(600); // Wait for animations to settle

    const filename = `${vp.name}.png`;
    const artifactPath = path.join(artifactDir, filename);
    const publicPath = path.join(publicDir, filename);

    await page.screenshot({ path: artifactPath, fullPage: false });
    fs.copyFileSync(artifactPath, publicPath);
    console.log(`Saved screenshot to: ${artifactPath}`);

    // If desktop, capture card close-ups and hover states
    if (vp.width === 1440) {
      // 1. Grid of all 15 module cards
      const gridElem = await page.$('.module-grid');
      if (gridElem) {
        const gridArtifactPath = path.join(artifactDir, 'module-grid-15-cards.png');
        await gridElem.screenshot({ path: gridArtifactPath });
        fs.copyFileSync(gridArtifactPath, path.join(publicDir, 'module-grid-15-cards.png'));
        console.log(`Saved grid screenshot to: ${gridArtifactPath}`);
      }

      // 2. Individual card close-ups: Dashboard, Setup, Admissions, Learning
      const cardsToCapture = [
        { key: 'dashboard', name: 'card-closeup-dashboard.png' },
        { key: 'setup', name: 'card-closeup-setup.png' },
        { key: 'admissions', name: 'card-closeup-admissions.png' },
        { key: 'learning', name: 'card-closeup-learning.png' },
      ];

      for (const item of cardsToCapture) {
        const cardElem = await page.$(`.module-card[data-module="${item.key}"]`);
        if (cardElem) {
          const cardPath = path.join(artifactDir, item.name);
          await cardElem.screenshot({ path: cardPath });
          fs.copyFileSync(cardPath, path.join(publicDir, item.name));
          console.log(`Saved card closeup to: ${cardPath}`);
        }
      }

      // 3. Hover state on admissions module showing full-width expanded accent line
      const admissionsCard = await page.$('.module-card[data-module="admissions"]');
      if (admissionsCard) {
        await admissionsCard.hover({ force: true });
        await page.waitForTimeout(300);
        const hoverArtifactPath = path.join(artifactDir, 'classic-premium-home-hover-admissions.png');
        await page.screenshot({ path: hoverArtifactPath });
        fs.copyFileSync(hoverArtifactPath, path.join(publicDir, 'classic-premium-home-hover-admissions.png'));
        console.log(`Saved hover screenshot to: ${hoverArtifactPath}`);

        // Also capture close-up of hovered admissions card with full-width accent line
        const hoveredCardPath = path.join(artifactDir, 'card-closeup-admissions-hover.png');
        await admissionsCard.screenshot({ path: hoveredCardPath });
        fs.copyFileSync(hoveredCardPath, path.join(publicDir, 'card-closeup-admissions-hover.png'));
        console.log(`Saved hovered card closeup to: ${hoveredCardPath}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
