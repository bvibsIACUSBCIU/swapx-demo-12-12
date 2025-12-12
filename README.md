# SwapX Demo - 虚拟服务器运行指南

## 项目说明

SwapX 是一个完整的加密货币交易平台演示，包含以下功能模块：

- **钱包** (Home.html) - 支持 MetaMask 连接，显示代币余额和交易功能
- **RWA** (RWA.html) - 实时股票代币 K 线图表和交易
- **合约** (Futures.html) - 期货合约交易和高级 K 线图表
- **发现** (Discover.html) - DeFi 应用和机会发现
- **兑换** (Swap.html) - 代币兑换功能
- **邀请** (Invite.html) - 邀请和推荐系统

---

## 快速开始

### 1. 环境要求

- **Node.js** >= 14.0
- **npm** >= 6.0

### 2. 安装依赖

在项目目录下运行：

```bash
cd /Users/mark/VSCODE/SwapXdemo12.11
npm install
```

安装后会自动安装以下依赖：
- **express** - Web 服务器框架
- **cors** - 跨域资源共享支持
- **http-server** - 轻量级 HTTP 服务器（可选）

### 3. 启动服务器

#### 方式 1：使用 Express 服务器（推荐）

```bash
npm start
```

启动后将输出：
```
╔═════════════════════════════════════════════════════════════╗
║         SwapX Demo 服务器运行中                            ║
╠═════════════════════════════════════════════════════════════╣
║ 服务器地址: http://localhost:3000                          ║
║ 或使用本机IP: http://<your-ip>:3000                       ║
...
```

#### 方式 2：使用 http-server（轻量级）

```bash
npm run dev
```

或者直接运行：
```bash
npx http-server -p 3000 -c-1
```

### 4. 访问应用

启动后，在浏览器中访问：

| 页面 | URL |
|------|-----|
| **主页** | http://localhost:3000 |
| **钱包** | http://localhost:3000/Home.html |
| **RWA** | http://localhost:3000/RWA.html |
| **合约** | http://localhost:3000/Futures.html |
| **发现** | http://localhost:3000/Discover.html |
| **兑换** | http://localhost:3000/Swap.html |
| **邀请** | http://localhost:3000/Invite.html |

---

## K 线图表说明

### RWA 页面 (RWA.html)

- **图表库**: Lightweight Charts（轻量级，高性能）
- **功能**:
  - 实时 K 线图显示 RWA 股票代币价格走势
  - 支持选择不同的股票代币（AAPL, GOOGL, TSLA, AMZN, MSFT）
  - 点击股票可在详情视图中查看完整 K 线图
  - 生成模拟 K 线数据（100 根 15 分钟 K 线）
  - 自适应窗口大小调整

**关键代码**:
```javascript
// RWA.html 中的初始化函数
function initChart(basePrice) {
    const container = document.getElementById('kline');
    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 400,
        layout: { background: { color: '#ffffff' } }
    });
    
    candleSeries = chart.addCandlestickSeries({
        upColor: '#34c759',
        downColor: '#ff3b30'
    });
    
    const data = generateData(basePrice);
    candleSeries.setData(data);
}
```

### 合约页面 (Futures.html)

- **图表库**: Lightweight Charts（深色主题）
- **功能**:
  - 期货合约 K 线图，支持多个交易对（BTC/USDT, ETH/USDT 等）
  - 实时价格更新（每 3 秒更新一次）
  - 完整的交易界面（买入/卖出）
  - 盘口数据（委托订单簿）
  - 最新成交列表
  - 深色交易界面设计

**关键特性**:
```javascript
// 初始化 K 线图
function initChart() {
    const container = document.getElementById('kline-container');
    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 400,
        layout: { background: { color: '#12161c' } }
    });
    
    // 实时价格更新
    setInterval(() => {
        const newPrice = /* 计算新价格 */;
        candleSeries.update({
            time: last.time + 15 * 60,
            open: last.close,
            high: Math.max(last.close, newPrice),
            low: Math.min(last.close, newPrice),
            close: newPrice
        });
    }, 3000);
}
```

---

## 故障排除

### K 线图不显示

1. **检查 Lightweight Charts 库是否加载**
   ```
   打开浏览器开发者工具 (F12) → Console
   查看是否有错误信息
   ```

2. **清理浏览器缓存**
   ```
   Ctrl+Shift+Delete (Windows) 或 Cmd+Shift+Delete (Mac)
   清除缓存和 Cookie，然后重新刷新页面
   ```

3. **检查容器是否存在**
   - RWA 页面：检查 `<div id="kline">` 是否存在
   - 合约页面：检查 `<div id="kline-container">` 是否存在

### 服务器无法启动

1. **端口被占用**
   ```bash
   # 检查端口 3000 是否被占用
   lsof -i :3000
   
   # 如果被占用，使用其他端口
   PORT=3001 npm start
   ```

2. **权限问题**
   ```bash
   # 确保项目目录有读写权限
   chmod -R 755 /Users/mark/VSCODE/SwapXdemo12.11
   ```

3. **依赖未安装**
   ```bash
   npm install
   npm start
   ```

### MetaMask 连接问题

- 确保安装了 MetaMask 浏览器扩展
- 如果是本地测试，可以使用"模拟连接"按钮

---

## 项目文件结构

```
/Users/mark/VSCODE/SwapXdemo12.11/
├── package.json              # Node.js 项目配置
├── server.js                 # Express 服务器脚本
├── Home.html                 # 钱包页面
├── RWA.html                  # RWA 股票代币页面
├── Futures.html              # 期货合约交易页面
├── Discover.html             # 发现页面
├── Swap.html                 # 代币兑换页面
├── Invite.html               # 邀请系统页面
└── README.md                 # 本文档
```

---

## 开发和自定义

### 修改 K 线图样式

**RWA 页面** - 修改 `LightweightCharts.createChart()` 参数：
```javascript
chart = LightweightCharts.createChart(container, {
    width: container.clientWidth,
    height: 400,
    layout: {
        background: { color: '#ffffff' },  // 背景色
        textColor: '#333',                  // 文字色
    },
});
```

**合约页面** - 修改 K 线样式：
```javascript
candleSeries = chart.addCandlestickSeries({
    upColor: '#0ECB81',          // 涨价颜色（绿）
    downColor: '#F6465D',        // 跌价颜色（红）
    borderUpColor: '#0ECB81',
    borderDownColor: '#F6465D',
});
```

### 修改实时更新频率

在 Futures.html 中，找到以下代码并修改间隔时间：

```javascript
setInterval(() => {
    // 更新逻辑
}, 3000);  // 修改数字（毫秒），3000ms = 3秒
```

### 添加真实数据源

将模拟数据替换为真实 API：

```javascript
// 示例：使用 CoinGecko API 获取实时价格
async function fetchRealPrice() {
    const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
    );
    const data = await response.json();
    return data.bitcoin.usd;
}
```

---

## 技术栈

- **前端框架**: 原生 HTML5 + CSS3 + JavaScript（无框架，轻量级）
- **图表库**: Lightweight Charts（TradingView 官方轻量版）
- **服务器**: Express.js
- **跨域支持**: CORS 中间件
- **钱包集成**: Web3.js + MetaMask
- **UI 组件**: Font Awesome 图标库

---

## 常用命令

```bash
# 启动开发服务器
npm start

# 使用轻量级 HTTP 服务器
npm run dev

# 关闭服务器
# 按 Ctrl+C 退出

# 检查依赖
npm list

# 更新依赖
npm update
```

---

## 注意事项

1. **安全性**: 这是演示项目，不要用于生产环境
2. **数据模拟**: K 线数据和价格都是模拟生成的，不代表真实市场
3. **浏览器支持**: 建议使用最新版 Chrome, Firefox, Safari, Edge
4. **移动端**: 已优化移动端显示，支持触摸交互

---

## 支持的浏览器

| 浏览器 | 版本 | 支持情况 |
|-------|------|--------|
| Chrome | >= 90 | ✅ 完全支持 |
| Firefox | >= 88 | ✅ 完全支持 |
| Safari | >= 14 | ✅ 完全支持 |
| Edge | >= 90 | ✅ 完全支持 |
| IE | 11 | ❌ 不支持 |

---

## 许可证

MIT License

---

## 更新日志

### v1.0.0 (2024年)
- ✅ 虚拟服务器配置完成
- ✅ RWA K线图表实现
- ✅ 合约K线图表实现
- ✅ 底部导航栏图标修复
- ✅ CORS 跨域支持

---

## 联系支持

如有问题，请检查：
1. 终端输出是否有错误信息
2. 浏览器控制台 (F12) 是否有 JavaScript 错误
3. 确保所有依赖已正确安装

---

**祝你使用愉快！** 🚀
