/**
 * 全局 API 客户端
 * 提供与后端 Express 服务器通信的便利方法
 */
class APIClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.timeout = 10000;
    }

    /**
     * 发送 API 请求
     */
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, { ...config, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`API Error [${method} ${url}]:`, error);
            throw error;
        }
    }

    // 便利方法
    get(endpoint, options) {
        return this.request('GET', endpoint, null, options);
    }

    post(endpoint, data, options) {
        return this.request('POST', endpoint, data, options);
    }

    put(endpoint, data, options) {
        return this.request('PUT', endpoint, data, options);
    }

    delete(endpoint, options) {
        return this.request('DELETE', endpoint, null, options);
    }

    // 钱包相关 API
    async connectWallet(address, chainId, walletType) {
        return this.post('/wallet/connect', { address, chainId, walletType });
    }

    async disconnectWallet(address) {
        return this.post('/wallet/disconnect', { address });
    }

    async getBalance(address, tokenAddress = null) {
        return this.post('/wallet/balance', { address, tokenAddress });
    }

    async switchNetwork(chainId, address) {
        return this.post('/wallet/switch-network', { chainId, address });
    }

    // 交易相关 API
    async getSwapQuote(fromToken, toToken, amount) {
        return this.post('/swap/quote', { fromToken, toToken, amount });
    }

    async getTransactionStatus(txHash) {
        return this.get(`/transaction/${txHash}`);
    }

    // 健康检查
    async healthCheck() {
        return this.get('/health');
    }
}

// 全局实例
window.api = new APIClient();

console.log('✅ API 客户端已加载');
