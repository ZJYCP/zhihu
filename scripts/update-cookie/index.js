const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const isServer = !process.env.DISPLAY && process.platform === 'linux';

const USER_DATA_DIR = path.join(__dirname, 'zhihu-user-data');
const QR_IMAGE_PATH = path.join(__dirname, './asset/zhihu-login-qr.png');
const LOGIN_PAGE_IMAGE_PATH = path.join(__dirname, './asset/zhihu-login-page.png');
const LOGIN_STATE_PATH = path.join(__dirname, './asset/zhihu-login-state.json');

const HOME_URL = 'https://www.zhihu.com/';
const SIGNIN_URL = 'https://www.zhihu.com/signin?next=%2F';
const LOGIN_TIMEOUT_MS = Number(process.env.ZHIHU_LOGIN_TIMEOUT_MS || 3 * 60 * 1000);
const POLL_INTERVAL_MS = Number(process.env.ZHIHU_LOGIN_POLL_MS || 3000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function isVisibleRect(rect) {
  return rect && rect.width >= 100 && rect.height >= 100;
}

async function buildPage() {
  const browser = await puppeteer.launch({
    headless: isServer ? 'new' : false,
    userDataDir: USER_DATA_DIR,
    defaultViewport: isServer ? { width: 1440, height: 1080 } : null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      ...(isServer ? [] : ['--start-maximized'])
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8'
  });

  return { browser, page };
}

async function goto(page, url) {
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
}

function isNavigationContextError(error) {
  const message = error?.message || '';
  return [
    'Execution context was destroyed',
    'Cannot find context with specified id',
    'Inspected target navigated or closed',
    'Frame was detached'
  ].some((keyword) => message.includes(keyword));
}

async function validateLogin(page) {
  await goto(page, HOME_URL);
  await sleep(1500);

  const result = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/v4/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          accept: 'application/json, text/plain, */*'
        }
      });

      const text = await response.text();
      let data = null;

      try {
        data = JSON.parse(text);
      } catch (error) {
        data = { raw: text };
      }

      return {
        ok: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error.message
      };
    }
  });

  const user = result?.data;
  const loggedIn = Boolean(
    result?.ok && user && typeof user === 'object' && (user.id || user.url_token || user.name)
  );

  return {
    loggedIn,
    status: result?.status || 0,
    user: loggedIn
      ? {
          id: user.id || null,
          name: user.name || null,
          urlToken: user.url_token || null
        }
      : null,
    raw: result
  };
}

async function validateLoginInPlace(page) {
  let result;

  try {
    result = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/v4/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            accept: 'application/json, text/plain, */*'
          }
        });

        const text = await response.text();
        let data = null;

        try {
          data = JSON.parse(text);
        } catch (error) {
          data = { raw: text };
        }

        return {
          ok: response.ok,
          status: response.status,
          data
        };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          error: error.message
        };
      }
    });
  } catch (error) {
    if (!isNavigationContextError(error)) {
      throw error;
    }

    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => null);
    return validateLogin(page);
  }

  const user = result?.data;
  const loggedIn = Boolean(
    result?.ok && user && typeof user === 'object' && (user.id || user.url_token || user.name)
  );

  return {
    loggedIn,
    status: result?.status || 0,
    user: loggedIn
      ? {
          id: user.id || null,
          name: user.name || null,
          urlToken: user.url_token || null
        }
      : null,
    raw: result
  };
}

async function clickText(page, texts) {
  return page.evaluate((values) => {
    const normalized = values.map((item) => item.replace(/\s+/g, ''));
    const nodes = Array.from(document.querySelectorAll('button, a, div, span'));

    for (const node of nodes) {
      const text = (node.textContent || '').replace(/\s+/g, '');
      if (!text) {
        continue;
      }

      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      if (!visible) {
        continue;
      }

      if (normalized.some((target) => text.includes(target))) {
        node.click();
        return true;
      }
    }

    return false;
  }, texts);
}

async function ensureQrLoginMode(page) {
  await goto(page, SIGNIN_URL);
  await sleep(2500);

  const validateResult = await validateLogin(page);
  if (validateResult.loggedIn) {
    return validateResult;
  }

  await goto(page, SIGNIN_URL);
  await sleep(2000);

  await clickText(page, ['扫码登录', '二维码登录', '扫码登入', '二维码登入']);
  await sleep(2000);

  return null;
}

async function findQrHandle(page) {
  const handles = await page.$$('img, canvas, svg');
  let bestHandle = null;
  let bestScore = -1;

  for (const handle of handles) {
    const meta = await handle.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const attrs = [
        element.getAttribute('src') || '',
        element.getAttribute('class') || '',
        element.getAttribute('alt') || '',
        element.getAttribute('aria-label') || '',
        element.id || ''
      ]
        .join(' ')
        .toLowerCase();

      const visible =
        rect.width >= 100 &&
        rect.height >= 100 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) !== 0;

      if (!visible) {
        return null;
      }

      let score = 0;
      if (Math.abs(rect.width - rect.height) <= 24) {
        score += 2;
      }
      if (attrs.includes('qr') || attrs.includes('qrcode')) {
        score += 10;
      }
      if (attrs.includes('二维码') || attrs.includes('扫码')) {
        score += 10;
      }
      if (element.tagName.toLowerCase() === 'canvas') {
        score += 3;
      }
      if (rect.width <= 420 && rect.height <= 420) {
        score += 2;
      }

      return {
        score,
        rect: {
          width: rect.width,
          height: rect.height
        }
      };
    });

    if (!meta || !isVisibleRect(meta.rect)) {
      continue;
    }

    if (meta.score > bestScore) {
      bestScore = meta.score;
      bestHandle = handle;
    }
  }

  return bestHandle;
}

async function saveQrCode(page) {
  ensureParentDir(QR_IMAGE_PATH);

  const qrHandle = await findQrHandle(page);
  if (qrHandle) {
    await qrHandle.screenshot({ path: QR_IMAGE_PATH, type: 'png' });
    return {
      ok: true,
      path: QR_IMAGE_PATH,
      fallback: false
    };
  }

  await page.screenshot({ path: LOGIN_PAGE_IMAGE_PATH, fullPage: true });
  return {
    ok: false,
    path: LOGIN_PAGE_IMAGE_PATH,
    fallback: true
  };
}

async function refreshQrIfNeeded(page) {
  const expired = await page.evaluate(() => {
    const text = (document.body?.innerText || '').replace(/\s+/g, '');
    return ['二维码已失效', '二维码过期', '请点击刷新', '请刷新二维码', '重新获取二维码']
      .some((keyword) => text.includes(keyword));
  });

  if (!expired) {
    return false;
  }

  return clickText(page, ['刷新二维码', '点击刷新', '重新获取二维码', '重新获取']);
}

async function waitForLogin(page) {
  const deadline = Date.now() + LOGIN_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const validateResult = await validateLoginInPlace(page);
    if (validateResult.loggedIn) {
      return validateResult;
    }

    await refreshQrIfNeeded(page);
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`等待扫码登录超时（${Math.round(LOGIN_TIMEOUT_MS / 1000)} 秒）`);
}

async function persistLoginState(result, page) {
  // 访问一个实际的知乎页面，触发完整的 cookie 设置
  await goto(page, 'https://www.zhihu.com/question/1935296380169086685/answer/1936878953689225037');
  await sleep(5000);

  const client = await page.createCDPSession();
  const { cookies: allCookies } = await client.send('Network.getAllCookies');
  const cookies = allCookies.filter(c => c.domain.includes('zhihu.com'));
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  console.log(`获取到 ${cookies.length} 个知乎 Cookie，关键 Cookie: ${cookies.map(c => c.name).join(', ')}`);
  const state = {
    updatedAt: new Date().toISOString(),
    user: result.user,
    cookieCount: cookies.length,
    currentUrl: page.url(),
    cookie: cookieString
  };

  ensureParentDir(LOGIN_STATE_PATH);
  fs.writeFileSync(LOGIN_STATE_PATH, JSON.stringify(state, null, 2));

  // 同步 cookie 到远程配置接口
  try {
    const res = await fetch('https://zhihu.artimind.top/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'zhihu_cookie', value: cookieString })
    });
    if (res.ok) {
      console.log('Cookie 已同步到远程配置接口');
    } else {
      console.warn(`远程配置接口返回异常: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.warn('同步 Cookie 到远程接口失败:', err.message);
  }

  return state;
}

async function main() {
  const { browser, page } = await buildPage();

  try {
    console.log('开始检查知乎登录态...');
    const existingLogin = await validateLogin(page);

    if (existingLogin.loggedIn) {
      const state = await persistLoginState(existingLogin, page);
      console.log(`已复用本地登录态，当前账号：${state.user?.name || state.user?.urlToken || state.user?.id}`);
      console.log(`登录状态已写入: ${LOGIN_STATE_PATH}`);
      return;
    }

    console.log('未检测到有效登录态，准备进入扫码登录流程...');
    const qrModeResult = await ensureQrLoginMode(page);

    if (qrModeResult?.loggedIn) {
      const state = await persistLoginState(qrModeResult, page);
      console.log(`页面已自动恢复登录，当前账号：${state.user?.name || state.user?.urlToken || state.user?.id}`);
      console.log(`登录状态已写入: ${LOGIN_STATE_PATH}`);
      return;
    }

    const qrResult = await saveQrCode(page);
    if (qrResult.ok) {
      console.log(`已保存知乎登录二维码: ${qrResult.path}`);
    } else {
      console.log(`未精准定位到二维码，已保存登录页截图: ${qrResult.path}`);
    }

    console.log('请使用知乎 App 扫码，脚本会自动等待登录成功...');
    const loginResult = await waitForLogin(page);
    const state = await persistLoginState(loginResult, page);

    console.log(`登录成功，当前账号：${state.user?.name || state.user?.urlToken || state.user?.id}`);
    console.log(`登录状态已写入: ${LOGIN_STATE_PATH}`);
    console.log(`用户数据目录: ${USER_DATA_DIR}`);
  } finally {
    // await browser.close();
  }
}

main().catch((error) => {
  console.error('执行失败:', error.message);
  process.exit(1);
});
