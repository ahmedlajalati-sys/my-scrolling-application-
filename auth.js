// ========== AUTHENTICATION ==========

// ========== TOAST FUNCTION ==========
function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}


let currentUser = null;
let authToken = localStorage.getItem('token');

async function register(username, email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('token', authToken);
            currentUser = data.user;
            showToast('✅ Account created successfully!');
            return true;
        } else {
            showToast(data.error || 'Registration failed');
            return false;
        }
    } catch (error) {
        showToast('Network error');
        return false;
    }
}

async function login(username, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('token', authToken);
            currentUser = data.user;
            showToast('✅ Login successful!');
            return true;
        } else {
            showToast(data.error || 'Login failed');
            return false;
        }
    } catch (error) {
        showToast('Network error');
        return false;
    }
}

async function fetchUserProfile(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (response.ok) return data;
        return null;
    } catch (error) {
        return null;
    }
}

async function updateUserProfile(updates) {
    try {
        const response = await fetch(`${API_URL}/users/${currentUser?.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updates)
        });
        const data = await response.json();
        if (response.ok) {
            currentUser = data;
            showToast('✅ Profile updated!');
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function followUser(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}/follow`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (response.ok) {
            return data.following;
        }
        return null;
    } catch (error) {
        return null;
    }
}

function logout() {
    localStorage.removeItem('token');
    authToken = null;
    currentUser = null;
    window.location.href = 'login.html';
}

// Handle login page
if (document.getElementById('loginBtn')) {
    let isSignup = false;
    
    document.getElementById('loginBtn').onclick = async () => {
        const username = document.getElementById('loginUsername').value.trim();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !email || !password) {
            showToast('All fields are required');
            return;
        }
        
        let success;
        if (isSignup) {
            success = await register(username, email, password);
        } else {
            success = await login(username, password);
        }
        
        if (success) {
            window.location.href = 'index.html';
        }
    };
    
    document.getElementById('toggleAuth').onclick = () => {
        isSignup = !isSignup;
        document.getElementById('loginBtn').innerText = isSignup ? 'Sign Up' : 'Login';
        document.getElementById('toggleAuth').innerHTML = isSignup ? 
            '<span>🔐 Already have an account? Login</span>' : 
            '<span>➕ Create New Account</span>';
    };
    
    document.getElementById('googleBtn').onclick = () => {
        showToast('Google login coming soon!');
    };
    
    // Language selector
    if (document.getElementById('languageSelect')) {
        document.getElementById('languageSelect').value = currentLanguage;
        document.getElementById('languageSelect').onchange = (e) => {
            setLanguage(e.target.value);
        };
    }
}

// Check if user is logged in
if (window.location.pathname.includes('index.html') || 
    window.location.pathname.includes('profile.html') ||
    window.location.pathname.includes('reels.html') ||
    window.location.pathname.includes('settings.html') ||
    window.location.pathname.includes('messages.html')) {
    
    if (!authToken) {
        window.location.href = 'login.html';
    } else {
        // Fetch current user
        fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        }).then(res => res.json()).then(data => {
            if (data.user) {
                currentUser = data.user;
            } else {
                window.location.href = 'login.html';
            }
        }).catch(() => {
            window.location.href = 'login.html';
        });
    }
}