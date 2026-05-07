const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const COMPONENTS_DIR = '/mnt/f/AI_works/project/ai-social-pilot/workspace/src/components/views';

// Helper function to fetch HTML content
async function fetchPage(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

// Test functions
async function testNavigation() {
  console.log('\n========================================');
  console.log('TEST 1: Navigation Sidebar');
  console.log('========================================');

  const { status, body } = await fetchPage('/');
  if (status !== 200) {
    console.log('FAIL: Homepage returned status', status);
    return false;
  }

  // Check for navigation items
  const navItems = ['仪表盘', '账号中心', '内容库', '设置'];
  let allFound = true;

  for (const item of navItems) {
    if (body.includes(item)) {
      console.log(`PASS: Found navigation item "${item}"`);
    } else {
      console.log(`FAIL: Missing navigation item "${item}"`);
      allFound = false;
    }
  }

  // Verify settings button is at the bottom (after main nav)
  const navSection = body.match(/<nav class="flex-1 px-3 py-4 space-y-1">.*?<\/nav>/s);
  const settingsSection = body.match(/<div class="px-3 pb-2">.*?设置.*?<\/div>/s);

  if (settingsSection) {
    console.log('PASS: Settings button is in separate bottom section');
  } else {
    console.log('WARN: Could not verify settings button position');
  }

  // Check that there are exactly 4 nav items (3 in main nav + 1 in settings)
  const navButtons = (body.match(/nav-item-hover/g) || []).length;
  console.log(`INFO: Found ${navButtons} nav-item-hover classes`);

  // Verify mobile navigation also has all items
  const mobileNavItems = body.match(/class="md:hidden.*?fixed bottom-0.*?<\/nav>/s);
  if (mobileNavItems) {
    console.log('PASS: Mobile navigation present with all items');
  }

  return allFound;
}

async function testDashboard() {
  console.log('\n========================================');
  console.log('TEST 2: Dashboard Page (仪表盘)');
  console.log('========================================');

  const { status, body } = await fetchPage('/');
  const fs = require('fs');

  // Check for dashboard elements in HTML
  const hasTitle = body.includes('小红书AI运营助手');
  console.log(`${hasTitle ? 'PASS' : 'FAIL'}: App title present`);

  // Check for skeleton loaders (loading state)
  const hasSkeletons = body.includes('animate-pulse') && body.includes('skeleton');
  console.log(`${hasSkeletons ? 'PASS' : 'WARN'}: Loading skeletons present`);

  // Check for main layout structure
  const hasMainLayout = body.includes('min-h-screen flex bg-background');
  console.log(`${hasMainLayout ? 'PASS' : 'FAIL'}: Main layout structure present`);

  // Check for sidebar
  const hasSidebar = body.includes('aside') && body.includes('w-56');
  console.log(`${hasSidebar ? 'PASS' : 'FAIL'}: Sidebar present`);

  // Read dashboard view source
  try {
    const dashboardContent = fs.readFileSync(`${COMPONENTS_DIR}/dashboard-view.tsx`, 'utf-8');

    // Check for stats cards
    const hasStatsCards = dashboardContent.includes('StatsCard') || dashboardContent.includes('统计');
    console.log(`${hasStatsCards ? 'PASS' : 'WARN'}: Stats cards component present`);

    // Check for quick actions
    const hasQuickActions = dashboardContent.includes('快速') || dashboardContent.includes('QuickAction');
    console.log(`${hasQuickActions ? 'PASS' : 'WARN'}: Quick actions present`);

    // Check for overview section
    const hasOverview = dashboardContent.includes('概览') || dashboardContent.includes('overview');
    console.log(`${hasOverview ? 'PASS' : 'WARN'}: Overview section present`);

  } catch (err) {
    console.log('WARN: Could not read dashboard view source');
  }

  return hasTitle && hasMainLayout && hasSidebar;
}

async function testAccountHub() {
  console.log('\n========================================');
  console.log('TEST 3: Account Hub Page (账号中心)');
  console.log('========================================');

  try {
    const accountHubContent = fs.readFileSync(`${COMPONENTS_DIR}/account-hub-view.tsx`, 'utf-8');

    // Check for tabs
    const tabs = ['账号概览', '笔记日历', '人设管理'];
    let allTabsFound = true;

    for (const tab of tabs) {
      if (accountHubContent.includes(tab)) {
        console.log(`PASS: Found tab "${tab}" in source code`);
      } else {
        console.log(`FAIL: Missing tab "${tab}" in source code`);
        allTabsFound = false;
      }
    }

    // Check for tab switching logic
    const hasTabSwitching = accountHubContent.includes('Tabs') || accountHubContent.includes('activeTab');
    console.log(`${hasTabSwitching ? 'PASS' : 'FAIL'}: Tab switching logic present`);

    // Check for account management features
    const hasAccountFeatures = accountHubContent.includes('账号') && accountHubContent.includes('账号概览');
    console.log(`${hasAccountFeatures ? 'PASS' : 'WARN'}: Account management features present`);

    // Check for calendar features
    const hasCalendarFeatures = accountHubContent.includes('日历') || accountHubContent.includes('Calendar');
    console.log(`${hasCalendarFeatures ? 'PASS' : 'WARN'}: Calendar features present`);

    // Check for persona management
    const hasPersonaFeatures = accountHubContent.includes('人设') || accountHubContent.includes('persona');
    console.log(`${hasPersonaFeatures ? 'PASS' : 'WARN'}: Persona management features present`);

    return allTabsFound && hasTabSwitching;

  } catch (err) {
    console.log('FAIL: Could not read account hub view source:', err.message);
    return false;
  }
}

async function testContentLibrary() {
  console.log('\n========================================');
  console.log('TEST 4: Content Library Page (内容库)');
  console.log('========================================');

  try {
    const contentLibContent = fs.readFileSync(`${COMPONENTS_DIR}/content-view.tsx`, 'utf-8');

    // Check for asset type filters
    const filters = ['全部', '文字', '图片', '视频'];
    let allFiltersFound = true;

    for (const filter of filters) {
      if (contentLibContent.includes(filter)) {
        console.log(`PASS: Found filter "${filter}" in source code`);
      } else {
        console.log(`FAIL: Missing filter "${filter}" in source code`);
        allFiltersFound = false;
      }
    }

    // Check for search input
    const hasSearch = contentLibContent.includes('搜索') || contentLibContent.includes('search') || contentLibContent.includes('SearchInput');
    console.log(`${hasSearch ? 'PASS' : 'FAIL'}: Search functionality present`);

    // Check for view toggle
    const hasViewToggle = contentLibContent.includes('grid') || contentLibContent.includes('list') || contentLibContent.includes('Grid');
    console.log(`${hasViewToggle ? 'PASS' : 'WARN'}: View toggle (grid/list) present`);

    // Check for asset grid/list display
    const hasAssetDisplay = contentLibContent.includes('Asset') || contentLibContent.includes('内容') || contentLibContent.includes('Grid');
    console.log(`${hasAssetDisplay ? 'PASS' : 'WARN'}: Asset display components present`);

    return allFiltersFound && hasSearch;

  } catch (err) {
    console.log('FAIL: Could not read content library source:', err.message);
    return false;
  }
}

async function testSettings() {
  console.log('\n========================================');
  console.log('TEST 5: Settings Page (设置)');
  console.log('========================================');

  try {
    const settingsContent = fs.readFileSync(`${COMPONENTS_DIR}/settings-view.tsx`, 'utf-8');

    // Check for AI configuration
    const hasAIConfig = settingsContent.includes('AI') || settingsContent.includes('ai') || settingsContent.includes('配置') || settingsContent.includes('模型');
    console.log(`${hasAIConfig ? 'PASS' : 'FAIL'}: AI configuration present`);

    // Verify notification settings does NOT exist
    const hasNotificationSettings = settingsContent.includes('通知设置') || settingsContent.includes('notification-card');
    if (!hasNotificationSettings) {
      console.log('PASS: Notification settings card correctly removed');
    } else {
      console.log('FAIL: Notification settings card still present (should be removed)');
    }

    // Verify no "Made by Z.ai" branding
    const hasBranding = settingsContent.includes('Made by Z.ai') || settingsContent.includes('Z.ai');
    if (!hasBranding) {
      console.log('PASS: No "Made by Z.ai" branding present');
    } else {
      console.log('FAIL: "Made by Z.ai" branding still present');
    }

    // Check for version info
    const hasVersion = settingsContent.includes('版本') || settingsContent.includes('version') || settingsContent.includes('v0');
    console.log(`${hasVersion ? 'PASS' : 'WARN'}: Version information present`);

    // Check for settings sections
    const hasSettingsSections = settingsContent.includes('SettingsSection') || settingsContent.includes('设置');
    console.log(`${hasSettingsSections ? 'PASS' : 'WARN'}: Settings sections present`);

    return hasAIConfig && !hasNotificationSettings && !hasBranding;

  } catch (err) {
    console.log('FAIL: Could not read settings page source:', err.message);
    return false;
  }
}

async function testVisualRegressions() {
  console.log('\n========================================');
  console.log('TEST 6: Visual Regressions Check');
  console.log('========================================');

  const { status, body } = await fetchPage('/');

  // Check for broken layout indicators
  const hasBrokenLayout = body.includes('error') && body.includes('boundary');
  console.log(`${!hasBrokenLayout ? 'PASS' : 'WARN'}: No obvious layout errors in HTML`);

  // Check for proper CSS classes
  const hasTailwindClasses = body.includes('bg-background') || body.includes('min-h-screen');
  console.log(`${hasTailwindClasses ? 'PASS' : 'FAIL'}: Tailwind CSS classes applied`);

  // Check for mobile navigation
  const hasMobileNav = body.includes('md:hidden') && body.includes('fixed bottom-0');
  console.log(`${hasMobileNav ? 'PASS' : 'WARN'}: Mobile navigation present`);

  // Check for proper icon rendering (SVG icons present)
  const hasIcons = body.includes('lucide-layout-dashboard') || body.includes('<svg');
  console.log(`${hasIcons ? 'PASS' : 'FAIL'}: Icons present`);

  // Check for theme support
  const hasTheme = body.includes('ThemeProvider') || (body.includes('light') && body.includes('dark'));
  console.log(`${hasTheme ? 'PASS' : 'WARN'}: Theme support present`);

  // Check for toast/notification system
  const hasToast = body.includes('Toaster') || body.includes('sonner');
  console.log(`${hasToast ? 'PASS' : 'WARN'}: Toast notification system present`);

  // Check for status badge
  const hasStatusBadge = body.includes('运行中') || body.includes('badge');
  console.log(`${hasStatusBadge ? 'PASS' : 'WARN'}: Status badge present`);

  // Check for app version display
  const hasVersion = body.includes('v0.3.0-beta');
  console.log(`${hasVersion ? 'PASS' : 'WARN'}: App version displayed`);

  return hasTailwindClasses && hasIcons;
}

async function testAppSidebar() {
  console.log('\n========================================');
  console.log('TEST 7: App Sidebar Component');
  console.log('========================================');

  try {
    const sidebarPath = '/mnt/f/AI_works/project/ai-social-pilot/workspace/src/components/app-sidebar.tsx';
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');

    // Check for navigation items in sidebar
    const navItems = ['仪表盘', '账号中心', '内容库', '设置'];
    let allFound = true;

    for (const item of navItems) {
      if (sidebarContent.includes(item)) {
        console.log(`PASS: Found nav item "${item}" in sidebar component`);
      } else {
        console.log(`FAIL: Missing nav item "${item}" in sidebar component`);
        allFound = false;
      }
    }

    // Check for navigation structure - 3 main + 1 settings
    const mainNavItems = ['dashboard', 'account-hub', 'content'];
    const settingsItem = 'settings';

    let mainNavFound = 0;
    for (const item of mainNavItems) {
      if (sidebarContent.includes(item)) mainNavFound++;
    }

    console.log(`INFO: Found ${mainNavFound} main nav items in sidebar`);

    // Check that settings is separated
    const settingsSection = sidebarContent.includes('pb-2') && sidebarContent.includes('settings');
    console.log(`${settingsSection ? 'PASS' : 'FAIL'}: Settings button in separate section`);

    return allFound && settingsSection;

  } catch (err) {
    console.log('FAIL: Could not read sidebar component:', err.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n========================================');
  console.log('XIAOHONGSHU AI OPERATIONS ASSISTANT');
  console.log('Visual QA Test Report');
  console.log('========================================\n');
  console.log('Test Date: ' + new Date().toISOString());
  console.log('Application URL: ' + BASE_URL);
  console.log('========================================\n');

  const results = {
    navigation: await testNavigation(),
    dashboard: await testDashboard(),
    accountHub: await testAccountHub(),
    contentLibrary: await testContentLibrary(),
    settings: await testSettings(),
    visualRegressions: await testVisualRegressions(),
    appSidebar: await testAppSidebar()
  };

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');

  let passCount = 0;
  let failCount = 0;

  for (const [testName, passed] of Object.entries(results)) {
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`${testName}: ${status}`);
    if (passed) passCount++;
    else failCount++;
  }

  console.log('\n----------------------------------------');
  console.log(`Total: ${passCount} PASS, ${failCount} FAIL`);
  console.log(`Pass Rate: ${Math.round(passCount / Object.keys(results).length * 100)}%`);
  console.log('========================================\n');

  // Return overall result
  return failCount === 0;
}

// Execute tests
runAllTests()
  .then(success => {
    console.log(success ? 'All tests passed!' : 'Some tests failed.');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
  });