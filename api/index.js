const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// 启用 CORS
app.use(cors());

// 设置 MIME 类型中间件
app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
        res.type('application/javascript');
    } else if (req.path.endsWith('.json')) {
        res.type('application/json');
    } else if (req.path.endsWith('.css')) {
        res.type('text/css');
    }
    next();
});

// 提供静态文件 - 处理 Vercel 的特殊路径
const staticDir = path.join(__dirname, '..');
app.use(express.static(staticDir));

// 主页路由
app.get('/', (req, res) => {
    const filePath = path.join(staticDir, 'Home.html');
    console.log('GET / - Looking for:', filePath);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Home.html not found at ' + filePath);
    }
});

// 为所有 HTML 路由提供正确的 MIME 类型
app.get(/\.html$/, (req, res) => {
    let filePath = path.join(staticDir, req.path);
    // 处理可能的重复路径
    if (filePath.includes('/api/../')) {
        filePath = filePath.replace('/api/../', '/');
    }
    console.log('GET *.html -', req.path, '-> Looking for:', filePath);
    if (fs.existsSync(filePath)) {
        res.type('text/html');
        res.sendFile(filePath);
    } else {
        res.status(404).send('File not found: ' + req.path + ' (looked at: ' + filePath + ')');
    }
});

// 处理 SPA 路由 - 未匹配的路由返回 Home.html
app.get('*', (req, res) => {
    const filePath = path.join(staticDir, 'Home.html');
    console.log('GET * (fallback) -', req.path, '-> returning Home.html at:', filePath);
    if (fs.existsSync(filePath)) {
        res.type('text/html');
        res.sendFile(filePath);
    } else {
        res.status(404).send('Home.html not found at ' + filePath);
    }
});

module.exports = app;
