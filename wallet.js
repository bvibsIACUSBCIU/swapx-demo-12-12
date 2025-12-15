/**
 * WalletManager
 * 修复版：集成 EIP-6963 标准，解决 Vercel 部署后的连接问题和 Bitget 检测失效问题
 */
const WalletManager = {
    state: {
        account: null,
        chainId: null,
        walletName: null,
        provider: null,
        isInitialized: false
    },

    // 存储通过 EIP-6963 发现的钱包提供商
    // 格式: { [uuid]: { info, provider } }
    discoveredProviders: new Map(),

    /**
     * 初始化：设置事件监听，不再依赖单纯的定时器
     */
    init: function() {
        if (this.state.isInitialized) return;
        
        console.log("WalletManager 初始化 (EIP-6963 Mode)...");

        // 1. 设置 EIP-6963 监听器 (解决多钱包冲突和检测不到的问题)
        window.addEventListener('eip6963:announceProvider', (event) => {
            const { info, provider } = event.detail;
            console.log(`📡 发现钱包: ${info.name} (${info.rdns})`);
            this.discoveredProviders.set(info.rdns, { info, provider });
            
            // 如果是 Bitget，额外做个标记，防止它伪装成 MetaMask 造成混淆
            if (info.rdns === 'com.bitget.web3') {
                this.bitgetProvider = provider;
            }
        });

        // 2. 主动触发一次发现请求 (通知已安装的钱包宣布自己)
        window.dispatchEvent(new Event('eip6963:requestProvider'));

        // 3. 传统的 window.ethereum 监听 (作为兜底)
        this.setupLegacyListeners();

        this.state.isInitialized = true;
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
     * 连接 MetaMask (标准版)
     */
    connectMetamask: async function() {
        // 移动端 Deep Link 处理 (保持不变，因为移动端逻辑不同)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile && !window.ethereum) {
            const dappUrl = window.location.href.split('#')[0]; // 去除 hash 防止干扰
            const deepLink = `https://metamask.app.link/dapp/${dappUrl.replace(/^https?:\/\//, '')}`;
            window.location.href = deepLink;
            return;
        }

        try {
            const provider = this.getProvider('MetaMask');

            if (!provider) {
                const install = confirm('未检测到 MetaMask，是否前往安装？');
                if (install) window.open('https://metamask.io/download/', '_blank');
                return;
            }

            this.state.provider = provider;
            
            // 直接请求，不使用过多的 Promise 包装，防止浏览器拦截弹窗
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            
            if (accounts && accounts.length > 0) {
                const chainId = await provider.request({ method: 'eth_chainId' });
                this.state.chainId = chainId;
                this.updateUI(accounts[0], 'MetaMask');
            }
        } catch (error) {
            console.error('MetaMask 连接失败:', error);
            if (error.code === 4001) {
                alert('您取消了连接');
            } else {
                alert('连接失败，请重试或刷新页面');
            }
        }
    },

    /**
     * 连接 Bitget (修复版)
     */
    connectBitget: async function() {
        // 移动端 Deep Link
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile && !this.getProvider('Bitget')) {
             const deepLink = `bitget://dapp?url=${window.location.href}`;
             window.location.href = deepLink;
             return;
        }

        try {
            const provider = this.getProvider('Bitget');

            if (!provider) {
                const install = confirm('未检测到 Bitget Wallet，是否前往安装？');
                if (install) window.open('https://web3.bitget.com/', '_blank');
                return;
            }

            this.state.provider = provider;
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            
            if (accounts && accounts.length > 0) {
                this.updateUI(accounts[0], 'Bitget Wallet');
            }
        } catch (error) {
            console.error('Bitget 连接失败:', error);
            alert('连接 Bitget 失败: ' + error.message);
        }
    },

    /**
     * 模拟连接
     */
    mockConnect: function(name) {
        const mockAddress = "0xMock" + Math.random().toString(16).substr(2, 36);
        this.updateUI(mockAddress, name);
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
        } catch (e) {
            console.warn("余额获取失败", e);
        }
    }
};

// 页面加载时立即触发初始化，并再次触发以防万一
window.addEventListener('load', () => {
    WalletManager.init();
    // Vercel 环境下，插件注入可能有轻微延迟，再次请求 EIP-6963
    setTimeout(() => {
        window.dispatchEvent(new Event('eip6963:requestProvider'));
    }, 1000);
});