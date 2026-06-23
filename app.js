// DOM Elements
const headerConnectBtn = document.getElementById('header-connect-btn');
const heroConnectBtn = document.getElementById('hero-connect-btn');
const headerActionContainer = document.getElementById('header-action-container');
const heroSection = document.getElementById('hero-section');
const dashboardSection = document.getElementById('dashboard-section');

const walletAddressEl = document.getElementById('wallet-address');
const walletBalanceEl = document.getElementById('wallet-balance');
const networkNameEl = document.getElementById('network-name');
const copyAddressBtn = document.getElementById('copy-address-btn');
const disconnectBtn = document.getElementById('disconnect-btn');

const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalActionBtn = document.getElementById('modal-action-btn');

const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

const mainHeader = document.getElementById('main-header');

// State Variables
let currentAccount = null;
let currentChainId = null;
const STORAGE_KEY = 'stellar_wallet_connected_state';

// ----------------------------------------------------
// UI Navigation / Scroll Effects
// ----------------------------------------------------
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    mainHeader.classList.add('scrolled');
  } else {
    mainHeader.classList.remove('scrolled');
  }
});

// ----------------------------------------------------
// Toast Notification Helper
// ----------------------------------------------------
function showToast(message, type = 'success') {
  toastMessage.textContent = message;
  
  // Reset classes
  toast.className = 'toast';
  
  // Add status class
  if (type === 'success') {
    toast.classList.add('toast-success');
    toast.querySelector('.toast-icon').textContent = '✓';
  } else if (type === 'error') {
    toast.classList.add('toast-error');
    toast.querySelector('.toast-icon').textContent = '✕';
  } else {
    toast.classList.add('toast-info');
    toast.querySelector('.toast-icon').textContent = 'ℹ';
  }
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ----------------------------------------------------
// Modal Dialog Helper
// ----------------------------------------------------
function showModal(title, message, btnText = 'Close', btnLink = null) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  
  if (btnLink) {
    modalActionBtn.style.display = 'inline-flex';
    modalActionBtn.textContent = btnText;
    modalActionBtn.href = btnLink;
    modalCloseBtn.textContent = 'Cancel';
  } else {
    modalActionBtn.style.display = 'none';
    modalCloseBtn.textContent = btnText;
  }
  
  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
}

modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ----------------------------------------------------
// Web3 Wallet Connection Logic
// ----------------------------------------------------

// Chain mapping to friendly names
const CHAIN_MAP = {
  '0x1': 'Ethereum Mainnet',
  '0xaa36a7': 'Sepolia Testnet',
  '0x5': 'Goerli Testnet',
  '0x89': 'Polygon Mainnet',
  '0x13881': 'Polygon Mumbai',
  '0xa4b1': 'Arbitrum One',
  '0xa': 'Optimism Mainnet',
  '0x38': 'BNB Smart Chain',
  '0x539': 'Hardhat / Localhost'
};

// Check if MetaMask is installed
function isMetaMaskInstalled() {
  return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
}

// Connect Wallet Action
async function connectWallet() {
  if (!isMetaMaskInstalled()) {
    showModal(
      'MetaMask Required',
      'We could not detect MetaMask in your browser. Install the browser extension to connect your wallet and continue the Stellar Journey.',
      'Install MetaMask',
      'https://metamask.io/download/'
    );
    return;
  }

  try {
    // Request accounts
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts.length > 0) {
      handleAccountsChanged(accounts);
      localStorage.setItem(STORAGE_KEY, 'connected');
      showToast('Wallet connected successfully!', 'success');
    }
  } catch (err) {
    if (err.code === 4001) {
      // User rejected request
      showToast('Connection request rejected.', 'error');
    } else {
      console.error(err);
      showToast('Error connecting to MetaMask.', 'error');
    }
  }
}

// Disconnect Wallet (simulated)
function disconnectWallet() {
  currentAccount = null;
  localStorage.setItem(STORAGE_KEY, 'disconnected');
  updateUI(false);
  showToast('Wallet disconnected.', 'info');
}

// Handle Accounts Changed
function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // User disconnected all accounts in MetaMask
    disconnectWallet();
  } else if (accounts[0] !== currentAccount) {
    currentAccount = accounts[0];
    updateUI(true);
    fetchWalletBalance(currentAccount);
    fetchNetworkDetails();
  }
}

// Fetch balance from provider
async function fetchWalletBalance(account) {
  if (!account) return;
  try {
    const hexBalance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [account, 'latest']
    });
    
    // Parse Balance safely using BigInt to prevent precision loss
    const wei = BigInt(hexBalance);
    // Convert Wei to Eth (divide by 10^18)
    const ethBalance = (Number(wei / 100000000000000n) / 10000).toFixed(4);
    
    walletBalanceEl.textContent = ethBalance;
    
    // Dynamically update the Quest 2 progress based on balance
    const quest2 = document.getElementById('quest-2');
    const quest2Status = quest2.querySelector('.quest-status');
    if (Number(ethBalance) > 0.001) {
      quest2.className = 'timeline-item completed';
      quest2Status.textContent = 'Completed';
    } else {
      quest2.className = 'timeline-item active';
      quest2Status.textContent = 'In Progress';
    }
  } catch (err) {
    console.error('Error fetching balance:', err);
    walletBalanceEl.textContent = '---';
  }
}

// Fetch network details
async function fetchNetworkDetails() {
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    handleChainChanged(chainId);
  } catch (err) {
    console.error('Error fetching network:', err);
    networkNameEl.textContent = 'Unknown';
  }
}

// Handle Chain / Network Changed
function handleChainChanged(chainId) {
  currentChainId = chainId;
  const networkName = CHAIN_MAP[chainId] || `Chain ${parseInt(chainId, 16)}`;
  networkNameEl.textContent = networkName;
}

// Format wallet address for UI
function formatAddress(address) {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Update UI view states
function updateUI(isConnected) {
  if (isConnected && currentAccount) {
    // Show Dashboard, Hide Hero
    heroSection.style.opacity = '0';
    heroSection.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
      heroSection.style.display = 'none';
      dashboardSection.style.display = 'block';
      
      // Trigger reflow for animation
      dashboardSection.offsetHeight; 
      dashboardSection.classList.add('active');
    }, 450);

    // Update Wallet Info
    walletAddressEl.textContent = currentAccount;
    
    // Replace Header Connect Button with Connected Address Pill
    headerActionContainer.innerHTML = `
      <div style="display: flex; gap: 0.75rem; align-items: center;">
        <div class="address-box" style="padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; background: rgba(0, 240, 255, 0.06); border-color: rgba(0, 240, 255, 0.2);">
          <span style="color: var(--color-stellar); font-weight: 600; margin-right: 0.5rem;">●</span>
          <span>${formatAddress(currentAccount)}</span>
        </div>
        <button id="header-disconnect-btn" class="btn btn-disconnect" style="padding: 0.5rem 1rem; margin-top: 0; font-size: 0.85rem; border-radius: 8px; width: auto;">
          Disconnect
        </button>
      </div>
    `;
    
    // Add header disconnect listener
    document.getElementById('header-disconnect-btn').addEventListener('click', disconnectWallet);
  } else {
    // Show Hero, Hide Dashboard
    dashboardSection.classList.remove('active');
    
    setTimeout(() => {
      dashboardSection.style.display = 'none';
      heroSection.style.display = 'flex';
      
      // Trigger reflow
      heroSection.offsetHeight;
      heroSection.style.opacity = '1';
      heroSection.style.transform = 'translateY(0)';
    }, 450);

    // Restore Header Connect Button
    headerActionContainer.innerHTML = `
      <button id="header-connect-btn" class="btn btn-primary btn-connect-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
        Connect Wallet
      </button>
    `;
    
    // Reattach listener
    document.getElementById('header-connect-btn').addEventListener('click', connectWallet);
  }
}

// Auto-connect check if already authorized and state is 'connected'
async function checkPreviousConnection() {
  if (isMetaMaskInstalled() && localStorage.getItem(STORAGE_KEY) === 'connected') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        handleAccountsChanged(accounts);
      }
    } catch (err) {
      console.error('Error auto-connecting:', err);
    }
  }
}

// Setup Event Listeners
heroConnectBtn.addEventListener('click', connectWallet);
headerConnectBtn.addEventListener('click', connectWallet);
disconnectBtn.addEventListener('click', disconnectWallet);

// Copy address to clipboard
copyAddressBtn.addEventListener('click', () => {
  if (currentAccount) {
    navigator.clipboard.writeText(currentAccount)
      .then(() => showToast('Address copied to clipboard!', 'success'))
      .catch(() => showToast('Failed to copy address.', 'error'));
  }
});

// MetaMask Provider Events
if (isMetaMaskInstalled()) {
  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('chainChanged', (chainId) => {
    handleChainChanged(chainId);
    if (currentAccount) {
      fetchWalletBalance(currentAccount);
    }
    showToast('Network changed.', 'info');
  });
}

// Check connection on page load
checkPreviousConnection();


// ----------------------------------------------------
// Background Canvas Starfield (Interactive)
// ----------------------------------------------------
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

let stars = [];
const STAR_COUNT = 120;
let mouse = { x: null, y: null, radius: 150 };

// Resize canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initStars();
}

// Star Class
class Star {
  constructor() {
    this.reset();
    // Spawn randomly on load
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.radius = Math.random() * 1.5 + 0.5;
    this.baseOpacity = Math.random() * 0.7 + 0.3;
    this.opacity = this.baseOpacity;
    this.twinkleSpeed = Math.random() * 0.02 + 0.005;
    this.twinkleDir = 1;
    this.speedX = (Math.random() - 0.5) * 0.15;
    this.speedY = (Math.random() - 0.5) * 0.15;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    // Constrain within screen bounds
    if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
      this.reset();
    }

    // Twinkle effect
    this.opacity += this.twinkleSpeed * this.twinkleDir;
    if (this.opacity >= 1) {
      this.twinkleDir = -1;
    } else if (this.opacity <= 0.1) {
      this.twinkleDir = 1;
    }

    // Mouse interactive gravity/displacement
    if (mouse.x !== null && mouse.y !== null) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < mouse.radius) {
        // Star gently shifts away from mouse
        const force = (mouse.radius - dist) / mouse.radius;
        this.x += (dx / dist) * force * 1.2;
        this.y += (dy / dist) * force * 1.2;
      }
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    
    // Add subtle glow to larger stars
    if (this.radius > 1.2) {
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#00f0ff';
    } else {
      ctx.shadowBlur = 0;
    }
    
    ctx.fill();
  }
}

function initStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push(new Star());
  }
}

function animateStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  stars.forEach(star => {
    star.update();
    star.draw();
  });

  // Reset shadow for subsequent canvas draws if any
  ctx.shadowBlur = 0;
  
  requestAnimationFrame(animateStars);
}

// Mouse events for canvas interactivity
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = null;
  mouse.y = null;
});

// Initialize canvas
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animateStars();
