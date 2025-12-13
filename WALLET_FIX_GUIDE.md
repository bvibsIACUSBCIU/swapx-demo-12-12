# 钱包连接 BUG 修复指南

## 修复内容

### 1. Vercel 部署环境下的钱包连接问题

**问题描述**：
- 部署到 Vercel 后，钱包 Provider（如 MetaMask、Bitget）无法正确注入
- 连接时出现超时或无反应

**解决方案**：
- ✅ 添加 Provider 注入延迟重试机制（最多重试 10 次，每次延迟 500ms）
- ✅ 在 `DOMContentLoaded` 和 `load` 事件中双重初始化
- ✅ 为 RPC 调用添加 30 秒超时保护
- ✅ 更新 `vercel.json` 配置，禁用缓存确保每次获取最新代码

**相关代码**：
```javascript
// wallet.js 中的初始化机制
maxProviderCheckAttempts: 10,  // 最多重试次数
providerCheckDelay: 500,       // 每次重试延迟（毫秒）
```

### 2. 移动端 MetaMask 连接优化

**问题描述**：
- 移动设备上无法调起 MetaMask 钱包应用
- 用户体验不佳

**解决方案**：
- ✅ 实现 MetaMask Deep Link：`https://metamask.app.link/dapp/{domain}`
- ✅ 自动检测移动设备并在未安装钱包时给出友好提示
- ✅ 添加 5 秒超时提示，如果未能跳转则提示用户

**Deep Link 格式**：
```
https://metamask.app.link/dapp/{your-domain.com}
```

### 3. 移动端 Bitget 钱包连接优化

**问题描述**：
- 移动端 Bitget Deep Link 调用不稳定

**解决方案**：
- ✅ 区分 iOS 和 Android 设备，使用对应的 Deep Link 格式
- ✅ iOS: `bitget://dapp?url={encoded_url}`
- ✅ Android: `bitget://dapp`
- ✅ 改进超时提示和错误处理

### 4. 增强的错误处理

**改进内容**：
- ✅ 为所有异步操作添加 `Promise.race` 超时保护（30秒）
- ✅ 区分不同的错误类型并给出相应提示
- ✅ 添加详细的控制台日志便于调试

**错误类型处理**：
```javascript
- 用户取消 (code 4001)
- 连接超时
- Provider 初始化失败
- 网络连接问题
```

## 更新的文件

### wallet.js
- 完全重写连接逻辑
- 添加 Vercel 环境适配
- 增强移动端支持
- 改进错误处理

### vercel.json
- 添加 Cache-Control headers（禁用缓存）
- 配置 Access-Control 头
- 优化路由配置

## 测试清单

### 桌面端测试
- [ ] Chrome/Firefox 上 MetaMask 连接
- [ ] Bitget 插件连接
- [ ] 切换钱包账户
- [ ] 页面刷新后状态保持

### 移动端测试 (iOS)
- [ ] MetaMask App 已安装时的 Deep Link 调起
- [ ] MetaMask App 未安装时的提示和下载链接
- [ ] 从 MetaMask 返回应用后能正常连接

### 移动端测试 (Android)
- [ ] 同上（iOS 测试项）
- [ ] Bitget App 连接
- [ ] 物理返回键测试

### Vercel 部署测试
- [ ] 部署后刷新页面多次
- [ ] 清除浏览器缓存后测试
- [ ] 不同网络环境下测试（Wi-Fi、4G）

## 使用建议

1. **本地开发**：
   ```bash
   # 启动本地服务器
   node server.js
   # 访问 http://localhost:3000
   ```

2. **Vercel 部署**：
   ```bash
   git add -A
   git commit -m "Fix wallet connection for Vercel deployment"
   git push
   # Vercel 自动部署
   ```

3. **调试**：
   - 打开浏览器开发者工具 (F12)
   - 查看 Console 标签页的日志输出
   - 搜索 "🔗" 或 "✅" 等 emoji 标记的日志

## 故障排除

### 问题：连接后没有反应
- [ ] 检查浏览器控制台是否有错误
- [ ] 确认钱包插件已正确安装
- [ ] 尝试硬刷新 (Ctrl+Shift+R 或 Cmd+Shift+R)
- [ ] 检查网络连接

### 问题：移动端无法调起钱包
- [ ] 确认钱包应用已安装
- [ ] 检查 Deep Link URL 是否正确
- [ ] 在浏览器地址栏手动测试 Deep Link

### 问题：Vercel 部署后仍无法连接
- [ ] 清除 Vercel 缓存并重新部署
- [ ] 检查 vercel.json 配置是否正确
- [ ] 等待 24 小时让 DNS 缓存过期

## 相关文档

- [MetaMask 官方文档](https://docs.metamask.io/)
- [Bitget Wallet 文档](https://docs.bitget.com/)
- [Vercel 部署指南](https://vercel.com/docs)
- [EIP-6963: 多钱包支持](https://eips.ethereum.org/EIPS/eip-6963)
