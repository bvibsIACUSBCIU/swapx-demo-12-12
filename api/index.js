import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS Configuration
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
        
        if (!origin || allowedOrigins.includes(origin) || NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Middleware
app.use((req, res, next) => {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
});

// ============================================
// API Routes
// ============================================

/**
 * Health Check Endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        uptime: process.uptime()
    });
});

/**
 * Wallet Connection Endpoint
 * Validates wallet connection and returns network information
 */
app.post('/api/wallet/connect', (req, res) => {
    try {
        const { address, chainId, walletType } = req.body;

        if (!address || !chainId) {
            return res.status(400).json({
                error: 'Missing required fields: address, chainId'
            });
        }

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                error: 'Invalid Ethereum address format'
            });
        }

        // Log connection
        console.log(`📱 Wallet Connected:`, {
            address: address.slice(0, 6) + '...' + address.slice(-4),
            chainId,
            walletType: walletType || 'unknown',
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Wallet connected successfully',
            data: {
                address,
                chainId,
                walletType: walletType || 'unknown',
                networkInfo: getNetworkInfo(chainId),
                features: {
                    swap: true,
                    bridge: true,
                    stake: true,
                    farm: true
                }
            }
        });
    } catch (error) {
        console.error('Wallet connection error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * Wallet Disconnect Endpoint
 */
app.post('/api/wallet/disconnect', (req, res) => {
    const { address } = req.body;
    console.log(`🔌 Wallet Disconnected:`, address?.slice(0, 6) + '...');
    res.json({
        success: true,
        message: 'Wallet disconnected'
    });
});

/**
 * Get Token Balance Endpoint
 */
app.post('/api/wallet/balance', (req, res) => {
    try {
        const { address, tokenAddress } = req.body;

        if (!address) {
            return res.status(400).json({
                error: 'Missing required field: address'
            });
        }

        // Mock balance response (in production, query actual blockchain)
        const mockBalance = {
            ETH: Math.random() * 10,
            USDC: Math.random() * 5000,
            DAI: Math.random() * 3000,
            USDT: Math.random() * 2000
        };

        res.json({
            success: true,
            address,
            balances: mockBalance,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Balance fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch balance',
            message: error.message
        });
    }
});

/**
 * Network Switch Endpoint
 */
app.post('/api/wallet/switch-network', (req, res) => {
    try {
        const { chainId, address } = req.body;

        if (!chainId) {
            return res.status(400).json({
                error: 'Missing required field: chainId'
            });
        }

        console.log(`🔀 Network Switch:`, getNetworkInfo(chainId).name);

        res.json({
            success: true,
            message: `Switched to ${getNetworkInfo(chainId).name}`,
            data: {
                chainId,
                networkInfo: getNetworkInfo(chainId)
            }
        });
    } catch (error) {
        console.error('Network switch error:', error);
        res.status(500).json({
            error: 'Network switch failed',
            message: error.message
        });
    }
});

/**
 * Swap Quote Endpoint (Mock)
 */
app.post('/api/swap/quote', (req, res) => {
    try {
        const { fromToken, toToken, amount } = req.body;

        if (!fromToken || !toToken || !amount) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // Mock swap quote
        const rate = Math.random() * 0.005 + 0.0015;
        const outputAmount = (parseFloat(amount) * rate).toFixed(6);

        res.json({
            success: true,
            data: {
                fromToken,
                toToken,
                inputAmount: amount,
                outputAmount,
                rate: rate.toFixed(8),
                priceImpact: (Math.random() * 0.5).toFixed(2) + '%',
                fee: '0.3%',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Swap quote error:', error);
        res.status(500).json({
            error: 'Failed to get swap quote',
            message: error.message
        });
    }
});

/**
 * Transaction Status Endpoint
 */
app.get('/api/transaction/:txHash', (req, res) => {
    const { txHash } = req.params;

    res.json({
        success: true,
        txHash,
        status: 'pending',
        blockNumber: null,
        confirmations: 0,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Static Files & Fallback Routes
// ============================================

// Serve static files from root directory
const rootDir = dirname(__dirname);
app.use(express.static(rootDir, {
    index: 'Home.html',
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'public, max-age=3600');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
}));

// SPA Fallback - Route all unmatched requests to Home.html
app.get('*', (req, res) => {
    res.sendFile(join(rootDir, 'Home.html'));
});

// ============================================
// Error Handling
// ============================================

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        status: err.status || 500
    });
});

// ============================================
// Server Start
// ============================================

const server = app.listen(PORT, () => {
    console.log('\n╔═════════════════════════════════════════════════════════════╗');
    console.log('║         SwapX Demo 服务器运行中                            ║');
    console.log('╠═════════════════════════════════════════════════════════════╣');
    console.log(`║ 服务器地址: http://localhost:${PORT.toString().padEnd(46)}║`);
    console.log(`║ 环境: ${NODE_ENV.toUpperCase().padEnd(55)}║`);
    console.log('║                                                             ║');
    console.log('║ API 端点:                                                   ║');
    console.log(`║ - POST   /api/wallet/connect                              ║`);
    console.log(`║ - POST   /api/wallet/disconnect                           ║`);
    console.log(`║ - POST   /api/wallet/balance                              ║`);
    console.log(`║ - POST   /api/swap/quote                                  ║`);
    console.log(`║ - GET    /api/health                                      ║`);
    console.log('║                                                             ║');
    console.log('║ 按 Ctrl+C 停止服务器                                       ║');
    console.log('╚═════════════════════════════════════════════════════════════╝\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n📴 正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

// ============================================
// Helper Functions
// ============================================

function getNetworkInfo(chainId) {
    const networks = {
        1: { name: 'Ethereum Mainnet', symbol: 'ETH', rpc: 'https://eth.publicnode.com' },
        137: { name: 'Polygon', symbol: 'MATIC', rpc: 'https://polygon-rpc.com' },
        56: { name: 'BSC', symbol: 'BNB', rpc: 'https://bsc-dataseed.binance.org' },
        8453: { name: 'Base', symbol: 'ETH', rpc: 'https://mainnet.base.org' },
        42161: { name: 'Arbitrum', symbol: 'ETH', rpc: 'https://arb1.arbitrum.io/rpc' },
        11155111: { name: 'Sepolia Testnet', symbol: 'ETH', rpc: 'https://eth-sepolia.g.alchemy.com/v2/demo' },
        97: { name: 'BSC Testnet', symbol: 'BNB', rpc: 'https://data-seed-prebsc-1-a.binance.org' }
    };

    return networks[chainId] || { name: 'Unknown Network', symbol: '?', rpc: '' };
}

export default app;
