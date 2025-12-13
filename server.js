const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// 启用 CORS
app.use(cors());

// 设置 MIME 类型
app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
        res.type('application/javascript');
    } else if (req.path.endsWith('.json')) {
        res.type('application/json');
    }
    next();
});

// 提供静态文件
app.use(express.static(path.join(__dirname)));

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Home.html'));
});

// 为所有 HTML 路由提供正确的 MIME 类型
app.get('*.html', (req, res) => {
    res.type('text/html');
    res.sendFile(path.join(__dirname, req.path));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═════════════════════════════════════════════════════════════╗
║         SwapX Demo 服务器运行中                            ║
╠═════════════════════════════════════════════════════════════╣
║ 服务器地址: http://localhost:${PORT}                       ║
║ 或使用本机IP: http://<your-ip>:${PORT}                    ║
║                                                             ║
║ 可访问的页面:                                              ║
║   • 钱包: http://localhost:${PORT}/Home.html              ║
║   • RWA: http://localhost:${PORT}/RWA.html                ║
║   • 合约: http://localhost:${PORT}/Futures.html           ║
║   • 发现: http://localhost:${PORT}/Discover.html          ║
║   • 兑换: http://localhost:${PORT}/Swap.html              ║
║   • 邀请: http://localhost:${PORT}/Invite.html            ║
║                                                             ║
║ K线图表：使用 Lightweight Charts 库                        ║
║ • RWA 页面：显示 RWA 股票代币的 K 线图                    ║
║ • 合约页面：显示期货合约的 K 线图                         ║
║                                                             ║
║ 按 Ctrl+C 停止服务器                                       ║
╚═════════════════════════════════════════════════════════════╝
    `);
});
