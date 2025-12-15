#!/bin/bash
# SwapX Demo - 快速启动脚本

echo "╔═════════════════════════════════════════════════════════════╗"
echo "║          SwapX Demo - 快速启动助手                         ║"
echo "╚═════════════════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"
echo ""

# 进入项目目录
cd "$(dirname "$0")"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
    echo ""
fi

echo "╔─────────────────────────────────────────────────────────────╗"
echo "║                    开发服务器启动                           ║"
echo "╠─────────────────────────────────────────────────────────────╣"
echo "║                                                             ║"
echo "║ 访问地址: http://localhost:3000                            ║"
echo "║ API 文档: http://localhost:3000/api/health                ║"
echo "║                                                             ║"
echo "║ 页面路由:                                                   ║"
echo "║ - http://localhost:3000/Home.html        (钱包)            ║"
echo "║ - http://localhost:3000/Swap.html        (兑换)            ║"
echo "║ - http://localhost:3000/Futures.html     (期货)            ║"
echo "║ - http://localhost:3000/RWA.html         (RWA)             ║"
echo "║ - http://localhost:3000/Discover.html    (发现)            ║"
echo "║                                                             ║"
echo "║ 按 Ctrl+C 停止服务器                                       ║"
echo "║                                                             ║"
echo "╚─────────────────────────────────────────────────────────────╝"
echo ""

npm start
