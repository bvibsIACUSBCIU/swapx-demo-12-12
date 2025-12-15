/**
 * WalletManager
 * 修复版：集成 EIP-6963 标准，Vercel 优化版
 * - 完善 EIP-6963 标准支持
 * - 修复 Bitget 检测问题
 * - 添加后端 API 集成
 * - 支持多链网络切换
 */
const WalletManager = {
    state: {
        account: null,
        chainId: null,
        walletName: null,
        provider: null,
        isInitialized: false,
        isConnecting: false
    },

    // 存储通过 EIP-6963 发现的钱包提供商
    // 格式: { [rdns]: { info, provider } }
    discoveredProviders: new Map(),

    // API 基础 URL
    apiBaseUrl: '/api',

    /**
     * 初始化：设置事件监听，不再依赖单纯的定时器
     */
    init: function() {
        if (this.state.isInitialized) return;
        
        console.log("WalletManager 初始化 (EIP-6963 标准模式)...");

        // 1. 设置 EIP-6963 监听器 (解决多钱包冲突和检测不到的问题)
        window.addEventListener('eip6963:announceProvider', (event) => {
            const { info, provider } = event.detail;
            console.log(`📡 发现钱包: ${info.name} (RDNS: ${info.rdns})`);
            this.discoveredProviders.set(info.rdns, { info, provider });
            
            // 更新 UI 中的钱包列表
            this.updateWalletOptions();
        });

        // 2. 主动触发一次发现请求 (通知已安装的钱包宣布自己)
        window.dispatchEvent(new Event('eip6963:requestProvider'));

        // 3. 传统的 window.ethereum 监听 (作为兜底)
        this.setupLegacyListeners();

        // 4. 再次请求，处理延迟注入的钱包
        setTimeout(() => {
            console.log("第二次触发 EIP-6963 请求...");
            window.dispatchEvent(new Event('eip6963:requestProvider'));
        }, 500);

        this.state.isInitialized = true;
    },

    /**
     * 更新钱包选项列表 UI
     */
    updateWalletOptions: function() {
        const walletList = document.getElementById('discoveredWalletList');
        if (!walletList) return;

        // 清空并重建列表
        walletList.innerHTML = '';
        
        this.discoveredProviders.forEach((item, rdns) => {
            const btn = document.createElement('button');
            btn.className = 'wallet-option-btn';
            btn.innerHTML = `<img src="${item.info.icon}" alt="${item.info.name}"> ${item.info.name}`;
            btn.onclick = () => this.connectWallet(item.provider, item.info.name);
            walletList.appendChild(btn);
        });
    },

    /**
     * 设置传统的事件监听 (AccountsChanged, ChainChanged)
     */
    setupLegacyListeners: function() {
        const provider = window.ethereum;
        if (provider && typeof provider.on === 'function') {
            provider.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    // 只有当当前状态是已连接时才自动更新，避免干扰
                    if (this.state.account) {
                        this.updateUI(accounts[0], this.state.walletName || 'Wallet');
                    }
                }
            });
            provider.on('chainChanged', (chainId) => {
                this.state.chainId = chainId;
                console.log('网络已切换:', chainId);
                // 建议刷新页面以避免状态不一致
                // window.location.reload();
            });
        }
    },

    /**
     * 更新 UI 状态
     */
    updateUI: function(account, walletName) {
        if (!account) return;
        
        this.state.account = account;
        this.state.walletName = walletName;
        const shortAddr = account.substring(0, 6) + '...' + account.substring(account.length - 4);
        
        // DOM 操作
        const els = {
            userAddr: document.getElementById('userAddress'),
            walletText: document.getElementById('walletBtnText'),
            statusDot: document.getElementById('walletStatusDot'),
            receiveAddr: document.getElementById('receiveAddress')
        };

        if (els.userAddr) els.userAddr.innerText = shortAddr;
        if (els.receiveAddr) els.receiveAddr.innerText = account;
        if (els.walletText) els.walletText.innerText = walletName;
        if (els.statusDot) els.statusDot.classList.add('connected');

        // 生成二维码
        if (typeof window.generateQRCode === 'function') {
            try { window.generateQRCode(account); } catch (e) { console.warn(e); }
        }

        // 关闭弹窗
        if (typeof window.closeThisModal === 'function') {
            window.closeThisModal('walletConnectModal');
        }

        // 获取余额
        this.fetchBalance(account);
        console.log(`✅ ${walletName} 连接成功: ${account}`);
    },

    disconnect: function() {
        this.state.account = null;
        this.state.provider = null;
        const userAddr = document.getElementById('userAddress');
        const walletText = document.getElementById('walletBtnText');
        const statusDot = document.getElementById('walletStatusDot');
        
        if(userAddr) userAddr.innerText = '0xB4fa...7eB3B3';
        if(walletText) walletText.innerText = '连接钱包';
        if(statusDot) statusDot.classList.remove('connected');

        // 通知后端断开连接
        this.notifyBackendDisconnection();
    },

    /**
     * 通知后端断开连接
     */
    notifyBackendDisconnection: async function() {
        try {
            await fetch(`${this.apiBaseUrl}/wallet/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: this.state.account })
            });
        } catch (error) {
            console.warn('无法通知后端断开连接:', error);
        }
    },

    /**
     * 获取最合适的 Provider
     * @param {string} type - 'MetaMask' | 'Bitget'
     */
    getProvider: function(type) {
        // 1. 优先从 EIP-6963 发现结果中查找
        // MetaMask RDNS 通常是 'io.metamask'
        // Bitget RDNS 通常是 'com.bitget.web3'
        
        if (type === 'MetaMask') {
            // 查找 MetaMask
            for (let [rdns, item] of this.discoveredProviders) {
                if (rdns.includes('metamask') || item.info.name.toLowerCase().includes('metamask')) {
                    console.log('通过 EIP-6963 找到 MetaMask');
                    return item.provider;
                }
            }
            // 兜底：检查 window.ethereum
            if (window.ethereum && window.ethereum.isMetaMask) return window.ethereum;
        } 
        else if (type === 'Bitget') {
            // 查找 Bitget (这是修复 Bitget 检测不到的关键)
            for (let [rdns, item] of this.discoveredProviders) {
                if (rdns.includes('bitget') || item.info.name.toLowerCase().includes('bitget')) {
                    console.log('通过 EIP-6963 找到 Bitget');
                    return item.provider;
                }
            }
            // 兜底：检查传统注入对象
            if (window.bitget) return window.bitget;
            if (window.bitgetWallet) return window.bitgetWallet;
            if (window.ethereum && window.ethereum.isBitget) return window.ethereum;
        }

        return null;
    },

    /**
     * 通用钱包连接方法
     */
    connectWallet: async function(provider, walletName) {
        if (this.state.isConnecting) return;
        
        this.state.isConnecting = true;
        try {
            this.state.provider = provider;
            
            // 请求账户
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            
            if (!accounts || accounts.length === 0) {
                throw new Error('未获取到账户');
            }

            // 获取链 ID
            const chainIdHex = await provider.request({ method: 'eth_chainId' });
            const chainId = parseInt(chainIdHex, 16);
            this.state.chainId = chainId;

            // 调用后端 API 记录连接
            await this.notifyBackendConnection(accounts[0], chainId, walletName);

            // 更新 UI
            this.updateUI(accounts[0], walletName);

            console.log(`✅ ${walletName} 连接成功: ${accounts[0]}`);
        } catch (error) {
            console.error(`${walletName} 连接失败:`, error);
            this.handleConnectionError(error, walletName);
        } finally {
            this.state.isConnecting = false;
        }
    },

    /**
     * 连接 MetaMask
     */
    connectMetamask: async function() {
        // 移动端 Deep Link 处理
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile && !window.ethereum) {
            const dappUrl = window.location.href.split('#')[0];
            const deepLink = `https://metamask.app.link/dapp/${dappUrl.replace(/^https?:\/\//, '')}`;
            window.location.href = deepLink;
            return;
        }

        // 从发现的提供商中查找 MetaMask
        let provider = null;
        for (let [rdns, item] of this.discoveredProviders) {
            if (rdns.includes('metamask') || item.info.name.toLowerCase().includes('metamask')) {
                provider = item.provider;
                break;
            }
        }

        // 兜底：检查 window.ethereum
        if (!provider && window.ethereum && window.ethereum.isMetaMask) {
            provider = window.ethereum;
        }

        if (!provider) {
            const install = confirm('未检测到 MetaMask，是否前往安装？');
            if (install) window.open('https://metamask.io/download/', '_blank');
            return;
        }

        await this.connectWallet(provider, 'MetaMask');
    },

    /**
     * 连接 Bitget Wallet
     */
    connectBitget: async function() {
        // 移动端 Deep Link
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 从发现的提供商中查找 Bitget
        let provider = null;
        for (let [rdns, item] of this.discoveredProviders) {
            if (rdns.includes('bitget') || item.info.name.toLowerCase().includes('bitget')) {
                provider = item.provider;
                break;
            }
        }

        // 兜底：检查传统注入对象
        if (!provider) {
            if (window.bitget) provider = window.bitget;
            else if (window.bitgetWallet) provider = window.bitgetWallet;
            else if (window.ethereum && window.ethereum.isBitget) provider = window.ethereum;
        }

        if (!provider) {
            if (isMobile) {
                const deepLink = `bitget://dapp?url=${encodeURIComponent(window.location.href)}`;
                window.location.href = deepLink;
            } else {
                const install = confirm('未检测到 Bitget Wallet，是否前往安装？');
                if (install) window.open('https://web3.bitget.com/', '_blank');
            }
            return;
        }

        await this.connectWallet(provider, 'Bitget Wallet');
    },

    /**
     * 通知后端钱包连接信息
     */
    notifyBackendConnection: async function(address, chainId, walletName) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/wallet/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    chainId,
                    walletType: walletName
                })
            });

            const data = await response.json();
            if (!data.success) {
                console.warn('后端连接记录失败:', data.error);
            } else {
                console.log('✅ 后端已记录连接:', data.data);
            }
        } catch (error) {
            console.warn('无法连接后端 API:', error);
            // 不要因为后端错误而阻止前端连接
        }
    },

    /**
     * 处理连接错误
     */
    handleConnectionError: function(error, walletName) {
        console.error('Error code:', error.code, 'Message:', error.message);
        
        if (error.code === 4001) {
            alert('❌ 您拒绝了连接请求');
        } else if (error.code === -32002) {
            alert('⏳ 请求已发送，请在钱包中接受');
        } else if (error.message.includes('Non-Error promise rejection')) {
            alert('连接被中断，请重试');
        } else {
            alert(`❌ ${walletName} 连接失败: ${error.message}`);
        }
    },

    /**
     * 模拟连接（测试用）
     */
    mockConnect: function(name) {
        const mockAddress = "0xB4fa56b2b7c6cca9f7a2d5e4f3c2b1a0d9e8f7c6";
        this.updateUI(mockAddress, name + ' (Demo)');
    },

    /**
     * 网络切换
     */
    switchNetwork: async function(chainId) {
        if (!this.state.provider) {
            alert('请先连接钱包');
            return;
        }

        try {
            const chainIdHex = '0x' + chainId.toString(16);
            await this.state.provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainIdHex }]
            });
            
            this.state.chainId = chainId;
            console.log('✅ 网络已切换:', chainId);
        } catch (error) {
            if (error.code === 4902) {
                // 网络不存在，提示用户
                alert('该网络需要手动添加到钱包中');
            } else {
                console.error('网络切换失败:', error);
            }
        }
    },

    /**
     * 获取余额
     */
    fetchBalance: async function(account) {
        if (!this.state.provider || !this.state.provider.request) return;
        try {
            const balanceHex = await this.state.provider.request({
                method: 'eth_getBalance',
                params: [account, 'latest']
            });
            const balance = (parseInt(balanceHex, 16) / 1e18).toFixed(4);
            const totalBalEl = document.getElementById('totalBalance');
            if (totalBalEl) {
                totalBalEl.innerText = `$${(balance * 2500).toFixed(2)}`;
            }

            // 同时调用后端 API 获取平衡数据
            await this.fetchBalanceFromAPI(account);
        } catch (e) {
            console.warn("本地余额获取失败", e);
        }
    },

    /**
     * 从后端 API 获取余额
     */
    fetchBalanceFromAPI: async function(account) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/wallet/balance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: account })
            });
            const data = await response.json();
            console.log('💰 后端返回余额:', data.balances);
        } catch (error) {
            console.warn('无法从后端获取余额:', error);
        }
    }
};

// 页面加载时立即触发初始化
window.addEventListener('load', () => {
    console.log('📱 页面加载完成，初始化 WalletManager');
    WalletManager.init();
    
    // Vercel/浏览器环境下，钱包插件注入可能有延迟，再次请求 EIP-6963
    setTimeout(() => {
        console.log('📡 第二次请求 EIP-6963 提供商...');
        window.dispatchEvent(new Event('eip6963:requestProvider'));
    }, 500);

    // 第三次请求（防止某些浏览器的延迟）
    setTimeout(() => {
        window.dispatchEvent(new Event('eip6963:requestProvider'));
    }, 2000);
});