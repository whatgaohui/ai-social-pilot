/**
 * Browser Manager — Playwright browser lifecycle management
 *
 * Manages a singleton Chromium browser context with persistent cookies.
 * All scraping is done inside the browser to bypass XHS signature checks.
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const COOKIE_STORE_PATH = path.join(__dirname, 'cookie-store.json');

export interface XhsBrowserManager {
  context: BrowserContext | null;
  init: () => Promise<void>;
  getPage: () => Promise<Page>;
  loadCookies: () => Promise<void>;
  saveCookies: () => Promise<void>;
  close: () => Promise<void>;
  isReady: () => boolean;
}

class BrowserManagerImpl implements XhsBrowserManager {
  browser: Browser | null = null;
  context: BrowserContext | null = null;

  isReady(): boolean {
    return this.browser !== null && this.context !== null;
  }

  async init(): Promise<void> {
    if (this.browser) return;

    const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || '/tmp/pw-browsers';
    this.browser = await chromium.launch({
      headless: process.env.XHS_HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    this.context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN',
    });

    // Apply stealth script to reduce detection
    await this.context.addInitScript(() => {
      // Hide webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Load saved cookies if available
    await this.loadCookies();

    console.log('[Browser] Chromium initialized');
  }

  async getPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser not initialized');
    }
    return await this.context.newPage();
  }

  async loadCookies(): Promise<void> {
    if (!this.context) return;

    try {
      if (fs.existsSync(COOKIE_STORE_PATH)) {
        const raw = fs.readFileSync(COOKIE_STORE_PATH, 'utf8');
        const cookies = JSON.parse(raw);
        if (Array.isArray(cookies) && cookies.length > 0) {
          // Set cookies for XHS domains
          await this.context.addCookies(cookies);
          console.log(`[Browser] Loaded ${cookies.length} cookies from store`);
        }
      }
    } catch (err) {
      console.error('[Browser] Failed to load cookies:', err);
    }
  }

  async saveCookies(): Promise<void> {
    if (!this.context) return;

    try {
      const cookies = await this.context.cookies();
      // Filter only XHS-related cookies
      const xhsCookies = cookies.filter(
        (c) =>
          c.domain.includes('xiaohongshu.com') ||
          c.domain.includes('rednote.com') ||
          c.domain.includes('edith.xiaohongshu.com')
      );
      if (xhsCookies.length > 0) {
        fs.writeFileSync(COOKIE_STORE_PATH, JSON.stringify(xhsCookies, null, 2));
        console.log(`[Browser] Saved ${xhsCookies.length} cookies`);
      }
    } catch (err) {
      console.error('[Browser] Failed to save cookies:', err);
    }
  }

  async close(): Promise<void> {
    await this.saveCookies();
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
let instance: XhsBrowserManager | null = null;

export function getBrowserManager(): XhsBrowserManager {
  if (!instance) {
    instance = new BrowserManagerImpl();
  }
  return instance;
}
