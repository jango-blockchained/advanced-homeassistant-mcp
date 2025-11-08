/**
 * Aurora Client-Side JavaScript
 * Handles frontend interactions and visualization
 */

// Configuration
const API_BASE = window.location.origin;
let animationEngine = null;
let inputStream = null;

// Initialize canvas
const canvas = document.getElementById('animationCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Form handlers
document.getElementById('mode').addEventListener('change', (e) => {
    const repeatCountGroup = document.getElementById('repeatCountGroup');
    repeatCountGroup.style.display = e.target.value === 'repeat' ? 'block' : 'none';
});

document.getElementById('inputSource').addEventListener('change', (e) => {
    const inputConfigGroup = document.getElementById('inputConfigGroup');
    const inputStatus = document.getElementById('inputStatus');
    
    if (e.target.value !== 'none') {
        inputConfigGroup.style.display = 'block';
        inputStatus.style.display = 'flex';
        document.getElementById('inputSourceName').textContent = e.target.value;
    } else {
        inputConfigGroup.style.display = 'none';
        inputStatus.style.display = 'none';
    }
});

document.getElementById('createSessionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await createSession();
});

// API calls
async function callAPI(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE}/api/aurora/${endpoint}`, options);
        const result = await response.json();
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        alert(`Error: ${error.message}`);
        return { success: false, message: error.message };
    }
}

// Session management functions
async function getInstructions() {
    const result = await callAPI('instructions', 'POST', {});
    
    if (result.success) {
        document.getElementById('instructions').textContent = result.formatted_instructions;
    } else {
        alert('Failed to load instructions: ' + result.message);
    }
}

async function createSession() {
    const sessionId = document.getElementById('sessionId').value;
    const mode = document.getElementById('mode').value;
    const inputSource = document.getElementById('inputSource').value;
    
    const config = {
        sessionId,
        animation: {
            name: document.getElementById('animationName').value,
            duration: parseInt(document.getElementById('duration').value),
            mode,
            easing: document.getElementById('easing').value,
            autoStart: document.getElementById('autoStart').checked
        }
    };
    
    if (mode === 'repeat') {
        config.animation.repeatCount = parseInt(document.getElementById('repeatCount').value);
    }
    
    if (inputSource !== 'none') {
        config.input = {
            source: inputSource,
            bufferMode: document.getElementById('bufferMode').value
        };
        
        // Request permissions for input sources
        if (inputSource === 'microphone') {
            const granted = await requestMicrophonePermission();
            if (!granted) {
                alert('Microphone permission denied. Animation will run without audio input.');
                delete config.input;
            }
        } else if (inputSource === 'screen') {
            const granted = await requestScreenPermission();
            if (!granted) {
                alert('Screen capture permission denied. Animation will run without screen input.');
                delete config.input;
            }
        }
    }
    
    const result = await callAPI('create', 'POST', config);
    
    if (result.success) {
        alert(`Session created successfully: ${result.sessionId}`);
        
        // Start local visualization
        startVisualization(config);
        
        // Refresh session list
        await listSessions();
    } else {
        alert('Failed to create session: ' + result.message);
    }
}

async function startSession() {
    const sessionId = document.getElementById('controlSessionId').value;
    if (!sessionId) {
        alert('Please enter a session ID');
        return;
    }
    
    const result = await callAPI('start', 'POST', { sessionId });
    
    if (result.success) {
        alert(result.message);
        await listSessions();
    } else {
        alert('Failed to start session: ' + result.message);
    }
}

async function stopSession() {
    const sessionId = document.getElementById('controlSessionId').value;
    if (!sessionId) {
        alert('Please enter a session ID');
        return;
    }
    
    const result = await callAPI('stop', 'POST', { sessionId });
    
    if (result.success) {
        alert(result.message);
        
        // Stop local visualization
        stopVisualization();
        
        await listSessions();
    } else {
        alert('Failed to stop session: ' + result.message);
    }
}

async function pauseSession() {
    const sessionId = document.getElementById('controlSessionId').value;
    if (!sessionId) {
        alert('Please enter a session ID');
        return;
    }
    
    const result = await callAPI('pause', 'POST', { sessionId });
    
    if (result.success) {
        alert(result.message);
        await listSessions();
    } else {
        alert('Failed to pause session: ' + result.message);
    }
}

async function resumeSession() {
    const sessionId = document.getElementById('controlSessionId').value;
    if (!sessionId) {
        alert('Please enter a session ID');
        return;
    }
    
    const result = await callAPI('resume', 'POST', { sessionId });
    
    if (result.success) {
        alert(result.message);
        await listSessions();
    } else {
        alert('Failed to resume session: ' + result.message);
    }
}

async function getSessionState() {
    const sessionId = document.getElementById('controlSessionId').value;
    if (!sessionId) {
        alert('Please enter a session ID');
        return;
    }
    
    const result = await callAPI('state', 'POST', { sessionId });
    
    if (result.success) {
        const state = result.state;
        const info = `Session: ${result.sessionId}\n` +
                    `Active: ${state.active}\n` +
                    `Current Frame: ${state.currentFrame}\n` +
                    `Total Frames: ${state.totalFrames}\n` +
                    `Iteration: ${state.currentIteration}\n` +
                    `Input Active: ${state.inputActive}`;
        alert(info);
    } else {
        alert('Failed to get session state: ' + result.message);
    }
}

async function listSessions() {
    const result = await callAPI('list', 'POST', {});
    
    if (result.success) {
        const sessionsDiv = document.getElementById('sessionsList');
        
        if (result.sessions.length === 0) {
            sessionsDiv.innerHTML = '<p style="opacity: 0.6; text-align: center; padding: 20px;">No active sessions. Create one to get started!</p>';
        } else {
            sessionsDiv.innerHTML = result.sessions.map(session => `
                <div class="session-item">
                    <div class="session-header">
                        <span class="session-name">${session.sessionId}</span>
                        <span class="status-indicator ${session.state.active ? 'status-active' : 'status-inactive'}"></span>
                    </div>
                    <div class="session-stats">
                        <span>Frame: ${session.state.currentFrame}</span>
                        <span>Total: ${session.state.totalFrames}</span>
                        <span>Iteration: ${session.state.currentIteration}</span>
                        <span>Input: ${session.state.inputActive ? '✓' : '✗'}</span>
                    </div>
                </div>
            `).join('');
        }
    } else {
        alert('Failed to list sessions: ' + result.message);
    }
}

async function stopAllSessions() {
    if (!confirm('Are you sure you want to stop all sessions?')) {
        return;
    }
    
    const result = await callAPI('stopAll', 'POST', {});
    
    if (result.success) {
        alert(result.message);
        stopVisualization();
        await listSessions();
    } else {
        alert('Failed to stop all sessions: ' + result.message);
    }
}

// Permission requests
async function requestMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        inputStream = stream;
        return true;
    } catch (error) {
        console.error('Microphone permission denied:', error);
        return false;
    }
}

async function requestScreenPermission() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        inputStream = stream;
        return true;
    } catch (error) {
        console.error('Screen permission denied:', error);
        return false;
    }
}

// Visualization engine
function startVisualization(config) {
    if (animationEngine) {
        stopVisualization();
    }
    
    const showStats = document.getElementById('showStats').checked;
    const showWaveform = document.getElementById('showWaveform').checked;
    const showParticles = document.getElementById('showParticles').checked;
    
    let startTime = Date.now();
    let frame = 0;
    
    function animate() {
        if (!animationEngine) return;
        
        const elapsed = Date.now() - startTime;
        const progress = (elapsed % config.animation.duration) / config.animation.duration;
        const iteration = Math.floor(elapsed / config.animation.duration);
        
        // Check if should stop (for non-endless modes)
        if (config.animation.mode === 'once' && iteration >= 1) {
            stopVisualization();
            return;
        }
        
        if (config.animation.mode === 'repeat' && 
            config.animation.repeatCount && 
            iteration >= config.animation.repeatCount) {
            stopVisualization();
            return;
        }
        
        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw visualization
        drawVisualization(progress, frame, showWaveform, showParticles);
        
        // Draw stats
        if (showStats) {
            drawStats(frame, iteration, progress);
        }
        
        frame++;
        animationEngine = requestAnimationFrame(animate);
    }
    
    animationEngine = requestAnimationFrame(animate);
}

function stopVisualization() {
    if (animationEngine) {
        cancelAnimationFrame(animationEngine);
        animationEngine = null;
    }
    
    if (inputStream) {
        inputStream.getTracks().forEach(track => track.stop());
        inputStream = null;
    }
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVisualization(progress, frame, showWaveform, showParticles) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Rotating circle
    const radius = 50 + Math.sin(progress * Math.PI * 2) * 20;
    const rotation = progress * Math.PI * 2;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    
    // Gradient circle
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, `hsla(${progress * 360}, 100%, 50%, 0.8)`);
    gradient.addColorStop(1, `hsla(${(progress * 360 + 180) % 360}, 100%, 50%, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Waveform
    if (showWaveform) {
        ctx.strokeStyle = `hsla(${progress * 360}, 100%, 70%, 0.6)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let x = 0; x < canvas.width; x += 5) {
            const y = centerY + Math.sin((x / canvas.width + progress) * Math.PI * 4) * 30;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }
    
    // Particles
    if (showParticles) {
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount + progress) * Math.PI * 2;
            const distance = 100 + Math.sin(progress * Math.PI * 2 + i) * 50;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            const size = 2 + Math.sin(progress * Math.PI * 2 + i) * 2;
            
            ctx.fillStyle = `hsla(${(i / particleCount * 360 + progress * 360) % 360}, 100%, 50%, 0.6)`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawStats(frame, iteration, progress) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    
    const stats = [
        `Frame: ${frame}`,
        `Iteration: ${iteration}`,
        `Progress: ${(progress * 100).toFixed(1)}%`,
        `FPS: ${Math.round(1000 / 16)}` // Approximate
    ];
    
    stats.forEach((stat, i) => {
        ctx.fillText(stat, 10, 20 + i * 20);
    });
}

// Auto-refresh sessions every 5 seconds
setInterval(() => {
    if (document.getElementById('sessionsList').children.length > 0) {
        listSessions();
    }
}, 5000);

// Initial load
console.log('Aurora Client initialized');
