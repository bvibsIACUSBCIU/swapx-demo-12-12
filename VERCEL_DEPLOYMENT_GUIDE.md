# Vercel 部署问题诊断与解决方案

## 问题分析

您的项目在 Vercel 部署后只有 Home 页能正常显示，其他页面无法显示的原因：

### 1. **Express 服务器不兼容 Vercel**
Vercel 是无服务器平台，不支持传统的 Node.js Express 服务器持续运行。`server.js` 中的代码在 Vercel 上无法执行。

### 2. **静态文件服务问题**
项目使用相对路径链接（`href="Home.html"`），在 Vercel 的静态托管中可能导致路由问题。

### 3. **缺少 Vercel 配置**
项目没有 `vercel.json` 配置文件来正确处理文件路由和静态文件服务。

---

## 解决方案

### 方案 1：纯静态网站部署（推荐 ✅）

如果您的项目**不需要后端 API**，直接部署为静态网站：

#### 步骤：

1. **更新 package.json**
```json
{
  "scripts": {
    "build": "echo 'Static site - no build needed'"
  }
}
```

2. **配置 vercel.json**（已为您创建）
```json
{
  "version": 2,
  "builds": [
    {
      "src": "*.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)\\.html",
      "dest": "/$1.html"
    },
    {
      "src": "/",
      "dest": "/Home.html"
    }
  ]
}
```

3. **更新导航链接**（可选但推荐）
将所有导航链接保持为 `.html` 扩展：
- `<a href="Home.html">` ✅
- `<a href="RWA.html">` ✅
- `<a href="Discover.html">` ✅
- 等等...

4. **删除或忽略 api 文件夹**
在 `.gitignore` 中添加：
```
api/
server.js (在 Vercel 上不需要)
```

### 方案 2：使用 Vercel 函数（如需后端 API）

如果您以后需要后端功能，可以使用 Vercel Serverless Functions：

```javascript
// api/index.js - Vercel 会自动识别
export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Hello from Vercel' });
  }
}
```

---

## 部署步骤

### 使用 Git 部署（推荐）

1. **提交更改**
```bash
git add vercel.json
git commit -m "Add Vercel configuration for static site"
git push origin main
```

2. **在 Vercel 控制面板连接您的 GitHub 仓库**
   - 访问 https://vercel.com/dashboard
   - 点击 "New Project"
   - 选择您的 GitHub 仓库 `swapx-demo-12-12`
   - Vercel 会自动检测配置并部署

3. **或使用 Vercel CLI**
```bash
npm i -g vercel
vercel --prod
```

### 部署后验证

访问以下 URL 确保所有页面都能加载：
- `https://your-domain.vercel.app/` → Home.html
- `https://your-domain.vercel.app/Home.html` → Home.html
- `https://your-domain.vercel.app/RWA.html` → RWA.html
- `https://your-domain.vercel.app/Discover.html` → Discover.html
- `https://your-domain.vercel.app/Futures.html` → Futures.html
- `https://your-domain.vercel.app/Swap.html` → Swap.html
- `https://your-domain.vercel.app/Invite.html` → Invite.html

---

## 常见问题

**Q: 为什么 Home 页能显示，其他页不能？**
A: 因为 `app.get('/')` 路由在 Vercel 上工作，但其他静态文件的 MIME 类型配置在无服务器环境中无效。

**Q: 本地开发如何运行？**
A: 继续使用 `npm start` 运行 Express 服务器。Vercel 部署时会使用 `vercel.json` 配置。

**Q: 可以保留 server.js 吗？**
A: 可以，但在 Vercel 上不会执行。建议仅用于本地开发。

---

## 文件清单

✅ 已为您创建：
- `vercel.json` - Vercel 部署配置
- `api/index.js` - 可选的后端函数（暂不使用）

---

## 下一步

1. 提交 `vercel.json` 到 Git
2. 重新部署到 Vercel
3. 测试所有页面链接
4. 如果需要，在 Vercel 仪表板中重新部署分支

