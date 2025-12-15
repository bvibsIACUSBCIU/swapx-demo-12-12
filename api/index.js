const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// 启用 CORS
app.use(cors());

// 根目录路径
const rootDir = path.join(__dirname, '..');

// 获取 MIME 类型
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.gif': 'image/gif',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

// 中间件：处理所有请求
app.use((req, res, next) => {
    // 忽略 Node.js 内部路径
    if (req.path === '/__express/' || req.path === '/__vscode__/') {
        return res.status(404).send('Not Found');
    }
    next();
});

// 处理所有请求
app.get(/^\/(.*)$/, (req, res) => {
    let reqPath = req.path;
    
    // 如果是根路径，返回 Home.html
    if (reqPath === '/' || reqPath === '') {
        reqPath = '/Home.html';
    }
    
    // 构建完整的文件路径
    const filePath = path.join(rootDir, reqPath);
    
    // 安全检查：防止路径遍历攻击
    const realPath = path.resolve(filePath);
    if (!realPath.startsWith(path.resolve(rootDir))) {
        return res.status(403).send('Forbidden');
    }
    
    console.log('Request:', reqPath, '-> File:', filePath);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
        console.log('File not found:', filePath);
        // 如果文件不存在且是 HTML 请求，返回 Home.html（SPA 路由）
        if (reqPath.endsWith('.html') || !path.extname(reqPath)) {
            const homePath = path.join(rootDir, 'Home.html');
            if (fs.existsSync(homePath)) {
                res.type('text/html; charset=utf-8');
                return res.send(fs.readFileSync(homePath, 'utf-8'));
            }
        }
        return res.status(404).send('Not Found: ' + reqPath);
    }
    
    // 读取文件
    try {
        const mimeType = getMimeType(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        res.type(mimeType);
        res.send(content);
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).send('Internal Server Error');
    }
});

// 处理 POST 等其他方法
app.all('*', (req, res) => {
    res.status(404).send('Not Found');
});

module.exports = app;
