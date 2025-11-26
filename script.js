document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
document.onkeydown = function(e) {
  if (e.keyCode == 123) { e.preventDefault(); return false; } 
  if (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0) || e.keyCode == 'C'.charCodeAt(0))) { e.preventDefault(); return false; } 
  if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) { e.preventDefault(); return false; } 
};

// ===========================================
// 1. DOM 요소 및 상수 정의
// ===========================================

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
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const menuBtn = document.getElementById('menu-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const sidebarNewChatBtn = document.getElementById('sidebar-new-chat');
const chatListContainer = document.getElementById('chat-list-container');
const chatSearchInput = document.getElementById('chat-search-input');
const headerTitle = document.getElementById('header-title');

// 🎯 백엔드 엔드포인트
const BACKEND_ENDPOINT = "https://jaewondev.pythonanywhere.com/ask"; 
const IMAGE_ENDPOINT = "https://jaewondev.pythonanywhere.com/generate-image"; 

const STORAGE_KEY_CHATS = 'minsugpt_chats_v2'; // 다중 채팅 저장용 키
const UI_STYLE_KEY = 'minsugpt_ui_style'; 
const THEME_KEY = 'minsugpt_theme'; 

// 🌟 상태 변수
let allChats = []; // 모든 채팅 목록 [{id, title, messages, lastModified}]
let currentChatId = null; // 현재 선택된 채팅 ID (null이면 홈 화면/새 채팅 대기)
let currentMessages = []; // 현재 화면에 보여질 메시지 (allChats와 동기화)

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

if (typeof marked !== 'undefined') {
    marked.setOptions({ breaks: true, gfm: true });
}

// ===========================================
// 2. 초기화 및 저장소 로드
// ===========================================

function init() {
    loadTheme();
    loadUIStyle(); 
    loadChatsFromStorage();
    renderChatList();
    
    // 처음에 로드 시 홈 화면 보여주기 (currentChatId = null)
    switchToHomeView();

    toggleSendButton();
    autoResizeTextarea();
}

function loadChatsFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY_CHATS);
    if (stored) {
        try {
            allChats = JSON.parse(stored);
            // 날짜순 정렬 (최신순)
            allChats.sort((a, b) => b.lastModified - a.lastModified);
        } catch (e) {
            allChats = [];
        }
    } else {
        // 기존 단일 히스토리 마이그레이션 (옵션)
        const oldHistory = localStorage.getItem('minsugpt_chat_history');
        if (oldHistory) {
            try {
                const parsed = JSON.parse(oldHistory);
                if (parsed.length > 0) {
                    const migratedChat = {
                        id: Date.now().toString(),
                        title: "이전 대화 기록",
                        messages: parsed.filter(m => m.role === 'user' || m.role === 'model'),
                        lastModified: Date.now()
                    };
                    allChats.push(migratedChat);
                    saveChatsToStorage();
                    localStorage.removeItem('minsugpt_chat_history'); // 구버전 삭제
                }
            } catch(e) {}
        }
    }
}

function saveChatsToStorage() {
    localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(allChats));
    renderChatList(); // 저장할 때마다 목록 갱신
}

// ===========================================
// 3. 사이드바 및 채팅 관리 로직
// ===========================================

// 사이드바 열기/닫기
function toggleSidebar(show) {
    if (show === undefined) {
        sidebar.classList.toggle('visible');
        sidebarBackdrop.classList.toggle('visible');
    } else if (show) {
        sidebar.classList.add('visible');
        sidebarBackdrop.classList.add('visible');
    } else {
        sidebar.classList.remove('visible');
        sidebarBackdrop.classList.remove('visible');
    }
}

// 채팅 목록 렌더링
function renderChatList(filterText = '') {
    chatListContainer.innerHTML = '';
    
    const filteredChats = allChats.filter(chat => 
        chat.title.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filteredChats.length === 0) {
        chatListContainer.innerHTML = '<div class="no-search-result">채팅 기록이 없습니다.</div>';
        return;
    }

    filteredChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-list-item ${currentChatId === chat.id ? 'active' : ''}`;
        
        // 제목 영역
        const titleSpan = document.createElement('span');
        titleSpan.className = 'chat-item-title';
        titleSpan.textContent = chat.title;
        item.appendChild(titleSpan);

        // 옵션 버튼 영역 (수정, 삭제)
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'chat-item-options';

        // 이름 변경 버튼
        const renameBtn = document.createElement('div');
        renameBtn.className = 'chat-option-btn';
        renameBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px">edit</span>';
        renameBtn.onclick = (e) => {
            e.stopPropagation();
            renameChat(chat.id);
        };

        // 삭제 버튼
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'chat-option-btn';
        deleteBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px">delete</span>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        };

        optionsDiv.appendChild(renameBtn);
        optionsDiv.appendChild(deleteBtn);
        item.appendChild(optionsDiv);

        // 클릭 시 해당 채팅 로드
        item.addEventListener('click', () => {
            loadChat(chat.id);
            if(isMobile()) toggleSidebar(false); // 모바일이면 닫기
        });

        chatListContainer.appendChild(item);
    });
}

// 새 채팅 시작 (홈 화면으로 이동, 실제 생성은 메시지 전송 시)
function startNewChat() {
    currentChatId = null;
    currentMessages = [];
    switchToHomeView();
    if(isMobile()) toggleSidebar(false);
}

// 특정 채팅 불러오기
function loadChat(chatId) {
    const chat = allChats.find(c => c.id === chatId);
    if (!chat) return;

    currentChatId = chatId;
    currentMessages = chat.messages; // 참조 복사 (수정 시 원본 반영 주의)
    
    headerTitle.textContent = chat.title;
    
    // UI 전환
    initialContent.style.display = 'none';
    initialContent.style.opacity = '0';
    initialContent.style.visibility = 'hidden';
    
    chatMessages.style.display = 'flex';
    chatMessages.innerHTML = ''; // 기존 메시지 클리어

    // 메시지 다시 그리기
    currentMessages.forEach(msg => {
        if (msg.role === 'user') { appendUserMessage(msg.content, false); }
        else if (msg.role === 'model') {
            if (msg.content.includes('<img src="data:image')) {
                appendBotImage(msg.content, false);
            } else {
                appendBotMessage(msg.content, msg.feedback, false);
            }
        }
    });

    animateUIOnLoad();
    renderChatList(); // 활성 상태 표시 갱신
}

// 채팅 삭제
function deleteChat(chatId) {
    if (!confirm('정말 이 채팅을 삭제하시겠습니까?')) return;
    
    allChats = allChats.filter(c => c.id !== chatId);
    saveChatsToStorage();

    if (currentChatId === chatId) {
        startNewChat();
    }
}

// 채팅 이름 변경
function renameChat(chatId) {
    const chat = allChats.find(c => c.id === chatId);
    if (!chat) return;
    
    const newTitle = prompt('새로운 채팅 이름을 입력하세요:', chat.title);
    if (newTitle && newTitle.trim() !== '') {
        chat.title = newTitle.trim();
        saveChatsToStorage();
        if (currentChatId === chatId) headerTitle.textContent = chat.title;
    }
}

// 홈 화면 보기
function switchToHomeView() {
    currentChatId = null;
    currentMessages = [];
    headerTitle.textContent = 'MinsuGPT';
    
    chatMessages.style.display = 'none';
    chatMessages.innerHTML = '';
    
    initialContent.style.display = 'flex';
    initialContent.style.visibility = 'visible';
    initialContent.style.opacity = '1';
    
    toggleImageMode(false);
    contentWrapper.classList.remove('loaded');
    composer.classList.remove('loaded');
    setTimeout(animateUIOnLoad, 10);
    renderChatList(); // 활성 상태 해제
}

// ===========================================
// 4. UI 및 설정 함수
// ===========================================

function animateUIOnLoad() {
    contentWrapper.classList.add('loaded');
    composer.classList.add('loaded'); 
    setTimeout(() => { scrollToBottom(true); }, 500); 
}

function showSnackbar(message) {
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
            const icon = btn.querySelector('.material-symbols-rounded'); if(icon) icon.textContent = 'check_circle';
        } else {
            btn.classList.remove('active');
            const icon = btn.querySelector('.material-symbols-rounded'); if(icon) icon.textContent = 'radio_button_unchecked';
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
        if (isSimple) { toolImage.classList.add('active-purple'); } 
        else { imageModeIndicator.style.display = 'flex'; }
    } else {
        currentLoadingText = '답변을 생각하는 중...';
        if (isSimple) { toolImage.classList.remove('active-purple'); } 
        else { imageModeIndicator.style.display = 'none'; }
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

// 전체 초기화 (설정 메뉴)
function resetAllData() {
    localStorage.removeItem(STORAGE_KEY_CHATS);
    allChats = [];
    startNewChat();
    toggleResetConfirmModal(false);
    showSnackbar("모든 데이터가 초기화되었습니다.");
}

function scrollToBottom(smooth = true) {
    const behavior = smooth ? 'smooth' : 'auto';
    contentWrapper.scrollTo({ top: contentWrapper.scrollHeight, behavior: behavior });
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
    if (inputField.value.trim().length > 0 && !isStreaming) { sendButton.classList.add('active'); } 
    else { sendButton.classList.remove('active'); }
}

function autoResizeTextarea() {
    const style = getComputedStyle(inputField);
    const line_height_px = parseFloat(style.getPropertyValue('--line-height-px')) || 22.4; 
    inputField.rows = MIN_ROWS;
    inputField.style.height = 'auto'; 
    let scrollH = inputField.scrollHeight;
    let newRows = Math.round(scrollH / line_height_px);
    newRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, newRows));
    inputField.rows = newRows;
    inputField.style.height = 'auto';
    
    const finalTextareaHeight = inputField.offsetHeight; 
    let contentHeight = finalTextareaHeight + 8; 
    if (isImageMode && !composer.classList.contains('style-simple')) { contentHeight += 40; }
    
    const minInputContainerHeight = parseFloat(style.getPropertyValue('--min-input-container-height')) || 48;
    inputContainer.style.minHeight = `${Math.max(contentHeight, minInputContainerHeight)}px`;
    
    const composerHeight = composer.offsetHeight;
    if(scrollDownButton) { scrollDownButton.style.bottom = `${composerHeight + 10}px`; }
    chatMessages.style.paddingBottom = `${composerHeight + 50}px`;
}

// ===========================================
// 5. 메시지 처리 및 스트리밍
// ===========================================

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
    botMessageContainer.setAttribute('data-index', currentMessages.length); 
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
    const messageIndex = currentMessages.length; // 임시 인덱스 (실제론 -1 정도 차이날 수 있음)
    botMessageContainer.setAttribute('data-index', messageIndex); 
    const streamingBlock = document.createElement('div');
    streamingBlock.className = 'streaming-block'; 
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
    });
}

function createBotActions(content, messageIndex, feedbackStatus = null) {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'bot-actions';
    const likeBtn = createActionButton('like', '좋아요', feedbackStatus, 'thumb_up');
    const dislikeBtn = createActionButton('dislike', '싫어요', feedbackStatus, 'thumb_down');
    const copyBtn = createActionButton('copy', '복사', null, 'content_copy');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(content).then(() => showSnackbar('복사됨'));
    });
    
    // 단순화: regenerate 등은 현재 세션에서만 유효할 수 있으므로 간단히 처리
    // (구현 복잡도를 위해 일부 기능 축소 가능, 여기서는 UI만 유지)
    
    actionsContainer.appendChild(likeBtn); 
    actionsContainer.appendChild(dislikeBtn); 
    actionsContainer.appendChild(copyBtn); 
    return actionsContainer;
}

function createActionButton(actionType, ariaLabel, feedbackStatus = null, iconName) {
    const btn = document.createElement('div');
    btn.className = `bot-action-btn ${actionType}`;
    if (feedbackStatus === actionType) { btn.classList.add('selected'); }
    btn.innerHTML = `<span class="material-symbols-rounded">${iconName}</span>`;
    return btn;
}

function appendBotMessageContainer() {
    const botMessageContainer = document.createElement('div');
    botMessageContainer.className = 'bot-message';
    const indicatorContainer = document.createElement('div');
    indicatorContainer.id = 'thinking-indicator'; indicatorContainer.className = 'thinking-indicator';
    const spinner = document.createElement('div'); spinner.className = 'loading-spinner';
    if (isImageMode) { spinner.classList.add('image-gen'); }
    const indicatorText = document.createElement('span'); indicatorText.className = 'thinking-indicator-text'; indicatorText.textContent = currentLoadingText; 
    indicatorContainer.appendChild(spinner); indicatorContainer.appendChild(indicatorText);
    const streamingBlock = document.createElement('div'); streamingBlock.className = 'streaming-block'; 
    botMessageContainer.appendChild(indicatorContainer); botMessageContainer.appendChild(streamingBlock);
    chatMessages.appendChild(botMessageContainer);
    if (autoScrollEnabled) scrollToBottom(true);
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
    showSnackbar("답변 중지됨.");
    if (abortController) abortController.abort();
    setStreamingState(false);
}

// 🌟 채팅 제목 자동 생성 (간단한 규칙)
function generateChatTitle(firstUserMessage) {
    let title = firstUserMessage.slice(0, 20);
    if (firstUserMessage.length > 20) title += '...';
    return title;
}

// 🌟 메시지 전송 로직 (새 채팅 생성 포함)
async function sendMessage(userMessageOverride = null, isRegenerate = false) {
    const userMessage = userMessageOverride !== null ? userMessageOverride : inputField.value.trim();
    if (userMessage.length === 0 || isStreaming) return;

    // 🌟 1. 새 채팅이면 채팅 객체 생성
    if (currentChatId === null) {
        const newId = Date.now().toString();
        const newTitle = generateChatTitle(userMessage);
        
        const newChat = {
            id: newId,
            title: newTitle,
            messages: [],
            lastModified: Date.now()
        };
        
        allChats.unshift(newChat); // 맨 앞에 추가
        currentChatId = newId;
        currentMessages = newChat.messages;
        headerTitle.textContent = newTitle;
        
        saveChatsToStorage();
        
        // 홈 화면 숨기고 채팅 화면 보이기
        initialContent.style.opacity = '0';
        initialContent.style.visibility = 'hidden'; 
        setTimeout(() => { initialContent.style.display = 'none'; chatMessages.style.display = 'flex'; }, 500); 
    }

    // 메시지 UI 추가 및 저장
    if (!isRegenerate) {
        appendUserMessage(userMessage); 
        currentMessages.push({ role: 'user', content: userMessage });
        
        // 현재 채팅의 lastModified 업데이트
        const chat = allChats.find(c => c.id === currentChatId);
        if (chat) chat.lastModified = Date.now();
        saveChatsToStorage();
    }
    
    if (userMessageOverride === null) { inputField.value = ''; inputField.rows = MIN_ROWS; autoResizeTextarea(); }
    
    const { botMessageElement, indicatorElement, streamingBlockElement, spinnerElement, indicatorTextElement } = appendBotMessageContainer();
    setStreamingState(true);
    abortController = new AbortController();
    
    fullResponse = ""; 
    
    try {
        if (isImageMode) {
             const response = await fetch(IMAGE_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ prompt: userMessage }), 
                signal: abortController.signal
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.success && data.image_data) {
                const imgHtml = `<img src="${data.image_data}" alt="Generated Image" style="max-width: 100%; border-radius: 12px;">`;
                fullResponse = imgHtml;
                streamingBlockElement.innerHTML = fullResponse;
                setStreamingState(false);
                currentMessages.push({ role: 'model', content: fullResponse, feedback: null });
                saveChatsToStorage(); // 저장
                if (spinnerElement) spinnerElement.classList.add('reset-spin'); 
                if (indicatorTextElement) { indicatorTextElement.textContent = '이미지 생성 완료'; indicatorTextElement.classList.add('completed'); }
                indicatorElement.classList.add('left-aligned');
                toggleImageMode(false);
            } else { throw new Error(data.error || "실패"); }
        } else {
            // 텍스트 생성
            const response = await fetch(BACKEND_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ 
                    message: userMessage, 
                    history: [PRE_PROMPT, ...currentMessages],
                }), 
                signal: abortController.signal 
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break; 
                const chunk = decoder.decode(value, { stream: true });
                if (chunk.includes("[DONE]")) {
                    fullResponse += chunk.split("[DONE]")[0]; 
                    streamingBlockElement.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullResponse) : fullResponse;
                    break;
                } else {
                    fullResponse += chunk;
                    streamingBlockElement.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullResponse) : fullResponse;
                    if (autoScrollEnabled) scrollToBottom(false);
                }
            }
            
            setStreamingState(false);
            currentMessages.push({ role: 'model', content: fullResponse, feedback: null });
            saveChatsToStorage(); // 저장
            
            if (spinnerElement) spinnerElement.classList.add('reset-spin'); 
            if (indicatorTextElement) { indicatorTextElement.textContent = '완료'; indicatorTextElement.classList.add('completed'); }
            indicatorElement.classList.add('left-aligned'); 
            
            const actionContainer = createBotActions(fullResponse, currentMessages.length - 1);
            botMessageElement.appendChild(actionContainer); updateRegenerateButtons();
            scrollToBottom(true);
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            streamingBlockElement.innerHTML = `<p style="color:red;">오류: ${error.message}</p>`;
            if (history.length > 0 && history[history.length - 1].role === 'user') { history.pop(); saveChatsToStorage(); }
        }
        setStreamingState(false); scrollToBottom(true); 
    }
}

// ===========================================
// 6. 이벤트 리스너 연결
// ===========================================

// 사이드바 이벤트
menuBtn.addEventListener('click', () => toggleSidebar(true));
sidebarCloseBtn.addEventListener('click', () => toggleSidebar(false));
sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));

sidebarNewChatBtn.addEventListener('click', startNewChat);

// 채팅 검색
chatSearchInput.addEventListener('input', (e) => {
    renderChatList(e.target.value);
});

// 기존 이벤트들
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem(THEME_KEY) === 'auto') { applyTheme('auto'); }
});
themeBtns.forEach(btn => { btn.addEventListener('click', () => { applyTheme(btn.dataset.themeVal); }); });
uiStyleBtns.forEach(btn => { btn.addEventListener('click', () => { applyUIStyle(btn.dataset.style); }); });

if(toolImage) toolImage.addEventListener('click', () => toggleImageMode(!isImageMode));
if(menuCreateImage) menuCreateImage.addEventListener('click', () => { togglePlusModal(false); toggleImageMode(true); });
if(closeImageModeBtn) closeImageModeBtn.addEventListener('click', () => toggleImageMode(false));

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
        e.preventDefault(); toggleSettingsModal(false); 
        setTimeout(() => { toggleAboutModal(true); }, 200); 
    });
}
aboutModalBackdrop.addEventListener('click', (e) => { if (e.target === aboutModalBackdrop) toggleAboutModal(false); });
resetChatButton.addEventListener('click', (e) => { e.preventDefault(); toggleResetConfirmModal(true); });
confirmCancelBtn.addEventListener('click', () => toggleResetConfirmModal(false));
confirmResetBtn.addEventListener('click', resetAllData);
resetConfirmModalBackdrop.addEventListener('click', (e) => { if (e.target === resetConfirmModalBackdrop) toggleResetConfirmModal(false); });

contentWrapper.addEventListener('scroll', () => {
    const distanceFromBottom = contentWrapper.scrollHeight - contentWrapper.scrollTop - contentWrapper.clientHeight;
    if (distanceFromBottom <= 1) { autoScrollEnabled = true; scrollDownButton.classList.remove('visible'); } 
    else if (distanceFromBottom > 100) { 
        autoScrollEnabled = false;
        if (!isStreaming) { scrollDownButton.classList.add('visible'); }
    }
});

if(scrollDownButton) {
    scrollDownButton.addEventListener('click', () => { scrollToBottom(true); scrollDownButton.classList.remove('visible'); autoScrollEnabled = true; });
}

const toolAttach = document.getElementById('tool-attach');
if(toolAttach) { toolAttach.addEventListener('click', (e) => { e.preventDefault(); togglePlusModal(true); }); }
if(toolStudy) { toolStudy.addEventListener('click', () => { toolStudy.classList.toggle('active-blue'); }); }

// 초기 실행
window.onload = init;
