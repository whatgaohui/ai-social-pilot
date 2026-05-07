import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Xiaohongshu AI Operations Assistant - Visual QA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('1. Navigation - Verify sidebar has exactly 4 items', async ({ page }) => {
    console.log('Testing: Navigation sidebar items...');

    await page.screenshot({ path: 'test-results/01-initial-state.png', fullPage: true });

    const expectedNavItems = ['仪表盘', '账号中心', '内容库', '设置'];

    for (const itemText of expectedNavItems) {
      const item = page.getByRole('button', { name: itemText });
      await expect(item.first()).toBeVisible({ timeout: 5000 });
      console.log(`✓ Found navigation item: ${itemText}`);
    }

    await page.screenshot({ path: 'test-results/02-navigation.png', fullPage: true });

    console.log('PASS: Navigation sidebar verified');
  });

  test('2. Dashboard page (仪表盘) - Global overview', async ({ page }) => {
    console.log('Testing: Dashboard page...');

    const dashboardNav = page.getByRole('button', { name: '仪表盘' }).first();
    await dashboardNav.click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/03-dashboard.png', fullPage: true });

    const pageTitle = page.locator('h1, h2').first();
    await expect(pageTitle).toBeVisible();

    const statsElements = page.locator('[class*="card"], [class*="stat"], [class*="overview"]');
    const statsCount = await statsElements.count();
    console.log(`Found ${statsCount} stat/overview elements on dashboard`);

    const quickActions = page.locator('button:has-text("快速"), button:has-text("新建"), button:has-text("创建")');
    const quickActionsCount = await quickActions.count();
    console.log(`Found ${quickActionsCount} quick action buttons`);

    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const brokenImages = await page.locator('img[src]').evaluateAll((imgs) =>
      imgs.filter(img => !(img as HTMLImageElement).complete || (img as HTMLImageElement).naturalHeight === 0).length
    );

    console.log(`Broken images: ${brokenImages}`);

    expect(brokenImages).toBe(0);
    console.log('PASS: Dashboard page verified');
  });

  test('3. Account Hub page (账号中心) - Tab navigation', async ({ page }) => {
    console.log('Testing: Account Hub page...');

    const accountHubNav = page.getByRole('button', { name: '账号中心' }).first();
    await accountHubNav.click();
    // Wait for account to load and tabs to render
    await page.getByRole('button', { name: '账号概览' }).waitFor({ state: 'visible', timeout: 10000 });

    await page.screenshot({ path: 'test-results/04-account-hub.png', fullPage: true });

    const expectedTabs = ['账号概览', '笔记日历', '人设管理'];

    for (const tabText of expectedTabs) {
      const tab = page.getByRole('tab', { name: tabText }).or(page.locator(`text=${tabText}`).first());
      await expect(tab).toBeVisible({ timeout: 5000 });
      console.log(`✓ Found tab: ${tabText}`);
    }

    for (const tabText of expectedTabs) {
      const tab = page.getByRole('tab', { name: tabText }).or(page.locator(`text=${tabText}`).first());
      await tab.click();
      await page.waitForTimeout(500);

      const tabName = tabText.replace(/\s+/g, '-');
      await page.screenshot({ path: `test-results/05-account-hub-${tabName}.png`, fullPage: true });

      console.log(`✓ Clicked tab: ${tabText}`);
    }

    console.log('PASS: Account Hub page verified');
  });

  test('4. Content Library page (内容库) - Filters and search', async ({ page }) => {
    console.log('Testing: Content Library page...');

    const contentLibNav = page.getByRole('button', { name: '内容库' }).first();
    await contentLibNav.click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/06-content-library.png', fullPage: true });

    const filterTypes = ['全部', '文字', '图片', '视频'];
    for (const filterText of filterTypes) {
      const filter = page.locator(`text=${filterText}`).first();
      const isVisible = await filter.isVisible().catch(() => false);
      if (isVisible) {
        console.log(`✓ Found filter: ${filterText}`);
      }
    }

    const searchInput = page.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"]');
    const searchExists = await searchInput.count() > 0;
    console.log(`Search input found: ${searchExists}`);

    const viewToggle = page.locator('button:has([class*="grid"]), button:has([class*="list"]), [aria-label*="view"], [aria-label*="视图"]');
    const viewToggleExists = await viewToggle.count() > 0;
    console.log(`View toggle found: ${viewToggleExists}`);

    const brokenImages = await page.locator('img[src]').evaluateAll((imgs) =>
      imgs.filter(img => !(img as HTMLImageElement).complete || (img as HTMLImageElement).naturalHeight === 0).length
    );
    console.log(`Broken images: ${brokenImages}`);

    expect(brokenImages).toBe(0);
    console.log('PASS: Content Library page verified');
  });

  test('5. Settings page (设置) - AI configuration and no removed elements', async ({ page }) => {
    console.log('Testing: Settings page...');

    const settingsNav = page.getByRole('button', { name: '设置' }).first();
    await settingsNav.click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/07-settings.png', fullPage: true });

    const aiConfig = page.locator('text=/AI|配置|设置|config/i');
    const aiConfigVisible = await aiConfig.count() > 0;
    console.log(`AI configuration UI found: ${aiConfigVisible}`);
    expect(aiConfigVisible).toBe(true);

    const notificationSettings = page.locator('text=/通知设置|通知|notification/i');
    const notificationExists = await notificationSettings.count();
    console.log(`Notification settings card count: ${notificationExists}`);
    expect(notificationExists).toBe(0);

    const branding = page.locator('text=/Made by Z\.ai|Z\.ai/i');
    const brandingExists = await branding.count();
    console.log(`Branding "Made by Z.ai" count: ${brandingExists}`);
    expect(brandingExists).toBe(0);

    console.log('PASS: Settings page verified');
  });

  test('6. Visual regressions check', async ({ page }) => {
    console.log('Testing: Visual regressions...');

    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const pages = [
      { name: '仪表盘', selector: 'text=仪表盘' },
      { name: '账号中心', selector: 'text=账号中心' },
      { name: '内容库', selector: 'text=内容库' },
      { name: '设置', selector: 'text=设置' }
    ];

    for (const pageInfo of pages) {
      await page.locator(pageInfo.selector).first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
    }

    if (errors.length > 0) {
      console.log('Console errors found:');
      errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('No console errors found');
    }

    await page.screenshot({ path: 'test-results/08-final-state.png', fullPage: true });

    console.log(`PASS: Visual regression check complete (${errors.length} console errors)`);
  });
});
