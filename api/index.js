const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// 启用 CORS
app.use(cors());

// 提供静态文件
app.use(express.static(path.join(__dirname, '..')));

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Home.html'));
});

// 为所有 HTML 路由提供正确的 MIME 类型
app.get('*.html', (req, res) => {
    res.type('text/html');
    res.sendFile(path.join(__dirname, '..', req.path));
});

// 处理 SPA 路由 - 未匹配的路由返回 Home.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Home.html'));
});

module.exports = app;
