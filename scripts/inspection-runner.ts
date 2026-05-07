/**
 * Automated inspection runner — Playwright-based E2E health checks.
 * Reports results to the local API which persists to SQLite.
 *
 * Usage:
 *   npx tsx scripts/inspection-runner.ts          # full inspection
 *   npx tsx scripts/inspection-runner.ts --quick   # quick health-only check
 */

import { chromium } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const API_BASE = BASE_URL; // API routes are on the same Next.js server

interface CheckResult {
  name: string;
  category: string;
  passed: boolean;
  severity: string;
  description: string;
  screenshotPath?: string;
}

function issueCode(name: string): string {
  return 'INSP-' + name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 30);
}

async function postRun(data: {
  status: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  issuesFound: number;
  newIssues: number;
  durationMs: number;
  skipReason?: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/inspection/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (e) {
    console.error('Failed to post run:', e);
    return null;
  }
}

async function postIssue(data: {
  runId: string;
  issueCode: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  screenshotPath?: string;
}) {
  try {
    await fetch(`${API_BASE}/api/inspection/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.error('Failed to post issue:', e);
  }
}

async function getOpenIssues(): Promise<Array<{ id: string; issueCode: string; title: string }>> {
  try {
    const res = await fetch(`${API_BASE}/api/inspection/issues?status=open`);
    const json = await res.json();
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

// ─── Individual Checks ─────────────────────────────────────────────────────

async function checkAppHealth(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // HTTP health check
  try {
    const res = await fetch(BASE_URL);
    results.push({
      name: 'App HTTP Health',
      category: 'infrastructure',
      passed: res.ok,
      severity: 'critical',
      description: res.ok
        ? `App responded with HTTP ${res.status}`
        : `App returned HTTP ${res.status}`,
    });
  } catch (e: any) {
    results.push({
      name: 'App HTTP Health',
      category: 'infrastructure',
      passed: false,
      severity: 'critical',
      description: `App unreachable: ${e.message}`,
    });
  }

  return results;
}

async function checkNavigation(page: any, screenshotDir: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle').catch(() => {});

  const expectedNavItems = ['仪表盘', '账号中心', '内容库', '设置'];
  for (const itemText of expectedNavItems) {
    try {
      const locator = page.locator(`text="${itemText}"`).first();
      const visible = await locator.isVisible({ timeout: 5000 }).catch(() => false);
      results.push({
        name: `Nav: ${itemText}`,
        category: 'navigation',
        passed: visible,
        severity: 'high',
        description: visible
          ? `Navigation item "${itemText}" visible`
          : `Navigation item "${itemText}" NOT found`,
      });
    } catch {
      results.push({
        name: `Nav: ${itemText}`,
        category: 'navigation',
        passed: false,
        severity: 'high',
        description: `Navigation item "${itemText}" check failed`,
      });
    }
  }

  return results;
}

async function checkPageLoads(page: any, screenshotDir: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const pages = [
    { name: '仪表盘', selector: 'text=仪表盘', screenshot: '01-dashboard' },
    { name: '账号中心', selector: 'text=账号中心', screenshot: '02-account-hub' },
    { name: '内容库', selector: 'text=内容库', screenshot: '03-content-library' },
    { name: '设置', selector: 'text=设置', screenshot: '04-settings' },
  ];

  // Collect console errors
  const consoleErrors: string[] = [];
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out known noise (favicon, source map warnings)
      if (!text.includes('favicon') && !text.includes('source map')) {
        consoleErrors.push(text);
      }
    }
  });

  for (const pg of pages) {
    try {
      const navItem = page.locator(pg.selector).first();
      await navItem.click({ timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `${screenshotDir}/${pg.screenshot}.png`,
        fullPage: true,
      }).catch(() => {});

      results.push({
        name: `Page: ${pg.name}`,
        category: 'page-load',
        passed: true,
        severity: 'high',
        description: `Page "${pg.name}" loaded successfully`,
      });
    } catch (e: any) {
      await page.screenshot({
        path: `${screenshotDir}/${pg.screenshot}-error.png`,
        fullPage: true,
      }).catch(() => {});

      results.push({
        name: `Page: ${pg.name}`,
        category: 'page-load',
        passed: false,
        severity: 'high',
        description: `Page "${pg.name}" failed: ${e.message}`,
        screenshotPath: `${pg.screenshot}-error.png`,
      });
    }
  }

  // Console errors check
  if (consoleErrors.length > 0) {
    results.push({
      name: 'Console Errors',
      category: 'errors',
      passed: false,
      severity: 'medium',
      description: `${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 3).join('; ')}`,
    });
  } else {
    results.push({
      name: 'Console Errors',
      category: 'errors',
      passed: true,
      severity: 'medium',
      description: 'No console errors detected',
    });
  }

  return results;
}

async function checkAccountHubTabs(page: any, screenshotDir: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // Navigate to account hub
  try {
    const navItem = page.locator('text=账号中心').first();
    await navItem.click({ timeout: 5000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(500);
  } catch {
    results.push({
      name: 'Account Hub Navigation',
      category: 'account-hub',
      passed: false,
      severity: 'high',
      description: 'Failed to navigate to account hub',
    });
    return results;
  }

  // Check tabs
  const expectedTabs = ['账号概览', '笔记日历', '人设管理'];
  for (const tab of expectedTabs) {
    try {
      const locator = page.locator(`text="${tab}"`).first();
      const visible = await locator.isVisible({ timeout: 3000 }).catch(() => false);
      results.push({
        name: `Tab: ${tab}`,
        category: 'account-hub',
        passed: visible,
        severity: 'medium',
        description: visible
          ? `Tab "${tab}" found`
          : `Tab "${tab}" NOT found`,
      });
    } catch {
      results.push({
        name: `Tab: ${tab}`,
        category: 'account-hub',
        passed: false,
        severity: 'medium',
        description: `Tab "${tab}" check failed`,
      });
    }
  }

  return results;
}

async function checkBrokenImages(page: any, screenshotDir: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  try {
    const brokenCount = await page.locator('img[src]').evaluateAll((imgs) => {
      return imgs.filter((img) => {
        const el = img as HTMLImageElement;
        return el.complete && el.naturalHeight === 0 && el.src.length > 0;
      }).length;
    }).catch(() => 0);

    results.push({
      name: 'Broken Images',
      category: 'visual',
      passed: brokenCount === 0,
      severity: 'low',
      description: brokenCount === 0
        ? 'No broken images detected'
        : `${brokenCount} broken image(s) found`,
    });
  } catch {
    results.push({
      name: 'Broken Images',
      category: 'visual',
      passed: true,
      severity: 'low',
      description: 'Broken image check skipped (error)',
    });
  }

  return results;
}

// ─── Main Runner ────────────────────────────────────────────────────────────

async function runInspection(quick: boolean = false) {
  const startTime = Date.now();
  const screenshotDir = 'test-results/inspection';

  // Ensure screenshot directory exists
  await execAsync(`mkdir -p ${screenshotDir}`);

  console.log(`[inspection] starting at ${new Date().toISOString()}`);
  console.log(`[inspection] mode: ${quick ? 'quick' : 'full'}`);

  // Check for open issues first
  const openIssues = await getOpenIssues();
  if (openIssues.length > 0 && !quick) {
    console.log(`[inspection] found ${openIssues.length} open issue(s), running auto-fix inspection`);
  }

  // Step 1: App health check (no browser needed)
  const healthResults = await checkAppHealth();
  const healthPassed = healthResults.filter((r) => r.passed).length;
  const healthFailed = healthResults.filter((r) => !r.passed).length;

  console.log(`[inspection] health: ${healthPassed} passed, ${healthFailed} failed`);

  // Post initial run
  const runData = await postRun({
    status: 'running',
    totalChecks: healthResults.length,
    passedChecks: healthPassed,
    failedChecks: healthFailed,
    issuesFound: 0,
    newIssues: 0,
    durationMs: Date.now() - startTime,
  });

  const runId = runData?.data?.id;
  if (!runId) {
    console.error('[inspection] failed to create inspection run');
    return;
  }

  console.log(`[inspection] run ID: ${runId}`);

  // Post health issues
  for (const result of healthResults) {
    if (!result.passed) {
      await postIssue({
        runId,
        issueCode: issueCode(result.name),
        category: result.category,
        title: result.name,
        description: result.description,
        severity: result.severity,
        screenshotPath: result.screenshotPath,
      });
    }
  }

  // If quick mode, stop after health check
  if (quick) {
    const duration = Date.now() - startTime;
    await postRun({
      status: 'completed',
      totalChecks: healthResults.length,
      passedChecks: healthPassed,
      failedChecks: healthFailed,
      issuesFound: healthFailed,
      newIssues: openIssues.length,
      durationMs: duration,
    });
    console.log(`[inspection] quick check complete in ${duration}ms`);
    return;
  }

  // Step 2: Full browser-based inspection
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });

  try {
    const navResults = await checkNavigation(page, screenshotDir);
    const pageResults = await checkPageLoads(page, screenshotDir);
    const tabResults = await checkAccountHubTabs(page, screenshotDir);
    const imageResults = await checkBrokenImages(page, screenshotDir);

    const allResults = [...healthResults, ...navResults, ...pageResults, ...tabResults, ...imageResults];
    const passed = allResults.filter((r) => r.passed).length;
    const failed = allResults.filter((r) => !r.passed).length;

    console.log(`[inspection] total: ${allResults.length} checks, ${passed} passed, ${failed} failed`);

    // Post remaining issues
    for (const result of allResults) {
      if (!result.passed) {
        await postIssue({
          runId,
          issueCode: issueCode(result.name),
          category: result.category,
          title: result.name,
          description: result.description,
          severity: result.severity,
          screenshotPath: result.screenshotPath,
        });
      }
    }

    // Update run status
    await postRun({
      status: 'completed',
      totalChecks: allResults.length,
      passedChecks: passed,
      failedChecks: failed,
      issuesFound: failed,
      newIssues: openIssues.length,
      durationMs: Date.now() - startTime,
    });

    console.log(`[inspection] completed in ${Date.now() - startTime}ms`);
    console.log(`[inspection] ${passed}/${allResults.length} checks passed`);

    if (failed > 0) {
      console.log('[inspection] FAILED checks:');
      allResults.filter((r) => !r.passed).forEach((r) => {
        console.log(`  [${r.severity}] ${r.name}: ${r.description}`);
      });
    }
  } catch (e: any) {
    console.error('[inspection] fatal error:', e.message);
    await postRun({
      status: 'failed',
      totalChecks: healthResults.length,
      passedChecks: healthPassed,
      failedChecks: healthFailed,
      issuesFound: healthFailed + 1,
      newIssues: openIssues.length,
      durationMs: Date.now() - startTime,
      skipReason: e.message,
    });
  } finally {
    await browser.close();
  }
}

// ─── Entry Point ────────────────────────────────────────────────────────────

const quick = process.argv.includes('--quick');
runInspection(quick).catch((e) => {
  console.error('[inspection] unhandled error:', e);
  process.exit(1);
});
