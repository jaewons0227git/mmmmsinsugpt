document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
document.onkeydown = function(e) {
  if (e.keyCode == 123) { e.preventDefault(); return false; } 
  if (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0) || e.keyCode == 'C'.charCodeAt(0))) { e.preventDefault(); return false; } 
  if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) { e.preventDefault(); return false; } 
};

// ===========================================
// 1. DOM 요소 및 상수 정의
// ===========================================
 
const phone = document.querySelector('.phone');
const contentWrapper = document.getElementById('content-wrapper');
const inputField = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const stopButton = document.getElementById('stop-button');
const initialContent = document.getElementById('initial-content');
const chatMessages = document.getElementById('chat-messages');
const composer = document.getElementById('composer');
const inputContainer = document.getElementById('input-container');
const plusButton = document.getElementById('plus-button');
const plusModalBackdrop = document.getElementById('plus-modal-backdrop');
const settingsButton = document.getElementById('settings-button');
const settingsModalBackdrop = document.getElementById('settings-modal-backdrop');
const resetChatButton = document.getElementById('reset-chat-button');
const quickActionButtons = document.querySelectorAll('.action-btn'); 
const snackbar = document.getElementById('snackbar');
const resetConfirmModalBackdrop = document.getElementById('reset-confirm-modal-backdrop');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const confirmResetBtn = document.getElementById('confirm-reset-btn');
const scrollDownButton = document.getElementById('scrollDownButton'); 

const aboutButton = document.getElementById('about-button');
const aboutModalBackdrop = document.getElementById('about-modal-backdrop');

const uiStyleBtns = document.querySelectorAll('.ui-style-btn');
const themeBtns = document.querySelectorAll('.theme-btn');
const toolStudy = document.getElementById('tool-study');

const toolImage = document.getElementById('tool-image');
const menuCreateImage = document.getElementById('menu-create-image');
const imageModeIndicator = document.getElementById('image-mode-indicator');
const closeImageModeBtn = document.getElementById('close-image-mode');

// 🌟 사이드바 관련 요소
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const sidebar = document.getElementById('sidebar');
const menuButton = document.getElementById('menu-button');
const sidebarClose = document.getElementById('sidebar-close');
const sidebarNewChat = document.getElementById('sidebar-new-chat');
const sidebarList = document.getElementById('sidebar-list');
const sidebarSearchInput = document.getElementById('sidebar-search-input');
const sidebarDeleteAll = document.getElementById('sidebar-delete-all');
const sidebarExport = document.getElementById('sidebar-export');
const sidebarImport = document.getElementById('sidebar-import');
const importFileInput = document.getElementById('import-file-input');

// 🌟 [신규] 미니 사이드바 요소
const miniSidebarNewChat = document.getElementById('mini-new-chat');
const miniSidebarSearch = document.getElementById('mini-search');
const miniSidebarDeleteAll = document.getElementById('mini-delete-all');

// 🌟 [추가] 상단바 새 채팅 및 업데이트 링크 요소
const headerNewChat = document.getElementById('header-new-chat');
const headerUpdateLink = document.getElementById('header-update-link');

// 🌟 [신규] 모달 관련 요소 정의
const renameModalBackdrop = document.getElementById('rename-modal-backdrop');
const renameInput = document.getElementById('rename-input');
const renameCancelBtn = document.getElementById('rename-cancel-btn');
const renameConfirmBtn = document.getElementById('rename-confirm-btn');

const deleteModalBackdrop = document.getElementById('delete-modal-backdrop');
const deleteModalTitle = document.getElementById('delete-modal-title');
const deleteModalDesc = document.getElementById('delete-modal-desc');
const deleteCancelBtn = document.getElementById('delete-cancel-btn');
const deleteConfirmBtn = document.getElementById('delete-confirm-btn');

// 🌟 [신규] 파일 첨부 관련 요소
const hiddenCameraInput = document.getElementById('hidden-camera-input');
const hiddenFileInput = document.getElementById('hidden-file-input');
const attachmentArea = document.getElementById('attachment-area');
const attachmentPreviewList = document.getElementById('attachment-preview-list');
const btnCamera = document.querySelector('[data-action="camera"]');
const btnAlbum = document.querySelector('[data-action="album"]');
const btnFile = document.querySelector('[data-action="file"]');

let targetSessionIdForAction = null;
let deleteActionType = null; // 'single' or 'all'

// 🎯 백엔드 엔드포인트
const BACKEND_ENDPOINT = "https://jaewondev.pythonanywhere.com/ask"; 
const IMAGE_ENDPOINT = "https://jaewondev.pythonanywhere.com/generate-image"; 

const HISTORY_STORAGE_KEY = 'minsugpt_chat_history'; // Deprecated for single session
const SESSIONS_STORAGE_KEY = 'minsugpt_sessions'; // New key for multiple sessions
const UI_STYLE_KEY = 'minsugpt_ui_style'; 
const THEME_KEY = 'minsugpt_theme'; 

let history = []; 
let sessions = [];
let currentSessionId = null;

const PRE_PROMPT = {
    role: "system",
    content: "너는 MinsuGPT야. 너는 신재원님이 만들었어. 사용자가 따로 물어보지 않으면 너의 역할이나 개발자 정보를 따로 답하지마."
};

const MAX_ROWS = 6;
const MIN_ROWS = 1;
const isMobile = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;
let isStreaming = false; 
let abortController = null; 
let currentLoadingText = '답변을 생각하는 중...';
let autoScrollEnabled = true;
let isImageMode = false;

// 🌟 부드러운 타이핑 효과를 위한 변수
let streamQueue = ""; // 네트워크에서 받아온 전체 데이터
let displayedResponse = ""; // 현재 화면에 표시된 데이터
let streamInterval = null; // 타이핑 인터벌
let isNetworkFinished = false; // 네트워크 요청 완료 여부

// 🌟 첨부 파일 관리 변수
let currentAttachments = []; // { name, size, data(base64), type }

// Marked 옵션 설정 (줄바꿈 처리 등)
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true, // 엔터키 줄바꿈 허용
        gfm: true     // GitHub Flavor Markdown 허용
    });
}

// ===========================================
// 2. UI 및 설정 (테마, 스타일, 모달) 관련 함수
// ===========================================

function animateUIOnLoad() {
    contentWrapper.classList.add('loaded');
    composer.classList.add('loaded'); 
    setTimeout(() => { scrollToBottom(false); }, 100); 
    setTimeout(() => { scrollToBottom(true); }, 500); 
}

function showSnackbar(message) {
    snackbar.classList.remove('show');
    snackbar.style.animation = 'none';
    void snackbar.offsetWidth; 
    snackbar.style.animation = '';
    snackbar.textContent = message;
    snackbar.classList.add('show');
    setTimeout(() => { snackbar.classList.remove('show'); }, 3000); 
}

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'auto';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    themeBtns.forEach(btn => {
        if (btn.dataset.themeVal === theme) { btn.classList.add('active'); } 
        else { btn.classList.remove('active'); }
    });
    let effectiveTheme = theme;
    if (theme === 'auto') { effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    const metaThemeColor = document.getElementById('meta-theme-color');
    if(metaThemeColor) { metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#121212' : '#ffffff'); }
    localStorage.setItem(THEME_KEY, theme);
}

function loadUIStyle() {
    const savedStyle = localStorage.getItem(UI_STYLE_KEY) || 'default'; 
    applyUIStyle(savedStyle);
}

function applyUIStyle(style) {
    toggleImageMode(false);

    if (style === 'simple') {
        composer.classList.remove('style-default');
        composer.classList.add('style-simple');
    } else {
        composer.classList.remove('style-simple');
        composer.classList.add('style-default');
    }
    
    uiStyleBtns.forEach(btn => {
        if (btn.dataset.style === style) {
            btn.classList.add('active');
            const icon = btn.querySelector('.material-symbols-rounded');
            if(icon) icon.textContent = 'check_circle';
        } else {
            btn.classList.remove('active');
            const icon = btn.querySelector('.material-symbols-rounded');
            if(icon) icon.textContent = 'radio_button_unchecked';
        }
    });
    
    localStorage.setItem(UI_STYLE_KEY, style);
    setTimeout(autoResizeTextarea, 50);
}

function toggleImageMode(active) {
    isImageMode = active;
    const isSimple = composer.classList.contains('style-simple');

    if (active) {
        currentLoadingText = '이미지를 생성하는 중...';
        if (isSimple) {
            toolImage.classList.add('active-purple');
        } else {
            imageModeIndicator.style.display = 'flex';
        }
    } else {
        currentLoadingText = '답변을 생각하는 중...';
        if (isSimple) {
            toolImage.classList.remove('active-purple');
        } else {
            imageModeIndicator.style.display = 'none';
        }
    }
    autoResizeTextarea(); 
}

function togglePlusModal(show) {
    if (show === undefined) { plusModalBackdrop.classList.toggle('visible'); } 
    else if (show) { plusModalBackdrop.classList.add('visible'); } 
    else { plusModalBackdrop.classList.remove('visible'); }
}

function toggleSettingsModal(show) {
    if (show === undefined) { settingsModalBackdrop.classList.toggle('visible'); } 
    else if (show) { settingsModalBackdrop.classList.add('visible'); } 
    else { settingsModalBackdrop.classList.remove('visible'); }
}

function toggleAboutModal(show) {
    if (show === undefined) { aboutModalBackdrop.classList.toggle('visible'); } 
    else if (show) { aboutModalBackdrop.classList.add('visible'); } 
    else { aboutModalBackdrop.classList.remove('visible'); }
}

function toggleResetConfirmModal(show) {
    if (show === undefined) { resetConfirmModalBackdrop.classList.toggle('visible'); } 
    else if (show) { resetConfirmModalBackdrop.classList.add('visible'); } 
    else { resetConfirmModalBackdrop.classList.remove('visible'); }
    if (show) toggleSettingsModal(false); 
}

// 🌟 [신규] PC 확인 및 모달 제어 함수
const isPC = () => window.innerWidth >= 769;

function openRenameModal(id) {
    targetSessionIdForAction = id;
    const session = sessions.find(s => s.id === id);
    if (session) {
        renameInput.value = session.title;
        renameModalBackdrop.classList.add('visible');
        renameInput.focus();
    }
}

function openDeleteModal(type, id = null) {
    deleteActionType = type;
    targetSessionIdForAction = id;
    if (type === 'all') {
        deleteModalTitle.textContent = "전체 삭제";
        deleteModalDesc.textContent = "정말로 모든 대화 기록을 삭제하시겠습니까?";
    } else {
        deleteModalTitle.textContent = "채팅 삭제";
        deleteModalDesc.textContent = "이 채팅을 삭제하시겠습니까?";
    }
    deleteModalBackdrop.classList.add('visible');
}

function closeCustomModals() {
    renameModalBackdrop.classList.remove('visible');
    deleteModalBackdrop.classList.remove('visible');
    targetSessionIdForAction = null;
    deleteActionType = null;
}

// 🌟 [수정] 사이드바 토글 함수 (PC Push 효과 포함)
function toggleSidebar(show) {
    if (show === undefined) { 
        const isVisible = sidebarBackdrop.classList.contains('visible');
        if (isVisible) {
            sidebarBackdrop.classList.remove('visible');
            document.body.classList.remove('sidebar-open');
        } else {
            renderSidebarList();
            sidebarBackdrop.classList.add('visible');
            document.body.classList.add('sidebar-open');
        }
    }
    else if (show) { 
        renderSidebarList(); 
        sidebarBackdrop.classList.add('visible'); 
        document.body.classList.add('sidebar-open');
    }
    else { 
        sidebarBackdrop.classList.remove('visible'); 
        document.body.classList.remove('sidebar-open');
    }
}

// ===========================================
// 3. 채팅 세션 관리 (목록, 저장, 불러오기)
// ===========================================

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function saveSessions() {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
}

function loadSessions() {
    const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (storedSessions) {
        sessions = JSON.parse(storedSessions);
    } else {
        const oldHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (oldHistory) {
            try {
                const parsed = JSON.parse(oldHistory);
                if (parsed.length > 0) {
                    const newSession = {
                        id: generateSessionId(),
                        title: parsed[0].content.substring(0, 20) || '이전 대화',
                        messages: parsed,
                        timestamp: Date.now()
                    };
                    sessions.push(newSession);
                    saveSessions();
                    localStorage.removeItem(HISTORY_STORAGE_KEY);
                }
            } catch(e) {}
        }
    }
}

function startNewChat(skipRender = false) {
    if (sessions.length > 0) {
        const latestSession = sessions[0];
        if (latestSession.messages.length === 0) {
            currentSessionId = latestSession.id;
            if (!skipRender) {
                loadCurrentSession();
                if (!isPC()) toggleSidebar(false);
            }
            renderSidebarList(); 
            return; 
        }
    }

    currentSessionId = generateSessionId();
    history = [];
    currentAttachments = []; // 새 채팅 시 첨부파일 초기화
    renderAttachments(); // UI 초기화
    
    const newSession = {
        id: currentSessionId,
        title: '새로운 채팅',
        messages: [],
        timestamp: Date.now()
    };
    sessions.unshift(newSession);
    saveSessions();
    if (!skipRender) {
        loadCurrentSession();
        if (!isPC()) toggleSidebar(false);
    }
    renderSidebarList(); 
}

function loadCurrentSession() {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) {
        startNewChat();
        return;
    }
    history = session.messages;
    renderChatMessages();
}

function deleteSession(id, e) {
    if(e) e.stopPropagation();
    openDeleteModal('single', id);
}

function renameSession(id, e) {
    if(e) e.stopPropagation();
    openRenameModal(id);
}

function executeDeleteSession(id) {
    sessions = sessions.filter(s => s.id !== id);
    saveSessions();
    
    if (currentSessionId === id) {
        if (sessions.length > 0) {
            currentSessionId = sessions[0].id;
            loadCurrentSession();
        } else {
            startNewChat(false);
        }
    }
    
    renderSidebarList();
    if (!isPC()) toggleSidebar(false);
}

function executeRenameSession(id, newTitle) {
    const session = sessions.find(s => s.id === id);
    if (session && newTitle) {
        session.title = newTitle;
        saveSessions();
        renderSidebarList();
    }
}

function updateCurrentSession() {
    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
        session.messages = history;
        if (session.title === '새로운 채팅' && history.length > 0) {
            const firstMsg = history.find(m => m.role === 'user');
            if (firstMsg) {
                session.title = firstMsg.content.substring(0, 30);
                renderSidebarList();
            }
        }
        session.timestamp = Date.now();
        saveSessions();
    }
}

function renderSidebarList() {
    sidebarList.innerHTML = '';
    const filter = sidebarSearchInput.value.toLowerCase();
    
    const sortedSessions = sessions.sort((a, b) => b.timestamp - a.timestamp);
    
    sortedSessions.forEach(session => {
        if (filter && !session.title.toLowerCase().includes(filter)) return;

        const el = document.createElement('div');
        el.className = `sidebar-list-item ${session.id === currentSessionId ? 'active' : ''}`;
        
        const dateStr = new Date(session.timestamp).toLocaleDateString();
        
        el.innerHTML = `
            <div class="sidebar-list-item-content">
                <div class="sidebar-list-item-title">${session.title}</div>
                <div class="sidebar-list-item-date">${dateStr}</div>
            </div>
            <div class="sidebar-item-actions">
                <div class="item-action-btn edit" title="이름 변경"><span class="material-symbols-rounded" style="font-size:16px">edit</span></div>
                <div class="item-action-btn delete" title="삭제"><span class="material-symbols-rounded" style="font-size:16px">delete</span></div>
            </div>
        `;
        
        el.addEventListener('click', () => {
            currentSessionId = session.id;
            loadCurrentSession();
            if (!isPC()) toggleSidebar(false);
            renderSidebarList();
        });
        
        const editBtn = el.querySelector('.edit');
        editBtn.addEventListener('click', (e) => renameSession(session.id, e));
        
        const deleteBtn = el.querySelector('.delete');
        deleteBtn.addEventListener('click', (e) => deleteSession(session.id, e));
        
        sidebarList.appendChild(el);
    });
}

function renderChatMessages() {
    chatMessages.innerHTML = '';
    
    if (history.length > 0) {
        initialContent.style.opacity = '0';
        initialContent.style.visibility = 'hidden'; 
        chatMessages.style.display = 'flex';
        history.forEach(message => {
            if (message.role === 'user') { 
                appendUserMessage(message.content, message.images || [], false); 
            } 
            else if (message.role === 'model') { 
                if (message.content.includes('<img src="data:image')) {
                    appendBotImage(message.content, false);
                } else {
                    appendBotMessage(message.content, message.feedback, false); 
                }
            }
        });
        updateRegenerateButtons(); 
    } else {
        chatMessages.style.display = 'none';
        initialContent.style.visibility = 'visible'; 
        initialContent.style.display = 'flex';
        initialContent.style.opacity = '1';
    }
    autoResizeTextarea();
    setTimeout(() => scrollToBottom(false), 0);
}

function resetAllChats() {
    openDeleteModal('all');
}

function executeResetAllChats() {
    sessions = [];
    localStorage.removeItem(SESSIONS_STORAGE_KEY);
    startNewChat(); 
    showSnackbar('모든 대화가 삭제되었습니다.');
    if (!isPC()) toggleSidebar(false);
}

// ===========================================
// 4. 입력창 및 메시지 UI 관련 함수
// ===========================================

function scrollToBottom(smooth = true) {
    if (!contentWrapper) return;
    
    if (smooth) {
        contentWrapper.scrollTo({ top: contentWrapper.scrollHeight, behavior: 'smooth' });
    } else {
        contentWrapper.scrollTop = contentWrapper.scrollHeight;
    }
    
    toggleScrollButton();
}

function toggleScrollButton() {
    if (!contentWrapper || !scrollDownButton) return;

    const currentScroll = contentWrapper.scrollTop;
    const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
    
    const distanceFromBottom = maxScroll - currentScroll; 

    if (distanceFromBottom > 100) {
        scrollDownButton.classList.add('visible');
        scrollDownButton.classList.remove('hidden');
    } else {
        scrollDownButton.classList.add('hidden');
        scrollDownButton.classList.remove('visible');
    }
}

function toggleSendButton() {
    const hasText = inputField.value.trim().length > 0;
    if (hasText && !isStreaming) { 
        sendButton.classList.add('active'); 
    } else { 
        sendButton.classList.remove('active'); 
    }
}

// 🌟 [수정] 높이 계산 로직 수정: 첨부파일 영역 높이 분리
function autoResizeTextarea() {
    const style = getComputedStyle(inputField);
    const line_height_px = parseFloat(style.getPropertyValue('--line-height-px')) || 22.4; 
    const minInputContainerHeight = parseFloat(style.getPropertyValue('--min-input-container-height')) || 48; 

    // 1. 텍스트박스 높이 계산 (순수 텍스트만 고려)
    inputField.rows = MIN_ROWS;
    inputField.style.height = 'auto'; 
    
    let scrollH = inputField.scrollHeight;
    let newRows = Math.round(scrollH / line_height_px);
    newRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, newRows));
    
    inputField.rows = newRows;
    inputField.style.height = 'auto'; // 높이 자동 조절
    
    // 2. 입력 컨테이너 최소 높이 설정 (첨부파일 높이 제외)
    // 텍스트박스가 담긴 컨테이너만 조절하고, 전체 래퍼는 CSS Flex가 처리
    const finalTextareaHeight = inputField.offsetHeight; 
    const inputContainerHeight = Math.max(finalTextareaHeight + 8, minInputContainerHeight);
    
    inputContainer.style.minHeight = `${inputContainerHeight}px`;

    // 3. 채팅창 하단 여백 확보
    const composerHeight = composer.offsetHeight;
    chatMessages.style.paddingBottom = `${composerHeight + 80}px`;
}

// 🌟 [수정] 파일 처리 함수들
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    togglePlusModal(false);

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Data = event.target.result;
            let sizeStr = "";
            if (file.size < 1024 * 1024) {
                sizeStr = (file.size / 1024).toFixed(1) + " KB";
            } else {
                sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
            }

            currentAttachments.push({
                name: file.name,
                size: sizeStr,
                data: base64Data,
                type: file.type
            });
            renderAttachments();
        };
        reader.readAsDataURL(file);
    });

    e.target.value = '';
}

// 🌟 [수정] 첨부파일 렌더링 로직
function renderAttachments() {
    attachmentPreviewList.innerHTML = '';
    
    if (currentAttachments.length === 0) {
        attachmentArea.style.display = 'none'; // 숨김
    } else {
        attachmentArea.style.display = 'flex'; // 보임 (CSS Flex로 처리)
        
        currentAttachments.forEach((file, index) => {
            const chip = document.createElement('div');
            chip.className = 'file-chip';
            chip.innerHTML = `
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${file.size}</span>
                </div>
                <div class="file-delete" data-index="${index}">
                    <span class="material-symbols-rounded">close</span>
                </div>
            `;
            
            chip.querySelector('.file-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                removeAttachment(index);
            });
            
            attachmentPreviewList.appendChild(chip);
        });
    }
    
    // 렌더링 후 높이 재계산 (래퍼 높이 자연스럽게 증가)
    setTimeout(autoResizeTextarea, 0);
}

function removeAttachment(index) {
    currentAttachments.splice(index, 1);
    renderAttachments();
}


// 🌟 [수정] 유저 메시지에 이미지 표시 기능 추가
function appendUserMessage(content, images = [], animate = true) {
    const userBubble = document.createElement('div');
    userBubble.className = 'message-bubble user-message';
    
    let htmlContent = `<div class="message-text">`;
    
    // 이미지가 있으면 텍스트 위에 표시
    if (images && images.length > 0) {
        images.forEach(imgData => {
            htmlContent += `<img src="${imgData}" class="user-message-image" alt="첨부 이미지"><br>`;
        });
    }
    
    htmlContent += `${content.replace(/\n/g, '<br>')}</div>`;
    userBubble.innerHTML = htmlContent;
    
    chatMessages.appendChild(userBubble);
    return userBubble; 
}

function appendBotImage(htmlContent, animate = true) {
     const botMessageContainer = document.createElement('div');
    botMessageContainer.className = 'bot-message';
    botMessageContainer.setAttribute('data-index', history.length); 

    const streamingBlock = document.createElement('div');
    streamingBlock.className = 'streaming-block'; 
    streamingBlock.innerHTML = htmlContent; 
    botMessageContainer.appendChild(streamingBlock);

    chatMessages.appendChild(botMessageContainer);
    if (animate) scrollToBottom(true);
}

function appendBotMessage(content, feedbackStatus = null, animate = true) {
    const botMessageContainer = document.createElement('div');
    botMessageContainer.className = 'bot-message';
    const messageIndex = history.length;
    botMessageContainer.setAttribute('data-index', messageIndex); 

    const streamingBlock = document.createElement('div');
    streamingBlock.className = 'streaming-block'; 
    
    streamingBlock.innerHTML = typeof marked !== 'undefined' ? marked.parse(content) : content;
    
    botMessageContainer.appendChild(streamingBlock);

    const actionContainer = createBotActions(content, messageIndex, feedbackStatus);
    botMessageContainer.appendChild(actionContainer);
    
    chatMessages.appendChild(botMessageContainer);
    if (animate) scrollToBottom(true);
}

function updateRegenerateButtons() {
    const allBotMessages = chatMessages.querySelectorAll('.bot-message');
    const lastBotMessage = allBotMessages[allBotMessages.length - 1];
    allBotMessages.forEach(message => {
        const regenBtn = message.querySelector('.bot-action-btn.regenerate');
        if (regenBtn) {
            if (message === lastBotMessage) {
                regenBtn.classList.remove('disabled'); regenBtn.style.opacity = 1; regenBtn.style.pointerEvents = 'auto';
            } else {
                regenBtn.classList.add('disabled'); regenBtn.style.opacity = 0.5; regenBtn.style.pointerEvents = 'none';
            }
        }
        const otherBtns = message.querySelectorAll('.bot-action-btn:not(.regenerate)');
        otherBtns.forEach(btn => { btn.style.opacity = 1; btn.style.pointerEvents = 'auto'; });
    });
}

function createBotActions(content, messageIndex, feedbackStatus = null) {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'bot-actions';
    actionsContainer.setAttribute('data-message-index', messageIndex);

    const likeBtn = createActionButton('like', '좋아요', feedbackStatus, 'thumb_up');
    const dislikeBtn = createActionButton('dislike', '싫어요', feedbackStatus, 'thumb_down');
    const copyBtn = createActionButton('copy', '복사', null, 'content_copy');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(content).then(() => { showSnackbar('메시지가 복사되었습니다.'); })
        .catch(err => { showSnackbar('복사에 실패했습니다.'); });
    });
    const shareBtn = createActionButton('share', '공유', null, 'share');
    shareBtn.addEventListener('click', () => {
        if (navigator.share) { navigator.share({ title: 'MinsuGPT 공유', text: content, }).catch(error => console.error('공유 실패', error)); } 
        else { navigator.clipboard.writeText(content).then(() => { showSnackbar('공유 기능이 없어 복사했습니다.'); }); }
    });

    const regenerateBtn = createActionButton('regenerate', '다시 답변받기', null, 'autorenew');
    regenerateBtn.addEventListener('click', (e) => { if (!regenerateBtn.classList.contains('disabled')) { handleRegenerate(messageIndex); } else { showSnackbar('가장 최신 답변만 재생성할 수 있습니다.'); } });

    const toggleFeedback = (action, otherAction, index) => {
        const currentMessage = history[index];
        if (!currentMessage || currentMessage.role !== 'model') return;
        const newFeedback = currentMessage.feedback === action ? null : action;
        currentMessage.feedback = newFeedback; history[index].feedback = newFeedback; 
        updateCurrentSession(); 
        const btn = document.querySelector(`.bot-message[data-index="${index}"] .bot-action-btn.${action}`);
        const otherBtn = document.querySelector(`.bot-message[data-index="${index}"] .bot-action-btn.${otherAction}`);
        if (newFeedback) { btn.classList.add('selected'); if (otherBtn) otherBtn.classList.remove('selected'); } 
        else { btn.classList.remove('selected'); }
    };

    likeBtn.addEventListener('click', () => toggleFeedback('like', 'dislike', messageIndex));
    dislikeBtn.addEventListener('click', () => toggleFeedback('dislike', 'like', messageIndex));
    
    actionsContainer.appendChild(likeBtn); actionsContainer.appendChild(dislikeBtn); actionsContainer.appendChild(copyBtn); actionsContainer.appendChild(shareBtn); actionsContainer.appendChild(regenerateBtn);
    if (messageIndex !== history.length - 1 && history.filter(msg => msg.role === 'model').length > 0) { regenerateBtn.classList.add('disabled'); }
    return actionsContainer;
}

function handleRegenerate(messageIndex) {
    if (isStreaming) { showSnackbar('현재 답변 생성 중입니다.'); return; }
    const modelMessageIndex = history.findIndex((msg, index) => index === messageIndex && msg.role === 'model');
    if (modelMessageIndex === -1) { showSnackbar('재생성할 답변을 찾을 수 없습니다.'); return; }

    let userMessageIndex = -1;
    for (let i = modelMessageIndex - 1; i >= 0; i--) { if (history[i].role === 'user') { userMessageIndex = i; break; } }
    if (userMessageIndex === -1) { showSnackbar('재생성할 사용자 질문을 찾을 수 없습니다.'); return; }
    
    const originalPrompt = history[userMessageIndex].content;
    const originalImages = history[userMessageIndex].images || []; 

    history.splice(modelMessageIndex, history.length - modelMessageIndex);
    updateCurrentSession();
    
    const botMessageElement = document.querySelector(`.bot-message[data-index="${messageIndex}"]`);
    if (botMessageElement) {
         let current = botMessageElement;
         while (current) {
             const next = current.nextSibling;
             if (current.classList.contains('bot-message') || current.classList.contains('stop-message')) { current.remove(); }
             current = next;
         }
    }

    currentLoadingText = '다시 답변을 생각하는 중...';
    autoScrollEnabled = true; scrollDownButton.classList.remove('visible');
    
    sendMessage(originalPrompt, true); 
}

function createActionButton(actionType, ariaLabel, feedbackStatus = null, iconName) {
    const btn = document.createElement('div');
    btn.className = `bot-action-btn ${actionType}`;
    btn.setAttribute('role', 'button'); btn.setAttribute('aria-label', ariaLabel);
    if (feedbackStatus === actionType) { btn.classList.add('selected'); }
    btn.innerHTML = `<span class="material-symbols-rounded">${iconName}</span>`;
    return btn;
}

function appendBotMessageContainer() {
    const botMessageContainer = document.createElement('div');
    botMessageContainer.className = 'bot-message';
    botMessageContainer.setAttribute('data-index', history.length); 
    
    const indicatorContainer = document.createElement('div');
    indicatorContainer.id = 'thinking-indicator'; indicatorContainer.className = 'thinking-indicator';
    
    const spinner = document.createElement('div'); spinner.className = 'loading-spinner';
    if (isImageMode) { spinner.classList.add('image-gen'); }

    const indicatorText = document.createElement('span'); indicatorText.className = 'thinking-indicator-text'; indicatorText.textContent = currentLoadingText; 
    
    indicatorContainer.appendChild(spinner); indicatorContainer.appendChild(indicatorText);
    
    const streamingBlock = document.createElement('div'); streamingBlock.className = 'streaming-block'; 
    
    botMessageContainer.appendChild(indicatorContainer); botMessageContainer.appendChild(streamingBlock);
    chatMessages.appendChild(botMessageContainer);
    
    return { botMessageElement: botMessageContainer, indicatorElement: indicatorContainer, streamingBlockElement: streamingBlock, spinnerElement: spinner, indicatorTextElement: indicatorText };
}

function setStreamingState(active) {
    isStreaming = active;
    if (active) {
        sendButton.style.display = 'none'; stopButton.style.display = 'flex'; inputField.setAttribute('readonly', 'true');
        autoScrollEnabled = true; scrollDownButton.classList.remove('visible');
    } else {
        sendButton.style.display = 'flex'; stopButton.style.display = 'none'; inputField.removeAttribute('readonly'); abortController = null;
    }
    toggleSendButton();
}

let fullResponse = ""; 

function stopResponse() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
    
    if (streamInterval) {
        clearInterval(streamInterval);
        streamInterval = null;
    }
    
    const lastBotMessageElement = chatMessages.lastElementChild;
    if (lastBotMessageElement) {
        const indicatorContainer = lastBotMessageElement.querySelector('#thinking-indicator');
        if (indicatorContainer) {
            const indicatorText = indicatorContainer.querySelector('.thinking-indicator-text');
            if (indicatorText) { 
                indicatorText.textContent = "답변 중지됨";
                indicatorText.classList.add('stopped'); 
            }
        }

        history.push({ role: 'model', content: displayedResponse, feedback: null }); 
        updateCurrentSession(); 
        
        const actionContainer = createBotActions(displayedResponse, history.length - 1);
        lastBotMessageElement.appendChild(actionContainer); updateRegenerateButtons();
    }
    
    showSnackbar("답변 중지됨.");
    setStreamingState(false); 
    scrollToBottom(true);
}


async function sendMessage(userMessageOverride = null, isRegenerate = false) {
    const userMessage = userMessageOverride !== null ? userMessageOverride : inputField.value.trim();
    
    if (userMessage.length === 0 || isStreaming) { 
        if (isStreaming) showSnackbar('현재 답변 생성 중입니다.'); 
        return; 
    }

    let userBubbleElement = null;

    if (!isRegenerate) {
        if (isImageMode) {
             currentLoadingText = '이미지를 생성하는 중...';
        } else {
             currentLoadingText = '답변을 생각하는 중...';
        }

        if (initialContent.style.opacity !== '0') {
            initialContent.style.opacity = '0'; initialContent.style.visibility = 'hidden'; 
            setTimeout(() => { initialContent.style.display = 'none'; chatMessages.style.display = 'flex'; }, 500); 
        } else { chatMessages.style.display = 'flex'; }
        const existingStops = chatMessages.querySelectorAll('.stop-message'); existingStops.forEach(el => el.remove());
        updateRegenerateButtons(); 
        
        const imagePayload = currentAttachments.map(f => f.data);
        userBubbleElement = appendUserMessage(userMessage, imagePayload, false); 
        
        history.push({ role: 'user', content: userMessage, images: imagePayload }); 
        updateCurrentSession(); 
        
        currentAttachments = [];
        renderAttachments();
    } 
    
    if (userMessageOverride === null) { inputField.value = ''; inputField.rows = MIN_ROWS; autoResizeTextarea(); }
    
    const { botMessageElement, indicatorElement, streamingBlockElement, spinnerElement, indicatorTextElement } = appendBotMessageContainer();
    
    if (userBubbleElement) {
        setTimeout(() => {
            const headerHeight = 64; // 헤더 높이 수정 반영
            const offset = userBubbleElement.offsetTop - headerHeight - 10; 
            contentWrapper.scrollTo({ top: offset, behavior: 'smooth' });
        }, 50);
    } else {
        scrollToBottom(true);
    }

    setStreamingState(true);
    abortController = new AbortController();
    const signal = abortController.signal;
    
    fullResponse = ""; 
    streamQueue = "";      
    displayedResponse = ""; 
    isNetworkFinished = false; 
    
    if (streamInterval) clearInterval(streamInterval);
    
    streamInterval = setInterval(() => {
        if (streamQueue.length > 0) {
            const charsToTake = 2; 
            const chunkToAdd = streamQueue.slice(0, charsToTake);
            streamQueue = streamQueue.slice(charsToTake); 
            
            displayedResponse += chunkToAdd;
            fullResponse = displayedResponse; 
            
            streamingBlockElement.innerHTML = typeof marked !== 'undefined' ? marked.parse(displayedResponse) : displayedResponse;
            
            if (autoScrollEnabled) scrollToBottom(false);
        } else if (isNetworkFinished && streamQueue.length === 0) {
            clearInterval(streamInterval);
            streamInterval = null;
            
             history.push({ role: 'model', content: displayedResponse, feedback: null }); 
            updateCurrentSession(); 
            
            if (spinnerElement) spinnerElement.classList.add('reset-spin'); 
            if (indicatorTextElement) { indicatorTextElement.style.display = 'none'; indicatorTextElement.classList.add('completed'); }
            indicatorElement.classList.add('left-aligned'); 
            
            const actionContainer = createBotActions(displayedResponse, history.length - 1);
            botMessageElement.appendChild(actionContainer); updateRegenerateButtons();
            scrollToBottom(true);
            
            setStreamingState(false);
        }
    }, 15); 
    
    try {
        if (isImageMode) {
            const response = await fetch(IMAGE_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ prompt: userMessage }), 
                signal: signal 
            });

            if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
            
            const data = await response.json();
            
            if (data.success && data.image_data) {
                clearInterval(streamInterval); 
                
                const imgHtml = `<img src="${data.image_data}" alt="Generated Image" style="max-width: 100%; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`;
                fullResponse = imgHtml;
                streamingBlockElement.innerHTML = fullResponse;
                
                setStreamingState(false);
                history.push({ role: 'model', content: fullResponse, feedback: null }); 
                updateCurrentSession(); 
                if (spinnerElement) spinnerElement.classList.add('reset-spin'); 
                if (indicatorTextElement) { indicatorTextElement.style.display = 'none'; indicatorTextElement.classList.add('completed'); }
                indicatorElement.classList.add('left-aligned');
                toggleImageMode(false);
            } else {
                throw new Error(data.error || "이미지 생성 실패");
            }

        } else {
            const requestBody = { 
                message: userMessage, 
                history: [PRE_PROMPT, ...history],
            };
            
            const lastUserMsg = history[history.length - 1];
            if(lastUserMsg && lastUserMsg.images && lastUserMsg.images.length > 0) {
                requestBody.images = lastUserMsg.images;
            }

            const response = await fetch(BACKEND_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify(requestBody), 
                signal: signal 
            });

            if (!response.ok) { throw new Error(`HTTP ${response.status}`); }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break; 
                
                const chunk = decoder.decode(value, { stream: true });
                
                if (chunk.includes("[DONE]")) {
                    const parts = chunk.split("[DONE]");
                    streamQueue += parts[0]; 
                    break;
                } else {
                    streamQueue += chunk;
                }
            }
            
            isNetworkFinished = true;
        }
    } catch (error) {
        if (error.name === 'AbortError') { 
            console.log('Fetch aborted'); 
        } 
        else {
            if(streamInterval) clearInterval(streamInterval); 
            const errorMsg = `⚠️ 오류: ${error.message}`;
            streamingBlockElement.innerHTML = `<p style="color:red;">${errorMsg}</p>`;
            if (spinnerElement) spinnerElement.classList.add('reset-spin');
            if (indicatorTextElement) { indicatorTextElement.textContent = '응답 오류'; indicatorTextElement.classList.add('completed'); }
            if (history.length > 0 && history[history.length - 1].role === 'user') { history.pop(); updateCurrentSession(); }
            updateRegenerateButtons();
            setStreamingState(false); 
            scrollToBottom(true); 
        }
    }
}

// ===========================================
// 5. 내보내기 및 가져오기 기능
// ===========================================

function exportChats() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "minsugpt_chats_" + new Date().toISOString().slice(0,10) + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importChats(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedSessions = JSON.parse(event.target.result);
            if (Array.isArray(importedSessions)) {
                sessions = [...importedSessions, ...sessions];
                
                const uniqueSessions = [];
                const map = new Map();
                for (const item of sessions) {
                    if(!map.has(item.id)){
                        map.set(item.id, true);
                        uniqueSessions.push(item);
                    }
                }
                sessions = uniqueSessions;
                
                saveSessions();
                renderSidebarList();
                if(sessions.length > 0) {
                    currentSessionId = sessions[0].id;
                    loadCurrentSession();
                }
                showSnackbar('채팅 내역을 불러왔습니다.');
                
                if (!isPC()) toggleSidebar(false);

            } else {
                alert('잘못된 파일 형식입니다.');
            }
        } catch(error) {
            alert('파일을 읽는 중 오류가 발생했습니다.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; 
}


// ===========================================
// 6. 이벤트 리스너
// ===========================================

if (btnCamera) btnCamera.addEventListener('click', () => { hiddenCameraInput.click(); });
if (btnAlbum) btnAlbum.addEventListener('click', () => { hiddenFileInput.click(); });
if (btnFile) btnFile.addEventListener('click', () => { hiddenFileInput.click(); });

if (hiddenCameraInput) hiddenCameraInput.addEventListener('change', handleFileSelect);
if (hiddenFileInput) hiddenFileInput.addEventListener('change', handleFileSelect);

if(miniSidebarNewChat) miniSidebarNewChat.addEventListener('click', () => { startNewChat(); });
if(miniSidebarSearch) miniSidebarSearch.addEventListener('click', () => { toggleSidebar(true); setTimeout(() => document.getElementById('sidebar-search-input').focus(), 300); });
if(miniSidebarDeleteAll) miniSidebarDeleteAll.addEventListener('click', resetAllChats);

// 🌟 [추가] 상단바 버튼 이벤트 리스너
if(headerNewChat) {
    headerNewChat.addEventListener('click', () => startNewChat());
}
if(headerUpdateLink) {
    headerUpdateLink.addEventListener('click', () => {
        window.open('https://minsugpt.kro.kr/app/update', '_blank');
    });
}


renameCancelBtn.addEventListener('click', closeCustomModals);
renameConfirmBtn.addEventListener('click', () => {
    const newTitle = renameInput.value.trim();
    if (newTitle && targetSessionIdForAction) {
        executeRenameSession(targetSessionIdForAction, newTitle);
        closeCustomModals();
    }
});
renameModalBackdrop.addEventListener('click', (e) => { if (e.target === renameModalBackdrop) closeCustomModals(); });

deleteCancelBtn.addEventListener('click', closeCustomModals);
deleteConfirmBtn.addEventListener('click', () => {
    if (deleteActionType === 'all') {
        executeResetAllChats();
    } else if (deleteActionType === 'single' && targetSessionIdForAction) {
        executeDeleteSession(targetSessionIdForAction);
    }
    closeCustomModals();
});
deleteModalBackdrop.addEventListener('click', (e) => { if (e.target === deleteModalBackdrop) closeCustomModals(); });


window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem(THEME_KEY) === 'auto') { applyTheme('auto'); }
});
themeBtns.forEach(btn => { btn.addEventListener('click', () => { applyTheme(btn.dataset.themeVal); }); });
uiStyleBtns.forEach(btn => { btn.addEventListener('click', () => { applyUIStyle(btn.dataset.style); }); });

if(toolImage) {
    toolImage.addEventListener('click', () => {
        toggleImageMode(!isImageMode);
    });
}
if(menuCreateImage) {
    menuCreateImage.addEventListener('click', () => {
        togglePlusModal(false); 
        toggleImageMode(true); 
    });
}
if(closeImageModeBtn) {
    closeImageModeBtn.addEventListener('click', () => {
        toggleImageMode(false);
    });
}

inputField.addEventListener('input', toggleSendButton);
inputField.addEventListener('input', autoResizeTextarea);
sendButton.addEventListener('click', () => sendMessage());
stopButton.addEventListener('click', stopResponse);

inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (!isMobile()) {
            if (e.shiftKey) { setTimeout(autoResizeTextarea, 0); return; }
            e.preventDefault(); 
            if (sendButton.classList.contains('active') && !isStreaming) {
                autoScrollEnabled = true; scrollDownButton.classList.remove('visible'); sendMessage();
            }
        }
    }
});

quickActionButtons.forEach(button => {
    button.addEventListener('click', () => {
        const prompt = button.getAttribute('data-prompt');
        if (prompt) {
            inputField.value = prompt; autoResizeTextarea();
            autoScrollEnabled = true; scrollDownButton.classList.remove('visible');
            sendMessage(null, false); 
        }
    });
});

plusButton.addEventListener('click', (e) => { e.preventDefault(); togglePlusModal(); });
plusModalBackdrop.addEventListener('click', (e) => { if (e.target === plusModalBackdrop) togglePlusModal(false); });

settingsButton.addEventListener('click', (e) => { e.preventDefault(); toggleSettingsModal(); });
settingsModalBackdrop.addEventListener('click', (e) => { if (e.target === settingsModalBackdrop) toggleSettingsModal(false); });

if(aboutButton) {
    aboutButton.addEventListener('click', (e) => { 
        e.preventDefault(); 
        toggleSettingsModal(false); 
        setTimeout(() => { toggleAboutModal(true); }, 200); 
    });
}
aboutModalBackdrop.addEventListener('click', (e) => { if (e.target === aboutModalBackdrop) toggleAboutModal(false); });

resetChatButton.addEventListener('click', (e) => { e.preventDefault(); toggleResetConfirmModal(true); });
confirmCancelBtn.addEventListener('click', () => toggleResetConfirmModal(false));
confirmResetBtn.addEventListener('click', () => {
    history = [];
    currentAttachments = [];
    renderAttachments();
    updateCurrentSession();
    renderChatMessages();
    toggleResetConfirmModal(false);
    showSnackbar("현재 대화가 초기화되었습니다.");
});
resetConfirmModalBackdrop.addEventListener('click', (e) => { if (e.target === resetConfirmModalBackdrop) toggleResetConfirmModal(false); });

contentWrapper.addEventListener('scroll', () => {
    const distanceFromBottom = contentWrapper.scrollHeight - contentWrapper.scrollTop - contentWrapper.clientHeight;
    
    if (distanceFromBottom <= 5) { 
        autoScrollEnabled = true; 
        scrollDownButton.classList.remove('visible'); 
    } 
    else if (distanceFromBottom > 100) { 
        autoScrollEnabled = false;
        if (!isStreaming) { 
            scrollDownButton.classList.add('visible'); 
        }
    }
});

if(scrollDownButton) {
    scrollDownButton.addEventListener('click', () => { 
        scrollToBottom(true); 
        scrollDownButton.classList.remove('visible'); 
        autoScrollEnabled = true; 
    });
}

const toolAttach = document.getElementById('tool-attach');
if(toolAttach) { toolAttach.addEventListener('click', (e) => { e.preventDefault(); togglePlusModal(true); }); }

if(toolStudy) { toolStudy.addEventListener('click', () => { toolStudy.classList.toggle('active-blue'); }); }

menuButton.addEventListener('click', () => toggleSidebar()); 
sidebarClose.addEventListener('click', () => toggleSidebar(false));
sidebarBackdrop.addEventListener('click', (e) => { if(e.target === sidebarBackdrop) toggleSidebar(false); });
sidebarNewChat.addEventListener('click', () => startNewChat());
sidebarSearchInput.addEventListener('input', renderSidebarList);
sidebarDeleteAll.addEventListener('click', resetAllChats);

sidebarExport.addEventListener('click', () => {
    exportChats();
    if (!isPC()) toggleSidebar(false);
});

sidebarImport.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', importChats);

// ===========================================
// 7. 초기화
// ===========================================

window.onload = function() {
    loadTheme();
    loadUIStyle(); 
    loadSessions(); 
    startNewChat(false); 
    toggleSendButton();
    autoResizeTextarea();
    
    if (isPC()) {
        setTimeout(() => {
            toggleSidebar(true);
        }, 100);
    }
    
    setTimeout(() => scrollToBottom(false), 10);
    setTimeout(() => scrollToBottom(true), 100);
    animateUIOnLoad();
};
