# 🤖 Auto Netlib Login Bot

自动化脚本，通过 **GitHub Actions + Playwright + Telegram Bot**  
实现 **定期登录 [Netlib.re](https://www.netlib.re/)** 网站，  
支持多账号自动登录、截图保存，并推送登录结果及截图到 Telegram。

---

## 🚀 功能介绍

- ✅ 支持多个账号自动登录（使用逗号或分号分隔）
- ✅ 登录成功后自动截图保存
- ✅ 将截图和登录结果推送到 Telegram
- ✅ 自动统计登录成功 / 失败账号数量
- ✅ 支持 GitHub Actions 定时运行（默认每 14 天执行一次）
- ✅ 可手动触发登录任务（workflow_dispatch）

---

## 🧱 项目结构

```
├── .github/
│   └── workflows/
│       └── auto-login.yml     # GitHub Actions 工作流
├── login.js                   # 自动登录主脚本（含截图 + Telegram 通知）
└── README.md                  # 项目说明文档
```

---

## ⚙️ 环境变量配置

在你的 GitHub 仓库中，前往：

> **Settings → Secrets and variables → Actions → New repository secret**

添加以下三项机密信息：

| 名称 | 示例值 | 说明 |
|------|----------|------|
| `BOT_TOKEN` | `1234567890:ABCDEF-GHIJKL...` | 你的 Telegram Bot Token |
| `CHAT_ID` | `987654321` | 你的 Telegram 用户 ID 或群组 ID |
| `ACCOUNTS` | `user1@gmail.com:pass1,user2@gmail.com:pass2` | 登录账号，格式为 `账号:密码`，用逗号或分号隔开 |

⚠️ 注意事项：
- 不要换行，不要有空格。
- 冒号（:）必须是英文半角。
- 多个账号示例：  
  ```
  test1@example.com:123456,test2@example.com:abcdef
  ```

---

## 📜 GitHub Actions 配置文件

保存为：  
`.github/workflows/auto-login.yml`

```yaml
name: Auto Netlib Login Every 14 Days

on:
  schedule:
    - cron: "0 0 */14 * *"    # 每 14 天执行一次（UTC 00:00）
  workflow_dispatch:          # 支持手动触发

jobs:
  auto-login:
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4

      - name: ⚙️ Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: 📦 Install dependencies
        run: |
          npm init -y
          npm install playwright axios form-data

      - name: 🧠 Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: ▶️ Run login script
        env:
          BOT_TOKEN: ${{ secrets.BOT_TOKEN }}
          CHAT_ID: ${{ secrets.CHAT_ID }}
          ACCOUNTS: ${{ secrets.ACCOUNTS }}
        run: node login.js
```

---

## 💻 主脚本说明：`login.js`

该脚本主要功能如下：

- 自动读取环境变量；
- 打开 `https://www.netlib.re/` 网站；
- 自动点击登录按钮；
- 自动填写用户名和密码；
- 提交登录表单；
- 判断是否登录成功；
- 保存截图；
- 发送 Telegram 消息与截图；
- 汇总所有账号登录结果并推送统计信息。

📸 **截图保存命名规则：**
```
screenshot_<用户名>_<时间戳>.png
```

🧾 **Telegram 推送示例：**
```
🎉 Netlib 登录通知
登录时间：2025-11-09 10:00:00 HKT

📊 登录汇总: 2/3 个账号成功

✅ user1 登录成功
✅ user2 登录成功
❌ user3 登录失败
```

并附上每个账号的截图（自动发送到 Telegram）。

---

## 🧩 可选优化建议

### 🧹 删除旧截图防止空间爆满
可在 `login.js` 开头添加：
```js
fs.readdirSync('.').forEach(f => {
  if (f.startsWith('screenshot_') && f.endsWith('.png')) fs.unlinkSync(f);
});
```

### 📏 截图大小优化
若不需要完整页面截图，可改为：
```js
await page.screenshot({ path: screenshotPath, fullPage: false });
```

### 🔁 Telegram 图片发送重试机制
为防止网络波动，可在 `sendTelegramPhoto` 中加入三次重试逻辑：
```js
for (let i = 0; i < 3; i++) {
  try {
    await axios.post(...);
    break;
  } catch {
    console.log(`第 ${i+1} 次发送失败，2 秒后重试`);
    await new Promise(r => setTimeout(r, 2000));
  }
}
```

---

## 📆 运行方式

### ✅ 自动执行
GitHub Actions 将按照 cron 计划任务 **每 14 天** 自动运行。

### 🔘 手动执行
前往仓库 → **Actions** → 选择 “Auto Netlib Login Every 14 Days”  
点击 **Run workflow** 即可立即执行登录。

---

## 🧾 日志 & 结果

执行完毕后：
- GitHub Actions 日志中可查看运行状态；
- Telegram 会收到登录状态及截图汇总；
- 登录截图自动保存为 `.png` 文件（仅在运行时有效）。

---

## 🧩 技术栈

- Node.js  
- Playwright  
- Axios  
- Telegram Bot API  
- GitHub Actions

---

## 🧑‍💻 作者

👤 **Ly Cc**  
📫 Telegram 通知版自动登录脚本  
🕓 最近更新：2025-11

---

## ⚠️ 声明

本项目仅供个人学习与自动化研究使用。  
请勿将脚本用于违反网站服务条款或法律法规的用途。  
使用者需自行承担使用本脚本的相关责任。
