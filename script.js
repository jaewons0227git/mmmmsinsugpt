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

// 🌟 사이드바 토글 함수 (PC Push 효과 포함)
function toggleSidebar(show) {
    if (show === undefined) { 
        // 토글 동작
        const isVisible = sidebarBackdrop.classList.contains('visible');
        if (isVisible) {
            sidebarBackdrop.classList.remove('visible');
            document.body.classList.remove('sidebar-open'); // PC Push용 클래스 제거
        } else {
            renderSidebarList();
            sidebarBackdrop.classList.add('visible');
            document.body.classList.add('sidebar-open'); // PC Push용 클래스 추가
        }
    }
    else if (show) { 
        renderSidebarList(); 
        sidebarBackdrop.classList.add('visible'); 
        document.body.classList.add('sidebar-open'); // PC Push용 클래스 추가
    }
    else { 
        sidebarBackdrop.classList.remove('visible'); 
        document.body.classList.remove('sidebar-open'); // PC Push용 클래스 제거
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
        // 기존 단일 히스토리 마이그레이션
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
    
    // 마지막 세션 혹은 새 세션 로드
    if (sessions.length > 0) {
        // 최근 세션을 불러옴
        if (!currentSessionId) {
            currentSessionId = sessions[0].id;
        }
        loadCurrentSession();
    } else {
        startNewChat(false);
    }
}

function startNewChat(skipRender = false) {
    currentSessionId = generateSessionId();
    history = [];
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
        toggleSidebar(false);
    }
}

function loadCurrentSession() {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) {
        // 세션이 없으면 새로 생성
        startNewChat();
        return;
    }
    history = session.messages;
    renderChatMessages();
}

function deleteSession(id, e) {
    if(e) e.stopPropagation();
    if(!confirm('이 채팅을 삭제하시겠습니까?')) return;
    
    sessions = sessions.filter(s => s.id !== id);
    saveSessions();
    
    if (currentSessionId === id) {
        if (sessions.length > 0) {
            currentSessionId = sessions[0].id;
            loadCurrentSession();
        } else {
            startNewChat();
        }
    }
    renderSidebarList();
}

function renameSession(id, e) {
    if(e) e.stopPropagation();
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    
    const newTitle = prompt('채팅 이름 변경:', session.title);
    if (newTitle) {
        session.title = newTitle;
        saveSessions();
        renderSidebarList();
    }
}

function updateCurrentSession() {
    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
        session.messages = history;
        // 첫 메시지로 제목 자동 설정 (제목이 '새로운 채팅'일 경우만)
        if (session.title === '새로운 채팅' && history.length > 0) {
            session.title = history[0].content.substring(0, 30);
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
            toggleSidebar(false);
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
            if (message.role === 'user') { appendUserMessage(message.content, false); } 
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
    // 렌더링 직후 스크롤 최하단 이동
    setTimeout(() => scrollToBottom(false), 0);
}

function resetAllChats() {
    if(!confirm('정말로 모든 대화 기록을 삭제하시겠습니까?')) return;
    sessions = [];
    localStorage.removeItem(SESSIONS_STORAGE_KEY);
    startNewChat();
    toggleSidebar(false);
    showSnackbar('모든 대화가 삭제되었습니다.');
}

// ===========================================
// 4. 입력창 및 메시지 UI 관련 함수
// ===========================================

/**
 * 스크롤을 맨 아래로 이동시키는 함수
 * @param {boolean} smooth - 부드러운 스크롤 여부
 */
function scrollToBottom(smooth = true) {
    if (!contentWrapper) return;
    
    // JS 제어로 스크롤
    // contentWrapper는 이제 유일한 스크롤 컨테이너입니다.
    if (smooth) {
        contentWrapper.scrollTo({ top: contentWrapper.scrollHeight, behavior: 'smooth' });
    } else {
        contentWrapper.scrollTop = contentWrapper.scrollHeight;
    }
    
    toggleScrollButton();
}

// 스크롤 버튼 표시/숨김을 관리하는 함수
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
    if (inputField.value.trim().length > 0 && !isStreaming) { sendButton.classList.add('active'); } 
    else { sendButton.classList.remove('active'); }
}

function autoResizeTextarea() {
    const style = getComputedStyle(inputField);
    const line_height_px = parseFloat(style.getPropertyValue('--line-height-px')) || 22.4; 
    const minInputContainerHeight = parseFloat(style.getPropertyValue('--min-input-container-height')) || 48; 

    inputField.rows = MIN_ROWS;
    inputField.style.height = 'auto'; 
    let scrollH = inputField.scrollHeight;
    let newRows = Math.round(scrollH / line_height_px);
    newRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, newRows));
    inputField.rows = newRows;
    inputField.style.height = 'auto';
    
    const finalTextareaHeight = inputField.offsetHeight; 
    let contentHeight = finalTextareaHeight + 8; 
    
    if (isImageMode && !composer.classList.contains('style-simple')) {
         contentHeight += 40; 
    }

    const inputContainerHeight = Math.max(contentHeight, minInputContainerHeight);
    
    inputContainer.style.minHeight = `${inputContainerHeight}px`;

    const composerHeight = composer.offsetHeight;
    if(scrollDownButton) {
        // 스크롤 버튼 위치 조정
        scrollDownButton.style.bottom = `${composerHeight + 20}px`;
    }
    chatMessages.style.paddingBottom = `${composerHeight + 20}px`;
}

function appendUserMessage(content, animate = true) {
    const userBubble = document.createElement('div');
    userBubble.className = 'message-bubble user-message';
    userBubble.innerHTML = `<div class="message-text">${content.replace(/\n/g, '<br>')}</div>`;
    chatMessages.appendChild(userBubble);
    if (animate) scrollToBottom(true);
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
    
    // Markdown 렌더링
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
        updateCurrentSession(); // 저장
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
    // 재생성 시작 시 자동 스크롤 활성화 및 버튼 숨김
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
    
    // 컨테이너 추가 직후 강제 스크롤
    scrollToBottom(false);
    
    return { botMessageElement: botMessageContainer, indicatorElement: indicatorContainer, streamingBlockElement: streamingBlock, spinnerElement: spinner, indicatorTextElement: indicatorText };
}

function setStreamingState(active) {
    isStreaming = active;
    if (active) {
        sendButton.style.display = 'none'; stopButton.style.display = 'flex'; inputField.setAttribute('readonly', 'true');
        // 스트리밍 시작 시 강제 스크롤 활성화
        autoScrollEnabled = true; scrollDownButton.classList.remove('visible');
    } else {
        sendButton.style.display = 'flex'; stopButton.style.display = 'none'; inputField.removeAttribute('readonly'); abortController = null;
    }
    toggleSendButton();
}

let fullResponse = ""; 

function stopResponse() {
    showSnackbar("답변 중지됨.");
    if (abortController) {
        abortController.abort();
    }
    
    // 현재 답변 저장 및 마무리
    const lastBotMessageElement = chatMessages.lastElementChild;
    if (lastBotMessageElement) {
        const indicatorContainer = lastBotMessageElement.querySelector('#thinking-indicator');
        if (indicatorContainer) {
            const spinner = indicatorContainer.querySelector('.loading-spinner');
            const indicatorText = indicatorContainer.querySelector('.thinking-indicator-text');
            
            if (spinner) spinner.classList.add('reset-spin'); 
            if (indicatorText) { indicatorText.textContent = '답변 중지됨'; indicatorText.classList.add('completed'); }
            indicatorContainer.classList.add('left-aligned'); 
        }

        const stopText = document.createElement('div'); stopText.className = 'stop-message'; stopText.textContent = "답변 중지됨.";
        lastBotMessageElement.insertAdjacentElement('afterend', stopText);
        
        history.push({ role: 'model', content: fullResponse, feedback: null }); 
        updateCurrentSession(); // 저장
        
        const actionContainer = createBotActions(fullResponse, history.length - 1);
        lastBotMessageElement.appendChild(actionContainer); updateRegenerateButtons();
    }

    setStreamingState(false); scrollToBottom(true);
}


async function sendMessage(userMessageOverride = null, isRegenerate = false) {
    const userMessage = userMessageOverride !== null ? userMessageOverride : inputField.value.trim();
    if (userMessage.length === 0 || isStreaming) { if (isStreaming) showSnackbar('현재 답변 생성 중입니다.'); return; }

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
        appendUserMessage(userMessage); history.push({ role: 'user', content: userMessage }); 
        updateCurrentSession(); // 저장
    } 
    
    if (userMessageOverride === null) { inputField.value = ''; inputField.rows = MIN_ROWS; autoResizeTextarea(); }
    
    const { botMessageElement, indicatorElement, streamingBlockElement, spinnerElement, indicatorTextElement } = appendBotMessageContainer();
    
    setStreamingState(true);
    abortController = new AbortController();
    const signal = abortController.signal;
    
    fullResponse = ""; 
    
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
                const imgHtml = `<img src="${data.image_data}" alt="Generated Image" style="max-width: 100%; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`;
                fullResponse = imgHtml;
                streamingBlockElement.innerHTML = fullResponse;
                setStreamingState(false);
                history.push({ role: 'model', content: fullResponse, feedback: null }); 
                updateCurrentSession(); // 저장
                if (spinnerElement) spinnerElement.classList.add('reset-spin'); 
                if (indicatorTextElement) { indicatorTextElement.textContent = '이미지 생성 완료'; indicatorTextElement.classList.add('completed'); }
                indicatorElement.classList.add('left-aligned');
                toggleImageMode(false);
            } else {
                throw new Error(data.error || "이미지 생성 실패");
            }

        } else {
            const response = await fetch(BACKEND_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ 
                    message: userMessage, 
                    history: [PRE_PROMPT, ...history],
                }), 
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
                    fullResponse += parts[0]; 
                    streamingBlockElement.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullResponse) : fullResponse;
                    contentWrapper.scrollTop = contentWrapper.scrollHeight; // 강제 스크롤
                    break;
                } else {
                    fullResponse += chunk;
                    streamingBlockElement.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullResponse) : fullResponse;
                    // 🌟 [핵심] 스트리밍 중에는 무조건 맨 아래로 즉시 이동 (부드러움 X, 즉시)
                    contentWrapper.scrollTop = contentWrapper.scrollHeight;
                }
            }
            
            setStreamingState(false);
            history.push({ role: 'model', content: fullResponse, feedback: null }); 
            updateCurrentSession(); // 저장
            
            if (spinnerElement) spinnerElement.classList.add('reset-spin'); 
            if (indicatorTextElement) { indicatorTextElement.textContent = '답변 완료됨'; indicatorTextElement.classList.add('completed'); }
            indicatorElement.classList.add('left-aligned'); 
            
            const actionContainer = createBotActions(fullResponse, history.length - 1);
            botMessageElement.appendChild(actionContainer); updateRegenerateButtons();
            scrollToBottom(true);
        }
    } catch (error) {
        if (error.name === 'AbortError') { 
            console.log('Fetch aborted'); 
        } 
        else {
            const errorMsg = `⚠️ 오류: ${error.message}`;
            streamingBlockElement.innerHTML = `<p style="color:red;">${errorMsg}</p>`;
            if (spinnerElement) spinnerElement.classList.add('reset-spin');
            if (indicatorTextElement) { indicatorTextElement.textContent = '응답 오류'; indicatorTextElement.classList.add('completed'); }
            if (history.length > 0 && history[history.length - 1].role === 'user') { history.pop(); updateCurrentSession(); }
            updateRegenerateButtons();
        }
        setStreamingState(false); scrollToBottom(true); 
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
                // 기존 세션에 병합하거나 덮어쓰기 선택 가능하지만 여기선 병합
                sessions = [...importedSessions, ...sessions];
                
                // 중복 ID 제거 (단순 병합 시 발생 가능)
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
                toggleSidebar(false);
                showSnackbar('채팅 내역을 불러왔습니다.');
            } else {
                alert('잘못된 파일 형식입니다.');
            }
        } catch(error) {
            alert('파일을 읽는 중 오류가 발생했습니다.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // 초기화
}


// ===========================================
// 6. 이벤트 리스너
// ===========================================

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
    // 현재 세션만 초기화
    history = [];
    updateCurrentSession();
    renderChatMessages();
    toggleResetConfirmModal(false);
    showSnackbar("현재 대화가 초기화되었습니다.");
});
resetConfirmModalBackdrop.addEventListener('click', (e) => { if (e.target === resetConfirmModalBackdrop) toggleResetConfirmModal(false); });

// 스크롤 및 스크롤 다운 버튼 로직
// 🌟 contentWrapper가 이제 실제 스크롤 이벤트를 발생시킵니다.
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

// 🌟 사이드바 및 새 기능 이벤트 리스너
menuButton.addEventListener('click', () => toggleSidebar()); // 토글 동작으로 변경
sidebarClose.addEventListener('click', () => toggleSidebar(false));
sidebarBackdrop.addEventListener('click', (e) => { if(e.target === sidebarBackdrop) toggleSidebar(false); });
sidebarNewChat.addEventListener('click', () => startNewChat());
sidebarSearchInput.addEventListener('input', renderSidebarList);
sidebarDeleteAll.addEventListener('click', resetAllChats);
sidebarExport.addEventListener('click', exportChats);
sidebarImport.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', importChats);

// ===========================================
// 7. 초기화
// ===========================================

window.onload = function() {
    loadTheme();
    loadUIStyle(); 
    loadSessions(); // 🌟 loadChatHistory 대신 loadSessions 사용
    toggleSendButton();
    autoResizeTextarea();
    
    // 페이지 로드 시 항상 맨 아래로 즉시 스크롤 (타이밍 보정)
    setTimeout(() => scrollToBottom(false), 10);
    setTimeout(() => scrollToBottom(true), 100);
    animateUIOnLoad();
};
