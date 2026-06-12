// ========== POSTS FUNCTIONS ==========

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



let currentPostType = 'image';
let selectedMusic = null;

async function fetchPosts() {
    try {
        const response = await fetch(`${API_URL}/posts`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const posts = await response.json();
        return posts;
    } catch (error) {
        return [];
    }
}

async function createPost(mediaFile, caption, musicId, musicName) {
    const formData = new FormData();
    formData.append('media', mediaFile);
    formData.append('caption', caption);
    if (musicId) formData.append('musicId', musicId);
    if (musicName) formData.append('music', musicName);
    
    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        const post = await response.json();
        if (response.ok) {
            showToast('✅ Post shared successfully!');
            return post;
        }
        return null;
    } catch (error) {
        showToast('Error creating post');
        return null;
    }
}

async function likePost(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        return null;
    }
}

async function savePost(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/save`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.saved) {
            showToast('💾 Saved to collection');
        } else {
            showToast('🗑️ Removed from saved');
        }
        return data;
    } catch (error) {
        return null;
    }
}

async function addComment(postId, text) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ text })
        });
        const comments = await response.json();
        return comments;
    } catch (error) {
        return [];
    }
}

async function deletePost(postId) {
    if (!confirm('Delete this post?')) return false;
    
    try {
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            showToast('Post deleted');
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

// Double tap like functionality
function setupDoubleTap(element, postId) {
    let tapCount = 0;
    let tapTimer;
    
    element.addEventListener('click', (e) => {
        tapCount++;
        if (tapCount === 2) {
            clearTimeout(tapTimer);
            tapCount = 0;
            // Double tap detected
            likePost(postId).then(() => {
                // Show heart animation
                const heart = document.createElement('div');
                heart.className = 'double-tap-heart';
                heart.innerHTML = '❤️';
                heart.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(1);
                    font-size: 80px;
                    opacity: 1;
                    transition: transform 0.2s, opacity 0.2s;
                    pointer-events: none;
                    color: white;
                    text-shadow: 0 0 10px rgba(0,0,0,0.5);
                    z-index: 10;
                `;
                element.style.position = 'relative';
                element.appendChild(heart);
                setTimeout(() => heart.remove(), 500);
                
                // Update like button UI
                const likeBtn = document.querySelector(`.like-btn[data-post="${postId}"]`);
                if (likeBtn) {
                    likeBtn.classList.add('active');
                    const likeCount = likeBtn.querySelector('span');
                    if (likeCount) {
                        let count = parseInt(likeCount.innerText) || 0;
                        likeCount.innerText = count + 1;
                    }
                }
            });
        } else {
            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, 300);
        }
    });
}

// Render feed
async function renderFeed(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const posts = await fetchPosts();
    
    if (posts.length === 0) {
        container.innerHTML = '<div class="empty-state">✨ No posts yet. Tap + to create your first post!</div>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="post" data-post-id="${post._id}">
            <div class="post-header">
                <div class="post-user" onclick="viewUserProfile('${post.userId._id}')">
                    <img class="post-avatar" src="${post.userId.avatar}" onerror="this.src='https://via.placeholder.com/42'">
                    <div>
                        <div class="post-username">${post.userId.fullName || post.userId.username}</div>
                        <div class="post-time">${formatTime(post.createdAt)}</div>
                    </div>
                </div>
                ${post.userId._id === currentUser?.id ? 
                    `<button class="action-btn" onclick="deletePost('${post._id}')">🗑️</button>` : 
                    '<span>⋯</span>'}
            </div>
            <div class="post-media" data-post-id="${post._id}">
                ${post.mediaType === 'image' ? 
                    `<img src="${post.mediaUrl}" loading="lazy">` : 
                    `<video src="${post.mediaUrl}" loop muted playsinline></video>`}
            </div>
            <div class="post-actions">
                <div class="action-group">
                    <button class="action-btn like-btn ${post.likes?.includes(currentUser?.id) ? 'active' : ''}" data-post="${post._id}" onclick="toggleLike('${post._id}', this)">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        <span>${post.likes?.length || 0}</span>
                    </button>
                    <button class="action-btn" onclick="openCommentsPage('${post._id}')">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        <span>${post.comments?.length || 0}</span>
                    </button>
                    <button class="action-btn ${post.saves?.includes(currentUser?.id) ? 'saved' : ''}" onclick="toggleSave('${post._id}', this)">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </button>
                </div>
                <button class="action-btn" onclick="sharePost('${post._id}')">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
            </div>
            <div class="likes-count" onclick="showLikesList('${post._id}')">${post.likes?.length || 0} likes</div>
            <div class="post-caption">
                <strong>${post.userId.fullName || post.userId.username}</strong> ${post.caption || ''}
                ${post.music ? `<div class="reel-music">🎵 ${post.music}</div>` : ''}
            </div>
            <div class="comment-bar">
                <input class="comment-input" id="commentInput-${post._id}" placeholder="Add a comment...">
                <button class="action-btn" onclick="addNewComment('${post._id}')">Post</button>
            </div>
        </div>
    `).join('');
    
    // Setup double tap for each post
    document.querySelectorAll('.post-media').forEach(media => {
        const postId = media.getAttribute('data-post-id');
        setupDoubleTap(media, postId);
    });
}

async function toggleLike(postId, btn) {
    const result = await likePost(postId);
    if (result) {
        if (result.liked) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        const span = btn.querySelector('span');
        span.innerText = result.count;
    }
}

async function toggleSave(postId, btn) {
    const result = await savePost(postId);
    if (result) {
        if (result.saved) {
            btn.classList.add('saved');
        } else {
            btn.classList.remove('saved');
        }
    }
}

async function addNewComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const text = input.value.trim();
    if (!text) return;
    
    const comments = await addComment(postId, text);
    if (comments) {
        input.value = '';
        // Update comment count
        const commentBtn = document.querySelector(`.action-btn[onclick="openCommentsPage('${postId}')"] span`);
        if (commentBtn) {
            commentBtn.innerText = comments.length;
        }
        showToast('💬 Comment added');
    }
}

function openCommentsPage(postId) {
    // Create comments page dynamically
    let commentsPage = document.getElementById('commentsPage');
    if (!commentsPage) {
        commentsPage = document.createElement('div');
        commentsPage.id = 'commentsPage';
        commentsPage.className = 'comments-page';
        document.body.appendChild(commentsPage);
    }
    
    commentsPage.innerHTML = `
        <div class="comments-header">
            <button class="back-btn" onclick="closeCommentsPage()">
                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h3>Comments</h3>
        </div>
        <div class="comments-list" id="commentsList"></div>
        <div class="comment-input-bar">
            <input class="comment-input" id="newCommentInput" placeholder="Add a comment...">
            <button class="action-btn" onclick="submitCommentFromPage('${postId}')">Post</button>
        </div>
    `;
    
    // Load comments
    loadCommentsToPage(postId);
    
    commentsPage.classList.add('open');
}

async function loadCommentsToPage(postId) {
    const post = await fetchPostById(postId);
    const commentsList = document.getElementById('commentsList');
    
    if (!post?.comments?.length) {
        commentsList.innerHTML = '<div class="empty-state">No comments yet. Be the first to comment!</div>';
        return;
    }
    
    commentsList.innerHTML = post.comments.map(comment => `
        <div class="comment-item">
            <img class="comment-avatar" src="${comment.userId?.avatar}" onerror="this.src='https://via.placeholder.com/36'">
            <div class="comment-content">
                <div class="comment-username">${comment.userId?.fullName || comment.userId?.username}</div>
                <div class="comment-text">${comment.text}</div>
                <div class="comment-time">${formatTime(comment.createdAt)}</div>
                <div class="comment-actions">
                    <button class="comment-like-btn" onclick="likeComment('${postId}', '${comment._id}')">Like</button>
                    ${comment.userId?._id === currentUser?.id ? 
                        `<button class="comment-like-btn comment-delete" onclick="deleteComment('${postId}', '${comment._id}')">Delete</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

async function submitCommentFromPage(postId) {
    const input = document.getElementById('newCommentInput');
    const text = input.value.trim();
    if (!text) return;
    
    const comments = await addComment(postId, text);
    if (comments) {
        input.value = '';
        loadCommentsToPage(postId);
        // Update comment count in feed
        const commentBtn = document.querySelector(`.action-btn[onclick="openCommentsPage('${postId}')"] span`);
        if (commentBtn) commentBtn.innerText = comments.length;
        showToast('💬 Comment added');
    }
}

function closeCommentsPage() {
    const page = document.getElementById('commentsPage');
    if (page) page.classList.remove('open');
}

function formatTime(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString();
}

// Create Post Modal
if (document.getElementById('createPostBtn')) {
    document.getElementById('createPostBtn').onclick = () => {
        document.getElementById('postModal').classList.add('open');
    };
    
    document.querySelectorAll('.post-type-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.post-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPostType = btn.getAttribute('data-type');
            const musicSelector = document.getElementById('musicSelector');
            if (currentPostType === 'video') {
                musicSelector.style.display = 'block';
            } else {
                musicSelector.style.display = 'none';
            }
        };
    });
    
    document.getElementById('uploadZone').onclick = () => {
        document.getElementById('fileInput').click();
    };
    
    let pendingMedia = null;
    document.getElementById('fileInput').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        pendingMedia = file;
        document.getElementById('uploadZone').innerHTML = file.type.startsWith('image') ? '✅ Image selected' : '✅ Video selected';
    };
    
    document.getElementById('publishPostBtn').onclick = async () => {
        if (!pendingMedia) {
            showToast('Please select an image or video');
            return;
        }
        const caption = document.getElementById('captionInput').value;
        const musicId = selectedMusic?.id;
        const musicName = selectedMusic?.name;
        
        const post = await createPost(pendingMedia, caption, musicId, musicName);
        if (post) {
            document.getElementById('postModal').classList.remove('open');
            document.getElementById('captionInput').value = '';
            document.getElementById('uploadZone').innerHTML = '📸 Tap to select image or video';
            pendingMedia = null;
            if (typeof renderFeed === 'function') renderFeed('feedContainer');
        }
    };
}