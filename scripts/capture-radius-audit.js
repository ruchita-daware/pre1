const { chromium } = require('@playwright/test');
const { SignJWT } = require('jose');
const path = require('path');
const fs = require('fs');

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'preone-dev-jwt-secret-2f8b7c9d4e6a1f3b5c8d0e'
);

async function run() {
  const auditDir = path.resolve('public', 'radius-audit');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  const token = await new SignJWT({
    uid: 'e177fbe1-248d-4839-bbd0-189cf97c5196',
    email: 'admin@preone.com',
    name: 'Admin User',
    tenantId: 'bfb4894b-98b8-4c4a-b826-4a5d020e3a79',
    role: 'OWNER',
    roles: ['OWNER'],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setIssuer('preone')
    .setExpirationTime('7d')
    .sign(SECRET);

  const browser = await chromium.launch({ headless: true });

  const capturePage = async (url, filename, options = {}) => {
    const width = options.width || 1440;
    const height = options.height || 900;
    const context = await browser.newContext({
      viewport: { width, height },
      colorScheme: options.colorScheme || 'light',
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
    if (options.darkMode) {
      await page.addInitScript(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });
    }
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    if (options.actions) {
      await options.actions(page);
      await page.waitForTimeout(400);
    }

    const dest = path.join(auditDir, filename);
    await page.screenshot({ path: dest });
    console.log(`Saved: ${filename}`);
    await context.close();
  };

  // 1. HR Staff Directory (Desktop Light)
  await capturePage('http://localhost:3000/app/hr?tab=staff', 'hr-staff-directory-desktop.png');

  // 2. HR Staff Directory (Desktop Dark)
  await capturePage('http://localhost:3000/app/hr?tab=staff', 'hr-staff-directory-dark.png', { darkMode: true });

  // 3. HR Staff Directory (Tablet 768px)
  await capturePage('http://localhost:3000/app/hr?tab=staff', 'hr-staff-directory-tablet.png', { width: 768, height: 1024 });

  // 4. HR Staff Directory (Mobile 390px)
  await capturePage('http://localhost:3000/app/hr?tab=staff', 'hr-staff-directory-mobile.png', { width: 390, height: 844 });

  // 5. Students Directory
  await capturePage('http://localhost:3000/app/students', 'students-desktop.png');

  // 6. Admissions
  await capturePage('http://localhost:3000/app/admissions', 'admissions-desktop.png');

  // 7. Finance
  await capturePage('http://localhost:3000/app/finance', 'finance-desktop.png');

  // 8. Inventory
  await capturePage('http://localhost:3000/app/inventory', 'inventory-desktop.png');

  // 9. Home Dashboard
  await capturePage('http://localhost:3000/app/home', 'home-desktop.png');

  await browser.close();
  console.log('All radius audit screenshots captured successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
