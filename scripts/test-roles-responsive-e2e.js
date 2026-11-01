const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
  { name: 'small-mobile-320', width: 320, height: 667, type: 'mobile' },
  { name: 'mobile-360', width: 360, height: 740, type: 'mobile' },
  { name: 'mobile-375', width: 375, height: 667, type: 'mobile' },
  { name: 'mobile-390', width: 390, height: 844, type: 'mobile' },
  { name: 'mobile-414', width: 414, height: 896, type: 'mobile' },
  { name: 'large-mobile-430', width: 430, height: 932, type: 'mobile' },
  { name: 'tablet-portrait-768', width: 768, height: 1024, type: 'tablet' },
  { name: 'tablet-820', width: 820, height: 1180, type: 'tablet' },
  { name: 'tablet-landscape-1024', width: 1024, height: 768, type: 'tablet' },
  { name: 'laptop-1280', width: 1280, height: 800, type: 'desktop' },
  { name: 'desktop-1440', width: 1440, height: 900, type: 'desktop' },
  { name: 'large-desktop-1920', width: 1920, height: 1080, type: 'desktop' },
];

async function runAudit() {
  const screenshotDir = path.join(process.cwd(), 'docs', 'screenshots', 'roles');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('====================================================');
  console.log('🧪 PRE1-RESPONSIVE-ROLES-001 E2E VIEWPORT AUDIT');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // 1. Authenticate as Owner via API (Step 1 + Step 2 MFA with 0000)
  console.log('▶ Logging in as Owner via API...');
  const step1Res = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'owner@sunshine.demo', password: '0000' }),
  });
  const step1 = await step1Res.json();
  if (!step1.success) {
    throw new Error('Step 1 login failed: ' + JSON.stringify(step1));
  }

  const step2Res = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfaToken: step1.data.mfaToken, otp: '0000' }),
  });
  const step2 = await step2Res.json();
  console.log('  Login successful:', step2.success, step2.data?.user?.email, step2.data?.user?.role);

  const rawSetCookies = step2Res.headers.getSetCookie ? step2Res.headers.getSetCookie() : [step2Res.headers.get('set-cookie')].filter(Boolean);
  const cookiesToAdd = [];
  for (const raw of rawSetCookies) {
    const parts = raw.split(';');
    const [name, ...valParts] = parts[0].split('=');
    if (name) {
      cookiesToAdd.push({
        name: name.trim(),
        value: valParts.join('=').trim(),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      });
    }
  }
  await context.addCookies(cookiesToAdd);
  console.log(`  Added ${cookiesToAdd.length} cookie(s) to browser context.`);

  // 2. Navigate to /app/setup/roles
  console.log('▶ Navigating to /app/setup/roles...');
  await page.goto('http://localhost:3000/app/setup/roles', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n▶ Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) [${vp.type}]`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(1000);

    // Measure horizontal overflow
    const overflowMetrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
      const clientWidth = doc.clientWidth;
      const hasHorizontalOverflow = scrollWidth > clientWidth;

      // Check card and table elements
      const summaryCards = document.querySelectorAll('.roles-summary-card');
      const desktopTable = document.querySelector('.roles-table-desktop');
      const mobileCards = document.querySelectorAll('.roles-staff-card');
      const tabStrip = document.querySelector('.roles-tab-strip');
      const toolbar = document.querySelector('.roles-toolbar');
      const bottomNav = document.querySelector('.preone-dock, .taskbar');
      const buddy = document.querySelector('.preone-buddy-live');

      return {
        scrollWidth,
        clientWidth,
        hasHorizontalOverflow,
        summaryCardCount: summaryCards.length,
        desktopTableVisible: desktopTable ? window.getComputedStyle(desktopTable).display !== 'none' : false,
        mobileCardCount: mobileCards.length,
        hasTabStrip: Boolean(tabStrip),
        hasToolbar: Boolean(toolbar),
        hasBottomNav: Boolean(bottomNav),
        hasBuddy: Boolean(buddy),
      };
    });

    console.log(`  - Horizontal Overflow: ${overflowMetrics.hasHorizontalOverflow ? '❌ YES (' + (overflowMetrics.scrollWidth - overflowMetrics.clientWidth) + 'px)' : '✅ NO (Perfect)'}`);
    console.log(`  - Summary Cards: ${overflowMetrics.summaryCardCount} loaded`);
    console.log(`  - Display Mode: ${overflowMetrics.desktopTableVisible ? 'Desktop Table View' : 'Mobile Card List (' + overflowMetrics.mobileCardCount + ' cards)'}`);
    console.log(`  - Bottom Nav Active: ${overflowMetrics.hasBottomNav ? '✅' : '❌'}`);
    console.log(`  - PreO Mascot Active: ${overflowMetrics.hasBuddy ? '✅' : '❌'}`);

    // Take screenshot
    const screenshotPath = path.join(screenshotDir, `${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  - Captured: ${screenshotPath}`);

    results.push({
      ...vp,
      ...overflowMetrics,
      passed: !overflowMetrics.hasHorizontalOverflow && overflowMetrics.summaryCardCount === 4,
    });
  }

  // 3. Test Interactive Functional Scenarios (View, Roles Modal, Transfer Modal, Tab Switching)
  console.log('\n====================================================');
  console.log('🧪 TESTING INTERACTIVE CONTROLS & RBAC');
  console.log('====================================================\n');

  // Test Tab Switching
  console.log('▶ Testing Tab Switching...');
  for (const [tabKey, tabLabel, expectedContent] of [
    ['roles', 'Roles & Templates', 'PreOne System Roles'],
    ['permissions', 'Module Permissions', 'PreOne Capability & Module Catalog'],
    ['branches', 'Branch Assignments', 'Staff Campus Allocation Matrix'],
    ['history', 'Access History', 'Security & Role Modification Audit Log'],
  ]) {
    const tabBtn = page.locator('.roles-tab-item').filter({ hasText: tabLabel });
    await tabBtn.click();
    await page.waitForTimeout(600);
    const isActive = await tabBtn.evaluate(el => el.classList.contains('active'));
    const contentVisible = await page.locator(`text=${expectedContent}`).isVisible();
    console.log(`  - ${tabLabel} Tab: ${isActive && contentVisible ? '✅ PASS' : '❌ FAIL'}`);
  }

  // Switch back to Staff Directory
  const staffTabBtn = page.locator('.roles-tab-item').filter({ hasText: 'Staff Directory' });
  await staffTabBtn.click();
  await page.waitForTimeout(600);

  // Test Search Filter
  console.log('\n▶ Testing Staff Search Filter...');
  const searchInput = page.locator('.roles-toolbar-search input');
  await searchInput.fill('Rajesh');
  await page.waitForTimeout(500);
  const filteredCount = await page.evaluate(() => {
    return document.querySelectorAll('tbody tr').length;
  });
  console.log(`  - Search for "Rajesh" filtered table results to: ${filteredCount} staff member(s)`);

  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(500);

  // Test Modal Opening
  console.log('\n▶ Testing Modals...');
  // 1. Open Create Custom Role Modal
  const createRoleBtn = page.locator('button:has-text("Create Custom Role")');
  await createRoleBtn.click();
  await page.waitForTimeout(600);
  const customRoleModalOpen = await page.locator('text=Create Custom Role Template').isVisible();
  console.log(`  - Create Custom Role Modal: ${customRoleModalOpen ? '✅ PASS' : '❌ FAIL'}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 2. Open Edit Roles Modal on first staff member
  const rolesBtn = page.locator('button[title="Edit Roles & Permissions"]').first();
  if (await rolesBtn.isVisible()) {
    await rolesBtn.click();
    await page.waitForTimeout(600);
    const editRolesModalOpen = await page.locator('text=Edit Roles & Permissions').isVisible();
    console.log(`  - Edit Roles Modal: ${editRolesModalOpen ? '✅ PASS' : '❌ FAIL'}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 3. Open Transfer Modal
  const transferBtn = page.locator('button[title="Branch Transfer / Assignment"]').first();
  if (await transferBtn.isVisible()) {
    await transferBtn.click();
    await page.waitForTimeout(600);
    const transferModalOpen = await page.locator('text=Branch Management').isVisible();
    console.log(`  - Branch Transfer Modal: ${transferModalOpen ? '✅ PASS' : '❌ FAIL'}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 4. Open View Details Modal
  const viewBtn = page.locator('button[title="View Access Details"]').first();
  if (await viewBtn.isVisible()) {
    await viewBtn.click();
    await page.waitForTimeout(600);
    const viewModalOpen = await page.locator('text=Account Status').isVisible();
    console.log(`  - View Staff Details Modal: ${viewModalOpen ? '✅ PASS' : '❌ FAIL'}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  await browser.close();

  console.log('\n====================================================');
  console.log('🏁 AUDIT SUMMARY:');
  const allPassed = results.every(r => r.passed);
  console.log(`Total Viewports Tested: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.passed).length}`);
  console.log(`Failed: ${results.filter(r => !r.passed).length}`);
  console.log(`Overall Result: ${allPassed ? '✅ 100% PASS' : '❌ FAILURES DETECTED'}`);
  console.log('====================================================');

  fs.writeFileSync(
    path.join(process.cwd(), 'docs', 'audits', 'roles_viewport_results.json'),
    JSON.stringify(results, null, 2)
  );
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
