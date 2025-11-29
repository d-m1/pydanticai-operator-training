// service worker stuff
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

const API_URL = 'http://localhost:8000/chat';

class MatrixRain {
    constructor() {
        this.canvas = document.getElementById('matrix-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.fontSize = 16;
        this.columns = this.canvas.width / this.fontSize;
        this.drops = [];
        
        for (let i = 0; i < this.columns; i++) {
            this.drops[i] = Math.random() * -100;
        }
    }
    
    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#0F0';
        this.ctx.font = this.fontSize + 'px monospace';
        
        for (let i = 0; i < this.drops.length; i++) {
            const char = this.chars[Math.floor(Math.random() * this.chars.length)];
            const x = i * this.fontSize;
            const y = this.drops[i] * this.fontSize;
            
            this.ctx.fillText(char, x, y);
            
            if (y > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }
            
            this.drops[i]++;
        }
    }
    
    start() {
        this.interval = setInterval(() => this.draw(), 50);
    }
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
    
    restart() {
        this.drops = [];
        for (let i = 0; i < this.columns; i++) {
            this.drops[i] = Math.random() * -100;
        }
    }
}

class MatrixChat {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.chatContainer = document.getElementById('chat-container');
        this.chatHistory = document.getElementById('chat-history');
        this.chatInput = document.getElementById('chat-input');
        this.matrixRain = new MatrixRain();
        this.isWaitingForResponse = false;
        this.sessionId = this.getOrCreateSessionId();
        
        console.log('Matrix Session ID:', this.sessionId);
        this.init();
    }
    
    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('matrix_session_id');
        
        if (!sessionId) {
            sessionId = this.generateUUID();
            localStorage.setItem('matrix_session_id', sessionId);
            console.log('Created new session:', sessionId);
        } else {
            console.log('Restored existing session:', sessionId);
        }
        
        return sessionId;
    }
    
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    init() {
        this.matrixRain.start();
        
        const fullscreenButton = document.getElementById('fullscreen-button');
        fullscreenButton.addEventListener('click', () => {
            this.requestFullscreen();
            setTimeout(() => this.startChat(), 300);
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.loadingScreen.style.display !== 'none') {
                this.requestFullscreen();
                setTimeout(() => this.startChat(), 100);
            }
            
            if (e.key === 'f' && this.loadingScreen.style.display === 'none') {
                this.toggleFullscreen();
            }
            
            if (e.ctrlKey && e.shiftKey && e.key === 'C' && this.loadingScreen.style.display === 'none') {
                this.clearSession();
            }
        });
        
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.isWaitingForResponse) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.chatInput.addEventListener('focus', () => {
            document.getElementById('cursor').style.display = 'none';
        });
        
        this.chatInput.addEventListener('blur', () => {
            if (!this.chatInput.value) {
                document.getElementById('cursor').style.display = 'inline';
            }
            setTimeout(() => {
                if (this.loadingScreen.style.display === 'none') {
                    this.chatInput.focus();
                }
            }, 100);
        });
        
        this.chatContainer.addEventListener('click', () => {
            this.chatInput.focus();
        });
        
        window.addEventListener('focus', () => {
            if (this.loadingScreen.style.display === 'none') {
                this.chatInput.focus();
            }
        });
        
        window.addEventListener('resize', () => {
            this.matrixRain.canvas.width = window.innerWidth;
            this.matrixRain.canvas.height = window.innerHeight;
            this.matrixRain.columns = this.matrixRain.canvas.width / this.matrixRain.fontSize;
            this.matrixRain.drops = [];
            for (let i = 0; i < this.matrixRain.columns; i++) {
                this.matrixRain.drops[i] = Math.random() * -100;
            }
        });
    }
    
    startChat() {
        this.loadingScreen.classList.add('fade-out');
        
        setTimeout(() => {
            this.loadingScreen.style.display = 'none';
            this.matrixRain.stop();
            this.chatContainer.style.display = 'flex';
            this.chatInput.focus();
        }, 500);
    }
    
    async restartApp() {
        this.chatContainer.style.display = 'none';
        document.body.style.backgroundColor = 'black';
        
        const knockMsg = document.createElement('div');
        knockMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #0f0; font-size: 2em; font-family: "Courier New", monospace; z-index: 9999;';
        knockMsg.textContent = 'Knock, knock, Neo.';
        document.body.appendChild(knockMsg);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        knockMsg.remove();
        this.chatHistory.innerHTML = '';
        this.clearSession();
        
        this.loadingScreen.style.display = 'flex';
        this.loadingScreen.classList.remove('fade-out');
        document.body.style.backgroundColor = '';
        
        this.matrixRain.restart();
        this.matrixRain.start();
    }
    
    requestFullscreen() {
        const elem = document.documentElement;
        
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        } else if (elem.webkitRequestFullscreen) { // Safari
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { // IE11
            elem.msRequestFullscreen();
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            this.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { // Safari
                document.webkitExitFullscreen();
            }
        }
    }
    
    async sendMessage() {
        const message = this.chatInput.value.trim();
        
        if (!message) return;
        
        if (message.toLowerCase() === '/quit') {
            this.chatInput.value = '';
            await this.restartApp();
            return;
        }
        
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        document.getElementById('cursor').style.display = 'inline';
        
        this.isWaitingForResponse = true;
        this.chatInput.disabled = true;
        
        const typingIndicator = this.addTypingIndicator();
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: message,
                    session_id: this.sessionId
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.session_id && data.session_id !== this.sessionId) {
                this.sessionId = data.session_id;
                localStorage.setItem('matrix_session_id', this.sessionId);
                console.log('Session updated:', this.sessionId);
            }
            
            if (data.tokens_used) {
                console.log('Tokens used:', data.tokens_used);
            }
            
            typingIndicator.remove();
            await this.typeMessage(data.response, 'ai');
            
        } catch (error) {
            console.error('Error:', error);
            typingIndicator.remove();
            this.addMessage('Connection to the Matrix failed. Try again.', 'ai');
        } finally {
            this.isWaitingForResponse = false;
            this.chatInput.disabled = false;
            this.chatInput.focus();
        }
    }
    
    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = text;
        this.chatHistory.appendChild(messageDiv);
        this.scrollToBottom();
        return messageDiv;
    }
    
    addTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message typing-indicator';
        indicator.textContent = '...';
        this.chatHistory.appendChild(indicator);
        this.scrollToBottom();
        return indicator;
    }
    
    async typeMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        this.chatHistory.appendChild(messageDiv);
        
        for (let i = 0; i < text.length; i++) {
            messageDiv.textContent += text[i];
            this.scrollToBottom();
            
            const delay = Math.random() * 30 + 20;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    scrollToBottom() {
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
    
    clearSession() {
        localStorage.removeItem('matrix_session_id');
        this.sessionId = this.generateUUID();
        localStorage.setItem('matrix_session_id', this.sessionId);
        
        this.chatHistory.innerHTML = '';
        
        const notification = document.createElement('div');
        notification.className = 'message ai-message';
        notification.textContent = '[Session cleared. The Matrix has been reset.]';
        notification.style.opacity = '0.5';
        this.chatHistory.appendChild(notification);
        
        console.log('Session cleared. New session:', this.sessionId);
        
        fetch(`http://localhost:8000/session/${this.sessionId}/clear`, { method: 'POST' })
            .catch(err => console.log('Could not clear server session:', err));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MatrixChat();
});
