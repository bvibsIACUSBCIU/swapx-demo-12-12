/**
 * WalletManager
 * 处理钱包连接、检测和状态更新的核心逻辑
 */
const WalletManager = {
    state: {
        account: null,
        chainId: null,
        walletName: null,
        provider: null
    },

    /**
     * 初始化：页面加载时检测提供商
     */
    init: function() {
        console.log("WalletManager 初始化...");
        this.checkProviders();
        
        // 监听钱包切换或断开 (仅针对 window.ethereum 标准事件)
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.updateUI(accounts[0], this.state.walletName || 'Wallet');
                }
            });
        }
    },

    /**
     * 辅助函数：更新 UI
     * 注意：这里直接操作 DOM，保持了原有的 ID 引用
     */
    updateUI: function(account, walletName) {
        this.state.account = account;
        this.state.walletName = walletName;

        const shortAddr = account.substring(0, 6) + '...' + account.substring(account.length - 4);
        
        // 更新首页显示
        const userAddrEl = document.getElementById('userAddress');
        const walletTextEl = document.getElementById('walletBtnText');
        const statusDotEl = document.getElementById('walletStatusDot');
        
        // 更新收款页显示
        const receiveAddrEl = document.getElementById('receiveAddress');

        if (userAddrEl) userAddrEl.innerText = shortAddr;
        if (receiveAddrEl) receiveAddrEl.innerText = account;
        if (walletTextEl) walletTextEl.innerText = walletName;
        if (statusDotEl) statusDotEl.classList.add('connected');

        // 调用 Home.html 中的全局二维码生成函数
        if (typeof window.generateQRCode === 'function') {
            window.generateQRCode(account);
        }

        // 关闭弹窗
        if (typeof window.closeThisModal === 'function') {
            window.closeThisModal('walletConnectModal');
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
     */
    connectMetamask: async function() {
        try {
            console.log('🔗 尝试连接 MetaMask...');
            let provider = null;

            // 1. 尝试从 ethereum.providers 中寻找 (EIP-6963 之前的方式)
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
                alert('未检测到 MetaMask，请先安装插件！');
                return;
            }

            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
                this.updateUI(accounts[0], 'MetaMask');
            }
        } catch (error) {
            console.error(error);
            alert('MetaMask 连接失败: ' + (error.message || error));
        }
    },

    /**
     * 连接 Bitget Wallet (重构版)
     * 修复了原代码在多钱包环境下可能无法准确调起 Bitget 的问题
     */
    connectBitget: async function() {
        try {
            console.log('🔗 尝试连接 Bitget Wallet...');
            
            // 1. 移动端处理
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile && !window.bitget && !window.bitgetWallet) {
                // 如果是移动端且没有注入对象，尝试 Deep Link
                window.location.href = 'bitget://wallet';
                setTimeout(() => {
                     // 如果没有跳转，提示用户
                    alert('请在 Bitget Wallet DApp 浏览器中打开此页面，或安装 APP。');
                }, 1500);
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

            this.state.provider = provider;

            // 3. 请求连接
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            
            if (accounts && accounts.length > 0) {
                this.updateUI(accounts[0], 'Bitget Wallet');
            } else {
                alert('未获取到账户地址。');
            }

        } catch (error) {
            console.error('Bitget 连接错误:', error);
            if (error.code === 4001) {
                alert('用户取消了连接请求');
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
    // 延迟一点执行，等待插件注入
    setTimeout(() => WalletManager.init(), 1000);
});