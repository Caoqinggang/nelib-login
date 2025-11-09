const axios = require('axios');
const { chromium } = require('playwright');
const FormData = require('form-data');
const fs = require('fs');

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const accounts = process.env.ACCOUNTS;

if (!accounts) {
  console.log('❌ 未配置账号');
  process.exit(1);
}

// 解析多个账号，支持逗号或分号分隔
const accountList = accounts.split(/[,;]/).map(account => {
  const [user, pass] = account.split(":").map(s => s.trim());
  return { user, pass };
}).filter(acc => acc.user && acc.pass);

if (accountList.length === 0) {
  console.log('❌ 账号格式错误，应为 username1:password1,username2:password2');
  process.exit(1);
}

// 📩 发送文字消息
async function sendTelegramText(message) {
  if (!token || !chatId) return;

  const now = new Date();
  const hkTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const timeStr = hkTime.toISOString().replace('T', ' ').substr(0, 19) + " HKT";

  const fullMessage = `🎉 Netlib 登录通知\n\n登录时间：${timeStr}\n\n${message}`;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: fullMessage
    });
    console.log('✅ Telegram 文本通知发送成功');
  } catch (e) {
    console.log('⚠️ Telegram 文本发送失败:', e.message);
  }
}

// 📸 发送截图图片
async function sendTelegramPhoto(photoPath, caption = '') {
  if (!token || !chatId) return;
  if (!fs.existsSync(photoPath)) {
    console.log(`⚠️ 图片不存在: ${photoPath}`);
    return;
  }

  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', caption);
  form.append('photo', fs.createReadStream(photoPath));

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });
    console.log(`📤 Telegram 图片发送成功: ${photoPath}`);
  } catch (e) {
    console.log(`⚠️ Telegram 图片发送失败: ${photoPath}`, e.message);
  }
}

async function loginWithAccount(user, pass) {
  console.log(`\n🚀 开始登录账号: ${user}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let page;
  let result = { user, success: false, message: '', screenshot: '' };

  try {
    page = await browser.newPage();
    page.setDefaultTimeout(30000);

    console.log(`📱 ${user} - 正在访问网站...`);
    await page.goto('https://www.netlib.re/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`🔑 ${user} - 点击登录按钮...`);
    await page.click('text=Login', { timeout: 5000 });
    await page.waitForTimeout(2000);

    console.log(`📝 ${user} - 填写用户名...`);
    await page.fill('input[name="username"], input[type="text"]', user);
    await page.waitForTimeout(1000);

    console.log(`🔒 ${user} - 填写密码...`);
    await page.fill('input[name="password"], input[type="password"]', pass);
    await page.waitForTimeout(1000);

    console.log(`📤 ${user} - 提交登录...`);
    await page.click('button:has-text("Validate"), input[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // 检查登录是否成功
    const pageContent = await page.content();
    if (pageContent.includes('exclusive owner') || pageContent.includes(user)) {
      console.log(`✅ ${user} - 登录成功`);
      result.success = true;
      result.message = `✅ ${user} 登录成功`;
    } else {
      console.log(`❌ ${user} - 登录失败`);
      result.message = `❌ ${user} 登录失败`;
    }

    // 📸 保存截图
    const safeUser = user.replace(/[^a-zA-Z0-9_-]/g, '_');
    const screenshotPath = `./screenshot_${safeUser}_${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    result.screenshot = screenshotPath;
    console.log(`📸 截图已保存: ${screenshotPath}`);

  } catch (e) {
    console.log(`❌ ${user} - 登录异常: ${e.message}`);
    result.message = `❌ ${user} 登录异常: ${e.message}`;
  } finally {
    if (page) await page.close();
    await browser.close();
  }

  return result;
}

async function main() {
  console.log(`🔍 发现 ${accountList.length} 个账号需要登录`);

  const results = [];

  for (let i = 0; i < accountList.length; i++) {
    const { user, pass } = accountList[i];
    console.log(`\n📋 处理第 ${i + 1}/${accountList.length} 个账号: ${user}`);

    const result = await loginWithAccount(user, pass);
    results.push(result);

    // 发送每个账号的截图
    if (result.screenshot) {
      await sendTelegramPhoto(result.screenshot, result.message);
    }

    if (i < accountList.length - 1) {
      console.log('⏳ 等待3秒后处理下一个账号...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // 汇总所有结果并发送一条消息
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  let summaryMessage = `📊 登录汇总: ${successCount}/${totalCount} 个账号成功\n\n`;

  results.forEach(result => {
    summaryMessage += `${result.message}\n`;
  });

  await sendTelegramText(summaryMessage);
  console.log('\n✅ 所有账号处理完成！');
}

main().catch(console.error);
