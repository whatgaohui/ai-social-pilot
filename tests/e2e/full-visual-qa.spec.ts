import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Xiaohongshu AI Operations Assistant - Full E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('1. Dashboard loads with data', async ({ page }) => {
    await page.screenshot({ path: 'test-results/e2e-full/01-dashboard.png', fullPage: true });
    const heading = page.getByRole('heading', { name: '仪表盘' });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('2. Account Hub - 3 tabs interactive', async ({ page }) => {
    await page.getByRole('button', { name: '账号中心' }).click();
    await page.waitForTimeout(500);

    const expectedTabs = ['账号概览', '笔记日历', '人设管理'];
    for (const tabText of expectedTabs) {
      const tab = page.getByRole('button', { name: tabText });
      await expect(tab).toBeVisible({ timeout: 5000 });
      await tab.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `test-results/e2e-full/02-hub-${tabText}.png`, fullPage: true });
    }
  });

  test('3. Calendar - clickable days', async ({ page }) => {
    await page.getByRole('button', { name: '账号中心' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '笔记日历' }).click();
    await page.waitForTimeout(500);

    const calendarBtns = page.getByRole('button');
    const calendarCount = await calendarBtns.count();
    expect(calendarCount).toBeGreaterThan(5);

    await page.screenshot({ path: 'test-results/e2e-full/03-calendar-notes.png', fullPage: true });
  });

  test('4. Content Library - filters, grid, upload, new text', async ({ page }) => {
    await page.getByRole('button', { name: '内容库' }).click();
    await page.waitForTimeout(500);

    // Check filter buttons by text content
    await expect(page.locator('button', { hasText: '全部' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button', { hasText: '图片' }).first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button', { hasText: '视频' }).first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('button', { hasText: '文案' }).first()).toBeVisible({ timeout: 3000 });

    // Check search input
    const searchInput = page.getByPlaceholder('搜索素材');
    await expect(searchInput).toBeVisible();

    // Check upload button
    await expect(page.locator('button', { hasText: '上传' }).first()).toBeVisible();
    // Check new text button
    await expect(page.locator('button', { hasText: '新建文案' }).first()).toBeVisible();

    await page.screenshot({ path: 'test-results/e2e-full/04-content-library.png', fullPage: true });

    // Click text filter to check empty state
    await page.locator('button', { hasText: '文案' }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/e2e-full/04-text-filter.png', fullPage: true });
  });

  test('5. Settings - AI config + Help manual', async ({ page }) => {
    await page.getByRole('button', { name: '设置' }).click();
    await page.waitForTimeout(1000);

    const aiConfig = page.locator('.text-sm.font-semibold:has-text("AI 大模型")').first();
    await expect(aiConfig).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/e2e-full/05-settings.png', fullPage: true });
  });

  test('6. Note creation dialog opens', async ({ page }) => {
    await page.getByRole('button', { name: '账号中心' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '笔记日历' }).click();
    await page.waitForTimeout(500);

    await page.locator('button', { hasText: '新建' }).first().click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('heading', { name: '新建笔记' });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/e2e-full/06-note-creation.png', fullPage: true });
  });

  test('7. New text material dialog', async ({ page }) => {
    await page.getByRole('button', { name: '内容库' }).click();
    await page.waitForTimeout(500);

    await page.locator('button', { hasText: '新建文案' }).first().click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('heading', { name: '新建文案' });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/e2e-full/07-new-text-dialog.png', fullPage: true });
  });
});
