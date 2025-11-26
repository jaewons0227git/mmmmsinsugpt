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

// 🌟 사이드바 및 채팅 관리 관련 DOM
const menuButton = document.getElementById('menu-button');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const sidebarNewChatBtn = document.getElementById('sidebar-new-chat-btn');
const chatHistoryList = document.getElementById('chat-history-list');
const chatSearchInput = document.getElementById('chat-search-input');

// 🎯 백엔드 엔드포인트
const BACKEND_ENDPOINT = "https://jaewondev.pythonanywhere.com/ask"; 
const IMAGE_ENDPOINT = "https://jaewondev.pythonanywhere.com/generate-image"; 

const HISTORY_STORAGE_KEY = 'minsugpt_chat_history'; // 구버전 호환용
const ALL_CHATS_KEY = 'minsugpt_all_chats'; // 🌟 다중 채팅 저장 키
const UI_STYLE_KEY = 'minsugpt_ui_style'; 
const THEME_KEY = 'minsugpt_theme'; 

let history = []; 
let allChats = []; // 🌟 모든 채팅 목록을 저장하는 배열
let currentChatId = null; // 🌟 현재 보고 있는 채팅의 ID (null이면 새 채팅)

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

// ===========================================
// 3. 사이드바 및 다중 채팅 관리 로직 (🌟 핵심 수정 부분)
// ===========================================

// 🌟 사이드바 열기/닫기
function toggleSidebar(show) {
    if (show === undefined) {
        const isOpen = sidebar.classList.contains('open');
        toggleSidebar(!isOpen);
    } else if (show) {
        sidebar.classList.add('open');
        sidebarBackdrop.classList.add('visible');
    } else {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('visible');
    }
}

// 🌟 채팅 목록 로드 및 데이터 마이그레이션
function loadAllChats() {
    const storedAllChats = localStorage.getItem(ALL_CHATS_KEY);
    
    if (storedAllChats) {
        try {
            allChats = JSON.parse(storedAllChats);
        } catch (e) {
            allChats = [];
        }
    } else {
        // 기존 단일 채팅 기록이 있다면 마이그레이션
        const oldHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (oldHistory) {
            try {
                const parsedOld = JSON.parse(oldHistory);
                const validHistory = parsedOld.filter(msg => msg.role === 'user' || msg.role === 'model');
                if (validHistory.length > 0) {
                    // 첫 메세지를 제목으로 사용
                    const firstMsg = validHistory.find(m => m.role === 'user');
                    let title = "이전 대화 기록";
                    if (firstMsg) {
                        title = firstMsg.content.slice(0, 20);
                        if(firstMsg.content.length > 20) title += "...";
                    }
                    
                    const newChat = {
                        id: Date.now().toString(),
                        title: title,
                        messages: validHistory,
                        updatedAt: Date.now()
                    };
                    allChats.push(newChat);
                    saveAllChats(); // 새 키에 저장
                    localStorage.removeItem(HISTORY_STORAGE_KEY); // 구버전 키 삭제
                }
            } catch(e) { /* ignore */ }
        }
    }
    
    renderChatList();
}

// 🌟 채팅 목록 렌더링
function renderChatList(filterText = "") {
    chatHistoryList.innerHTML = '';
    
    // 날짜 내림차순 정렬
    const sortedChats = [...allChats].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    sortedChats.forEach(chat => {
        if (filterText && !chat.title.toLowerCase().includes(filterText.toLowerCase())) {
            return; 
        }

        const item = document.createElement('div');
        item.className = 'chat-item';
        if (currentChatId === chat.id) item.classList.add('active');
        
        // 아이템 클릭 시 해당 채팅 로드
        item.addEventListener('click', (e) => {
            // 액션 버튼 클릭 시 이벤트 전파 방지
            if (e.target.closest('.chat-item-action-btn')) return;
            switchChat(chat.id);
            if (isMobile()) toggleSidebar(false);
        });

        // HTML 구성
        item.innerHTML = `
            <div class="chat-item-title">${chat.title}</div>
            <div class="chat-item-actions">
                <div class="chat-item-action-btn edit-btn" title="이름 수정">
                    <span class="material-symbols-rounded">edit</span>
                </div>
                <div class="chat-item-action-btn delete-btn" title="삭제">
                    <span class="material-symbols-rounded">delete</span>
                </div>
            </div>
        `;
        
        // 수정 버튼 로직
        const editBtn = item.querySelector('.edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newTitle = prompt("채팅 이름을 수정하세요:", chat.title);
            if (newTitle !== null && newTitle.trim() !== "") {
                chat.title = newTitle.trim();
                saveAllChats();
                renderChatList(filterText);
            }
        });

        // 삭제 버튼 로직
        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`'${chat.title}' 채팅을 삭제하시겠습니까?`)) {
                deleteChat(chat.id);
            }
        });

        chatHistoryList.appendChild(item);
    });
}

// 🌟 채팅 삭제
function deleteChat(chatId) {
    allChats = allChats.filter(c => c.id !== chatId);
    saveAllChats();
    
    if (currentChatId === chatId) {
        startNewChat(); // 현재 보고 있던 채팅이면 홈으로
    } else {
        renderChatList(chatSearchInput.value);
    }
}

// 🌟 모든 채팅 저장
function saveAllChats() {
    localStorage.setItem(ALL_CHATS_KEY, JSON.stringify(allChats));
}

// 🌟 채팅 전환
function switchChat(chatId) {
    const chat = allChats.find(c => c.id === chatId);
    if (!chat) return;

    currentChatId = chatId;
    history = [...chat.messages]; // 복사해서 사용
    
    // UI 업데이트
    renderChatList(chatSearchInput.value);
    updateChatUI();
}

// 🌟 새 채팅 시작 (홈 화면으로 이동)
function startNewChat() {
    currentChatId = null;
    history = [];
    renderChatList(chatSearchInput.value);
    
    // UI 초기화
    chatMessages.innerHTML = '';
    chatMessages.style.display = 'none';
    initialContent.style.opacity = '1';
    initialContent.style.display = 'flex';
    initialContent.style.visibility = 'visible';
    
    contentWrapper.classList.remove('loaded');
    composer.classList.remove('loaded');
    toggleImageMode(false);
    setTimeout(animateUIOnLoad, 10);
}

// 🌟 현재 UI 상태 업데이트 (메세지 표시)
function updateChatUI() {
    chatMessages.innerHTML = '';
    
    if (history.length > 0) {
        initialContent.style.opacity = '0';
        initialContent.style.visibility = 'hidden';
        setTimeout(() => { initialContent.style.display = 'none'; }, 200);
        
        chatMessages.style.display = 'flex';
        history.forEach(message => {
            if (message.role === 'user') { appendUserMessage(message.content, false); } 
            else if (message.role === 'model') { 
                if (message.content.includes('<img src="data:image') || message.content.includes('<img src="https:')) {
                    appendBotImage(message.content, false);
                } else {
                    appendBotMessage(message.content, message.feedback, false); 
                }
            }
        });
        updateRegenerateButtons();
        setTimeout(() => scrollToBottom(false), 100);
    } else {
        // 빈 채팅이면 홈 화면
        chatMessages.style.display = 'none';
        initialContent.style.visibility = 'visible'; 
        initialContent.style.display = 'flex';
        initialContent.style.opacity = '1';
    }
    autoResizeTextarea();
}


// ===========================================
// 4. 입력창 및 메시지 UI 관련 함수 (기존 로직 유지)
// ===========================================

// 스크롤 버튼 표시/숨김을 관리하는 함수
function toggleScrollButton() {
    if (!contentWrapper || !scrollDownButton) return;

    const currentScroll = contentWrapper.scrollTop;
    const maxScroll = contentWrapper.scrollHeight - contentWrapper.clientHeight;
    
    // 맨 아래로부터 100px 이상 떨어져 있을 때 버튼 표시
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
        scrollDownButton.style.bottom = `${composerHeight + 10}px`;
    }
    chatMessages.style.paddingBottom = `${composerHeight + 50}px`;
}

function appendUserMessage(content, animate = true) {
    const userBubble = document.createElement('div');
    userBubble.className = 'message-bubble user-message';
    userBubble.innerHTML = `<div class="message-text">${content.replace(/\n/g, '<br>')}</div>`;
    chatMessages.appendChild(userBubble);
    if (animate && autoScrollEnabled) scrollToBottom(true);
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
    if (animate && autoScrollEnabled) scrollToBottom(true);
}

function appendBotMessage(content, feedbackStatus = null, animate = true) {
    const botMessageContainer = document.createElement('div');
    botMessageContainer.className = 'bot-message';
    const messageIndex = history.length;
    botMessageContainer.setAttribute('data-index', messageIndex); 

    const streamingBlock = document.createElement('div');
    streamingBlock.className = 'streaming-block'; 
    
    // 📢 Markdown 렌더링 (marked 라이브러리 사용)
    streamingBlock.innerHTML = typeof marked !== 'undefined' ? marked.parse(content) : content;
    
    botMessageContainer.appendChild(streamingBlock);

    const actionContainer = createBotActions(content, messageIndex, feedbackStatus);
    botMessageContainer.appendChild(actionContainer);
    
    chatMessages.appendChild(botMessageContainer);
    if (animate && autoScrollEnabled) scrollToBottom(true);
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
        
        // 🌟 피드백 저장 시 전체 채팅 업데이트
        updateCurrentChatHistory();
        
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
    updateCurrentChatHistory(); // 🌟 저장
    
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
    // 메시지 컨테이너 추가 시 자동 스크롤
    if (autoScrollEnabled) scrollToBottom(true);
    
    return { botMessageElement: botMessageContainer, indicatorElement: indicatorContainer, streamingBlockElement: streamingBlock, spinnerElement: spinner, indicatorTextElement: indicatorText };
}

function setStreamingState(active) {
    isStreaming = active;
    if (active) {
        sendButton.style.display = 'none'; stopButton.style.display = 'flex'; inputField.setAttribute('readonly', 'true');
        // 🌟 [핵심] 스트리밍 시작 시 자동 스크롤 활성화 및 버튼 숨김
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
        updateCurrentChatHistory(); // 🌟 저장
        
        const actionContainer = createBotActions(fullResponse, history.length - 1);
        lastBotMessageElement.appendChild(actionContainer); updateRegenerateButtons();
    }

    setStreamingState(false); scrollToBottom(true);
}

// 🌟 채팅 기록 업데이트 함수 (현재 chatID에 history 동기화)
function updateCurrentChatHistory() {
    if (currentChatId) {
        const chatIndex = allChats.findIndex(c => c.id === currentChatId);
        if (chatIndex !== -1) {
            allChats[chatIndex].messages = [...history];
            allChats[chatIndex].updatedAt = Date.now();
            saveAllChats();
            // 사이드바 목록 갱신 (시간순 정렬 등 반영을 위해) - 너무 잦은 갱신을 방지하려면 생략 가능하나 여기선 반영
            // renderChatList(chatSearchInput.value); 
        }
    }
}


async function sendMessage(userMessageOverride = null, isRegenerate = false) {
    const userMessage = userMessageOverride !== null ? userMessageOverride : inputField.value.trim();
    if (userMessage.length === 0 || isStreaming) { if (isStreaming) showSnackbar('현재 답변 생성 중입니다.'); return; }

    // 🌟 1. 새 채팅인 경우 채팅 생성 로직
    if (!currentChatId && !isRegenerate) {
        // 제목 자동 생성 (앞 20자)
        let newTitle = userMessage.slice(0, 20);
        if (userMessage.length > 20) newTitle += "...";
        
        const newChat = {
            id: Date.now().toString(),
            title: newTitle,
            messages: [],
            updatedAt: Date.now()
        };
        allChats.push(newChat);
        currentChatId = newChat.id;
        saveAllChats();
        renderChatList(); // 사이드바에 추가
    }

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
        appendUserMessage(userMessage); 
        history.push({ role: 'user', content: userMessage }); 
        updateCurrentChatHistory(); // 🌟 사용자 메세지 저장
    } 
    
    if (userMessageOverride === null) { inputField.value = ''; inputField.rows = MIN_ROWS; autoResizeTextarea(); }
    
    const { botMessageElement, indicatorElement, streamingBlockElement, spinnerElement, indicatorTextElement } = appendBotMessageContainer();
    
    setStreamingState(true);
    abortController = new AbortController();
    const signal = abortController.signal;
    
    fullResponse = ""; 
    
    try {
        if (isImageMode) {
            // 🖼️ 이미지 생성 모드 (기존 유지)
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
                updateCurrentChatHistory(); // 🌟 저장
                if (spinnerElement) spinnerElement.classList.add('reset-spin'); 
                if (indicatorTextElement) { indicatorTextElement.textContent = '이미지 생성 완료'; indicatorTextElement.classList.add('completed'); }
                indicatorElement.classList.add('left-aligned');
                toggleImageMode(false);
            } else {
                throw new Error(data.error || "이미지 생성 실패");
            }

        } else {
            // 📝 텍스트 생성 모드 (개선된 스트리밍)
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
            
            // 📢 Google AI API 스트리밍 대응 로직
            while (true) {
                const { done, value } = await reader.read();
                if (done) break; 
                
                const chunk = decoder.decode(value, { stream: true });
                
                // [DONE] 처리 및 텍스트 누적
                if (chunk.includes("[DONE]")) {
                    const parts = chunk.split("[DONE]");
                    fullResponse += parts[0]; 
                    // 마지막 렌더링
                    streamingBlockElement.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullResponse) : fullResponse;
                    break;
                } else {
                    fullResponse += chunk;
                    // 실시간 렌더링 및 스크롤
                    streamingBlockElement.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullResponse) : fullResponse;
                    // 🌟 [핵심] autoScrollEnabled가 true일 때만, 부드럽지 않은(auto) 스크롤로 지속적으로 맨 아래로 이동
                    if (autoScrollEnabled) scrollToBottom(false);
                }
            }
            
            // 완료 처리
            setStreamingState(false);
            history.push({ role: 'model', content: fullResponse, feedback: null }); 
            updateCurrentChatHistory(); // 🌟 저장
            
            if (spinnerElement) spinnerElement.classList.add('reset-spin'); 
            if (indicatorTextElement) { indicatorTextElement.textContent = '답변 완료됨'; indicatorTextElement.classList.add('completed'); }
            indicatorElement.classList.add('left-aligned'); 
            
            const actionContainer = createBotActions(fullResponse, history.length - 1);
            botMessageElement.appendChild(actionContainer); updateRegenerateButtons();
            // 스트리밍이 완료되면 최종적으로 부드럽게 스크롤
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
            if (history.length > 0 && history[history.length - 1].role === 'user') { 
                history.pop(); 
                updateCurrentChatHistory(); // 실패시 저장 동기화
            }
            updateRegenerateButtons();
        }
        setStreamingState(false); scrollToBottom(true); 
    }
}

/**
 * 스크롤을 맨 아래로 이동시키는 함수
 * @param {boolean} smooth - 부드러운 스크롤 여부
 */
function scrollToBottom(smooth = true) {
    const behavior = smooth ? 'smooth' : 'auto';
    contentWrapper.scrollTo({ top: contentWrapper.scrollHeight, behavior: behavior });
    toggleScrollButton();
}

// ===========================================
// 5. 이벤트 리스너
// ===========================================

// 🌟 사이드바 관련 이벤트 리스너
menuButton.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(true); });
sidebarCloseBtn.addEventListener('click', () => toggleSidebar(false));
sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));
sidebarNewChatBtn.addEventListener('click', () => {
    startNewChat();
    if(isMobile()) toggleSidebar(false);
});
chatSearchInput.addEventListener('input', (e) => {
    renderChatList(e.target.value);
});


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
                // 메시지 전송 시 자동 스크롤 활성화 및 버튼 숨김
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
            // 퀵액션 사용 시 자동 스크롤 활성화 및 버튼 숨김
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

resetChatButton.addEventListener('click', (e) => { 
    // 🌟 대화 초기화 -> 현재 채팅만 삭제하거나, 전체 초기화 (여기선 전체 초기화 로직 유지하되 수정)
    toggleResetConfirmModal(true); 
});
confirmCancelBtn.addEventListener('click', () => toggleResetConfirmModal(false));
confirmResetBtn.addEventListener('click', () => {
    // 🌟 초기화 시 모든 채팅 삭제
    allChats = [];
    localStorage.removeItem(ALL_CHATS_KEY);
    startNewChat();
    toggleResetConfirmModal(false);
    showSnackbar("모든 대화가 초기화되었습니다.");
});
resetConfirmModalBackdrop.addEventListener('click', (e) => { if (e.target === resetConfirmModalBackdrop) toggleResetConfirmModal(false); });

// 스크롤 및 스크롤 다운 버튼 로직
contentWrapper.addEventListener('scroll', () => {
    // 1. 현재 맨 아래로부터 떨어진 거리
    const distanceFromBottom = contentWrapper.scrollHeight - contentWrapper.scrollTop - contentWrapper.clientHeight;
    
    // 2. 맨 아래에 도달했을 때 (1px 오차 허용)
    if (distanceFromBottom <= 1) { 
        // 🚨 중요: 맨 아래에 있다면 자동 스크롤 활성화 상태로 간주
        autoScrollEnabled = true; 
        scrollDownButton.classList.remove('visible'); 
    } 
    // 3. 사용자가 위로 스크롤하여 맨 아래에서 100px 이상 떨어졌을 때
    else if (distanceFromBottom > 100) { 
        autoScrollEnabled = false;
        // 🚨 중요: 스트리밍 중이 아닐 때만 버튼을 표시
        if (!isStreaming) { 
            scrollDownButton.classList.add('visible'); 
        }
    }
});

// 스크롤 다운 버튼 클릭 이벤트 리스너
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

// ===========================================
// 6. 초기화
// ===========================================

window.onload = function() {
    loadTheme();
    loadUIStyle(); 
    loadAllChats(); // 🌟 모든 채팅 로드 및 초기화
    
    // 🌟 페이지 로드 시 항상 홈 화면(빈 상태)으로 시작
    startNewChat();
    
    toggleSendButton();
    autoResizeTextarea();
    animateUIOnLoad();
};
