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

async function capture(phase = 'before') {
  const artifactDir = path.resolve('C:/Users/Nuke/.gemini/antigravity/brain/e0b57167-0833-46e3-bc14-63145ff2eaaf');
  const browser = await chromium.launch({ headless: true });

  const adminToken = await signSession({
    uid: 'e177fbe1-248d-4839-bbd0-189cf97c5196',
    email: 'admin@preone.com',
    name: 'Admin User',
    tenantId: 'bfb4894b-98b8-4c4a-b826-4a5d020e3a79',
    role: 'OWNER',
    roles: ['OWNER'],
  });

  // Light Mode
  const contextLight = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
  });
  await contextLight.addCookies([
    {
      name: 'preone_session',
      value: adminToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const pageLight = await contextLight.newPage();
  await pageLight.goto('http://localhost:3000/app/finance', { waitUntil: 'networkidle' });
  await pageLight.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await pageLight.waitForTimeout(1000);
  const lightPath = path.join(artifactDir, `finance-light-${phase}.png`);
  await pageLight.screenshot({ path: lightPath, fullPage: false });
  console.log(`Saved Light screenshot: ${lightPath}`);
  await contextLight.close();

  // Dark Mode
  const contextDark = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  await contextDark.addCookies([
    {
      name: 'preone_session',
      value: adminToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const pageDark = await contextDark.newPage();
  await pageDark.goto('http://localhost:3000/app/finance', { waitUntil: 'networkidle' });
  await pageDark.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await pageDark.waitForTimeout(1000);
  const darkPath = path.join(artifactDir, `finance-dark-${phase}.png`);
  await pageDark.screenshot({ path: darkPath, fullPage: false });
  console.log(`Saved Dark screenshot: ${darkPath}`);
  await contextDark.close();

  await browser.close();
}

const phase = process.argv[2] || 'before';
capture(phase).catch(err => {
  console.error(err);
  process.exit(1);
});
