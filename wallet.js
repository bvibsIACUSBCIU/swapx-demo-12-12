/**
 * WalletManager
 * 处理钱包连接、检测和状态更新的核心逻辑
 * 修复：Vercel 部署后的跨域问题、移动端 MetaMask Deep Link 支持
 */
const WalletManager = {
    state: {
        account: null,
        chainId: null,
        walletName: null,
        provider: null,
        isInitialized: false
    },

    // 最多尝试次数和延迟时间
    maxProviderCheckAttempts: 10,
    providerCheckDelay: 500,
    providerCheckCount: 0,

    /**
     * 初始化：页面加载时检测提供商
     * 改进：增加提供商检测重试机制，确保在 Vercel 部署环境下能正确注入
     */
    init: function() {
        if (this.state.isInitialized) return;
        
        console.log("WalletManager 初始化...");
        this.checkProviders();
        
        // 添加延迟重试机制，处理 Vercel 环境下 provider 注入延迟
        if (!window.ethereum && this.providerCheckCount < this.maxProviderCheckAttempts) {
            this.providerCheckCount++;
            setTimeout(() => {
                console.log(`重试检测 Provider (${this.providerCheckCount}/${this.maxProviderCheckAttempts})...`);
                this.init();
            }, this.providerCheckDelay);
            return;
        }
        
        // 监听钱包切换或断开 (仅针对 window.ethereum 标准事件)
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.updateUI(accounts[0], this.state.walletName || 'Wallet');
                }
            });
            
            // 监听网络变化
            window.ethereum.on('chainChanged', (chainId) => {
                this.state.chainId = chainId;
                console.log('网络已切换:', chainId);
            });
        }
        
        this.state.isInitialized = true;
    },

    /**
     * 辅助函数：更新 UI
     * 改进：增加 DOM 元素存在性检查、错误处理
     */
    updateUI: function(account, walletName) {
        if (!account) {
            console.error('无效的账户地址');
            return;
        }
        
        this.state.account = account;
        this.state.walletName = walletName;

        const shortAddr = account.substring(0, 6) + '...' + account.substring(account.length - 4);
        
        // 更新首页显示
        const userAddrEl = document.getElementById('userAddress');
        const walletTextEl = document.getElementById('walletBtnText');
        const statusDotEl = document.getElementById('walletStatusDot');
        
        // 更新收款页显示
        const receiveAddrEl = document.getElementById('receiveAddress');

        // 防御性编程：检查元素是否存在后再操作
        if (userAddrEl) userAddrEl.innerText = shortAddr;
        if (receiveAddrEl) receiveAddrEl.innerText = account;
        if (walletTextEl) walletTextEl.innerText = walletName;
        if (statusDotEl) statusDotEl.classList.add('connected');

        // 调用 Home.html 中的全局二维码生成函数
        if (typeof window.generateQRCode === 'function') {
            try {
                window.generateQRCode(account);
            } catch (e) {
                console.warn('生成二维码失败:', e);
            }
        }

        // 关闭弹窗
        if (typeof window.closeThisModal === 'function') {
            try {
                window.closeThisModal('walletConnectModal');
            } catch (e) {
                console.warn('关闭弹窗失败:', e);
            }
        }

        // 如果是 Bitget，尝试获取余额
        if (walletName === 'Bitget Wallet') {
            this.fetchBalance(account);
        }
        
        console.log(`✅ ${walletName} 连接成功: ${account}`);
    },

    /**
     * 逻辑：断开连接（重置 UI）
     */
    disconnect: function() {
        this.state.account = null;
        document.getElementById('userAddress').innerText = '0xB4fa...7eB3B3'; // 恢复默认或空
        document.getElementById('walletBtnText').innerText = '连接钱包';
        document.getElementById('walletStatusDot').classList.remove('connected');
    },

    /**
     * 连接 MetaMask
     * 改进：添加移动端 Deep Link 支持、超时处理、错误恢复机制
     */
    connectMetamask: async function() {
        try {
            console.log('🔗 尝试连接 MetaMask...');
            
            // 检测是否为移动设备
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // 移动端处理：使用 Deep Link
            if (isMobile && !window.ethereum) {
                console.log('📱 移动设备检测到，使用 Deep Link 调起 MetaMask...');
                
                // MetaMask Deep Link 格式
                // metamask://dapp?url=<encoded_dapp_url>
                const dappUrl = encodeURIComponent(window.location.href);
                const deepLink = `https://metamask.app.link/dapp/${window.location.hostname}${window.location.pathname}`;
                
                // 记录当前URL用于返回
                sessionStorage.setItem('metamaskReturnUrl', window.location.href);
                
                window.location.href = deepLink;
                
                // 备用方案：如果 5 秒内未跳转，给出提示
                setTimeout(() => {
                    if (document.hidden === false) {
                        alert('请在 MetaMask 中打开此页面\n或者在手机上安装 MetaMask App');
                    }
                }, 5000);
                return;
            }
            
            // 桌面端处理
            let provider = null;

            // 1. 尝试从 ethereum.providers 中寻找 (EIP-6963)
            if (window.ethereum && Array.isArray(window.ethereum.providers)) {
                provider = window.ethereum.providers.find(p => p.isMetaMask);
            }
            
            // 2. 默认 ethereum
            if (!provider && window.ethereum && window.ethereum.isMetaMask) {
                provider = window.ethereum;
            }
            
            // 3. 兜底
            if (!provider && window.ethereum) {
                provider = window.ethereum;
            }

            if (!provider) {
                const confirmInstall = confirm('未检测到 MetaMask\n\n是否前往下载 MetaMask？');
                if (confirmInstall) {
                    window.open('https://metamask.io/download/', '_blank');
                }
                return;
            }

            // 检查 provider 是否具有 request 方法
            if (typeof provider.request !== 'function') {
                console.error('MetaMask provider 不具有 request 方法:', provider);
                alert('钱包提供商不支持该操作。请确保 MetaMask 已正确安装。');
                return;
            }

            // 使用 Promise.race 设置超时，处理 Vercel 环境下的提示框延迟
            const connectPromise = provider.request({ method: 'eth_requestAccounts' });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('连接超时，请检查网络')), 30000);
            });

            const accounts = await Promise.race([connectPromise, timeoutPromise]);
            
            if (accounts && accounts.length > 0) {
                // 获取 chainId
                try {
                    const chainId = await provider.request({ method: 'eth_chainId' });
                    this.state.chainId = chainId;
                } catch (e) {
                    console.warn('获取 chainId 失败:', e);
                }
                
                this.updateUI(accounts[0], 'MetaMask');
            }
        } catch (error) {
            console.error('MetaMask 连接错误:', error);
            
            if (error.code === 4001 || error.message?.includes('User rejected')) {
                alert('您已取消连接请求');
            } else if (error.message?.includes('超时')) {
                alert('连接超时，请检查网络连接后重试');
            } else if (error.message?.includes('not a function')) {
                alert('钱包提供商接口不兼容。请更新 MetaMask 到最新版本。');
            } else if (error.message?.includes('provider')) {
                alert('钱包提供商初始化失败，请刷新页面重试');
            } else {
                alert('连接失败: ' + (error.message || '未知错误'));
            }
        }
    },

    /**
     * 连接 Bitget Wallet (重构版)
     * 改进：优化移动端 Deep Link、增加超时处理、改进错误提示
     */
    connectBitget: async function() {
        try {
            console.log('🔗 尝试连接 Bitget Wallet...');
            
            // 1. 移动端处理
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
            
            if (isMobile && !window.bitget && !window.bitgetWallet) {
                console.log('📱 移动设备检测到，尝试 Bitget Deep Link...');
                
                // Bitget Deep Link
                const dappUrl = encodeURIComponent(window.location.href);
                
                if (isIOS) {
                    // iOS Deep Link
                    window.location.href = `bitget://dapp?url=${dappUrl}`;
                } else {
                    // Android Deep Link (通常不需要 URL encoding)
                    window.location.href = `bitget://dapp`;
                }
                
                // 记录返回 URL
                sessionStorage.setItem('bitgetReturnUrl', window.location.href);
                
                // 超时提示
                setTimeout(() => {
                    if (document.hidden === false) {
                        const installMsg = confirm('未能打开 Bitget Wallet\n\n是否前往安装？');
                        if (installMsg) {
                            window.open('https://web3.bitget.com/zh-CN', '_blank');
                        }
                    }
                }, 3000);
                return;
            }

            // 2. 查找 Provider (优先级逻辑优化)
            let provider = null;
            
            // 优先使用官方命名空间
            if (window.bitget) {
                provider = window.bitget;
                console.log('✓ 使用 window.bitget');
            } else if (window.bitgetWallet) {
                provider = window.bitgetWallet;
                console.log('✓ 使用 window.bitgetWallet');
            } else if (window.BG) {
                provider = window.BG;
                console.log('✓ 使用 window.BG');
            } else if (window.ethereum && (window.ethereum.isBitget || window.ethereum.isBitgetWallet)) {
                provider = window.ethereum;
                console.log('✓ 使用 window.ethereum (isBitget)');
            }

            if (!provider) {
                const install = confirm('未检测到 Bitget Wallet 插件。\n是否前往官网下载？');
                if (install) window.open('https://web3.bitget.com/zh-CN', '_blank');
                return;
            }

            // 检查 provider 是否具有 request 方法
            if (typeof provider.request !== 'function') {
                console.error('Provider 不具有 request 方法:', provider);
                alert('钱包提供商不支持该操作。请确保钱包已正确安装。');
                return;
            }

            this.state.provider = provider;

            // 3. 请求连接 (增加超时处理)
            const connectPromise = provider.request({ method: 'eth_requestAccounts' });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('连接超时')), 30000);
            });
            
            const accounts = await Promise.race([connectPromise, timeoutPromise]);
            
            if (accounts && accounts.length > 0) {
                // 获取 chainId
                try {
                    const chainId = await provider.request({ method: 'eth_chainId' });
                    this.state.chainId = chainId;
                } catch (e) {
                    console.warn('获取 chainId 失败:', e);
                }
                
                this.updateUI(accounts[0], 'Bitget Wallet');
            } else {
                alert('未获取到账户地址。');
            }

        } catch (error) {
            console.error('Bitget 连接错误:', error);
            if (error.code === 4001) {
                alert('用户取消了连接请求');
            } else if (error.message?.includes('超时')) {
                alert('连接超时，请检查钱包应用是否正常运行');
            } else if (error.message?.includes('not a function')) {
                alert('钱包提供商接口不兼容。请更新 Bitget Wallet 到最新版本。');
            } else {
                alert('连接出错: ' + (error.message || '未知错误'));
            }
        }
    },

    /**
     * 模拟连接 (用于 OKX, TP 等仅做展示的按钮)
     */
    mockConnect: function(name) {
        // 生成一个模拟地址用于演示
        const mockAddress = "0xMock" + Math.random().toString(16).substr(2, 36);
        this.updateUI(mockAddress, name);
        alert(`${name} 连接成功 (模拟模式)`);
    },

    /**
     * 获取余额 (仅作简单演示)
     */
    fetchBalance: async function(account) {
        if (!this.state.provider) return;
        
        // 检查 provider 是否具有 request 方法
        if (typeof this.state.provider.request !== 'function') {
            console.warn('Provider 不支持 request 方法，跳过余额获取');
            return;
        }
        
        try {
            const balanceHex = await this.state.provider.request({
                method: 'eth_getBalance',
                params: [account, 'latest']
            });
            const balance = (parseInt(balanceHex, 16) / 1e18).toFixed(4);
            
            // 更新 UI
            const totalBalEl = document.getElementById('totalBalance');
            if (totalBalEl) {
                // 假设 ETH 价格 $2500 做个展示
                totalBalEl.innerText = `$${(balance * 2500).toFixed(2)}`;
            }
        } catch (e) {
            console.error("获取余额失败", e);
        }
    },

    /**
     * 诊断工具：检查当前环境有哪些钱包
     */
    checkProviders: function() {
        console.log("=== 钱包环境检测 ===");
        const providers = [];
        if (window.ethereum) providers.push('ethereum');
        if (window.ethereum && window.ethereum.isMetaMask) providers.push('MetaMask');
        if (window.bitget) providers.push('bitget');
        if (window.bitgetWallet) providers.push('bitgetWallet');
        if (window.BG) providers.push('BG');
        console.log("检测到的对象:", providers.join(', '));
    }
};

// 页面加载完成后初始化
window.addEventListener('load', () => {
    // 延迟执行，等待插件注入（Vercel 环境可能需要更长时间）
    setTimeout(() => WalletManager.init(), 800);
});

// 备用初始化机制：DOM Ready 时也尝试初始化
document.addEventListener('DOMContentLoaded', () => {
    // 如果已经初始化，则不重复初始化
    if (!WalletManager.state.isInitialized) {
        setTimeout(() => WalletManager.init(), 500);
    }
});