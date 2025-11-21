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
const scrollDownButton = document.getElementById('scroll-down-button'); 

// 💡 [추가] About Modal 요소
const aboutButton = document.getElementById('about-button');
const aboutModalBackdrop = document.getElementById('about-modal-backdrop');

const uiStyleBtns = document.querySelectorAll('.ui-style-btn');
const themeBtns = document.querySelectorAll('.theme-btn');
const toolStudy = document.getElementById('tool-study');

// 💡 [추가] 이미지 관련 요소
const toolImage = document.getElementById('tool-image');
const menuCreateImage = document.getElementById('menu-create-image');
const imageModeIndicator = document.getElementById('image-mode-indicator');
const closeImageModeBtn = document.getElementById('close-image-mode');

// 🎯 백엔드 엔드포인트
const BACKEND_ENDPOINT = "https://jaewondev.pythonanywhere.com/ask"; 
const IMAGE_ENDPOINT = "https://jaewondev.pythonanywhere.com/generate-image"; 

const HISTORY_STORAGE_KEY = 'minsugpt_chat_history'; 
const UI_STYLE_KEY = 'minsugpt_ui_style'; 
const THEME_KEY = 'minsugpt_theme'; 

let history = []; 
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
let isFadingIn = false;
let fadeOutAbortController = null;
const FADE_IN_DELAY = 200; 
let autoScrollEnabled = true;

// 💡 [추가] 이미지 모드 상태 변수
let isImageMode = false;

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
    // 스타일 변경 시 이미지 모드 초기화
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

// 💡 [추가] About Modal 토글 함수
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
// 3. 채팅 이력 및 관리 함수
// ===========================================

function loadChatHistory() {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    let validHistory = [];
    if (storedHistory) {
        try {
            const parsedHistory = JSON.parse(storedHistory);
            validHistory = parsedHistory.filter(msg => msg.role === 'user' || msg.role === 'model');
        } catch (e) {
            localStorage.removeItem(HISTORY_STORAGE_KEY);
            validHistory = [];
        }
    }
    history = validHistory;

    if (history.length > 0) {
        chatMessages.innerHTML = ''; 
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
        scrollToBottom(false); 
    } else {
        chatMessages.style.display = 'none';
        chatMessages.innerHTML = '';
        initialContent.style.visibility = 'visible'; 
        initialContent.style.display = 'flex';
        initialContent.style.opacity = '1';
    }
    autoResizeTextarea();
    animateUIOnLoad(); 
}

function saveChatHistory() { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history)); }

function resetChat() {
    history = [];
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    chatMessages.innerHTML = '';
    chatMessages.style.display = 'none';
    initialContent.style.opacity = '0';
    initialContent.style.display = 'flex';
    initialContent.style.visibility = 'visible'; 
    setTimeout(() => { initialContent.style.opacity = '1'; }, 10); 
    toggleResetConfirmModal(false);
    showSnackbar("대화가 초기화되었습니다.");
    contentWrapper.classList.remove('loaded');
    composer.classList.remove('loaded');
    toggleImageMode(false); 
    setTimeout(animateUIOnLoad, 10); 
}

function scrollToBottom(smooth = true) {
    const behavior = smooth ? 'smooth' : 'auto';
    contentWrapper.scrollTo({ top: contentWrapper.scrollHeight, behavior: behavior });
}

// ===========================================
// 4. 입력창 및 메시지 UI 관련 함수
// ===========================================

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
    
    // 이미지 모드일 때 높이 추가 계산
    if (isImageMode && !composer.classList.contains('style-simple')) {
         contentHeight += 40; 
    }

    const inputContainerHeight = Math.max(contentHeight, minInputContainerHeight);
    
    inputContainer.style.minHeight = `${inputContainerHeight}px`;

    // [수정된 부분]
    const composerHeight = composer.offsetHeight;
    scrollDownButton.style.bottom = `${composerHeight + 10}px`;
    
    // 채팅 메시지 컨테이너의 하단 패딩을 고정된 값으로 설정
    chatMessages.style.paddingBottom = `50px`; 
    // [수정된 부분 끝]

    if (autoScrollEnabled) scrollToBottom(false);
}

function appendUserMessage(content, animate = true) {
    const userBubble = document.createElement('div');
    userBubble.className = 'message-bubble user-message';
    userBubble.innerHTML = `<div class="message-text">${content}</div>`;
    chatMessages.appendChild(userBubble);
    if (animate) scrollToBottom(true);
}

// 💡 [추가] 이미지 메시지 전용 append 함수
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
    streamingBlock.innerHTML = renderMarkdown(content);
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
        saveChatHistory(); 
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
    if (isStreaming || isFadingIn) { showSnackbar('현재 답변 생성 중이거나 애니메이션이 동작 중입니다.'); return; }
    const modelMessageIndex = history.findIndex((msg, index) => index === messageIndex && msg.role === 'model');
    if (modelMessageIndex === -1) { showSnackbar('재생성할 답변을 찾을 수 없습니다.'); return; }

    let userMessageIndex = -1;
    for (let i = modelMessageIndex - 1; i >= 0; i--) { if (history[i].role === 'user') { userMessageIndex = i; break; } }
    if (userMessageIndex === -1) { showSnackbar('재생성할 사용자 질문을 찾을 수 없습니다.'); return; }
    
    const originalPrompt = history[userMessageIndex].content;
    history.splice(modelMessageIndex, history.length - modelMessageIndex);
    saveChatHistory();
    
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
    if (autoScrollEnabled) scrollToBottom(true);
    
    return { botMessageElement: botMessageContainer, indicatorElement: indicatorContainer, streamingBlockElement: streamingBlock, spinnerElement: spinner, indicatorTextElement: indicatorText };
}

function startStreamingUI(indicator) { }

function renderMarkdown(rawText, wrapSentences = false) {
    if (!rawText) return "";
    let html = rawText.replace(/\r/g, ''); 
    html = html.replace(/```([^`]+?)```/gs, (match, content) => { return `<pre><code>${content.trim()}</code></pre>`; });
    html = html.replace(/^(#+)\s*([^\n]+)/gm, (match, hashes, content) => { return `<h${hashes.length}>${content}</h${hashes.length}>`; });
    html = html.replace(/`([^`\n]+?)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^__]+?)__/g, '<strong>$1</strong>');
    
    if (wrapSentences) {
        const sentenceRegex = /([^.?!]+[.?!]+(?:\s|<br>|\n|$)+)/g;
        const parts = html.split(sentenceRegex).filter(p => p.trim().length > 0 || p.match(/^[.?!]+\s*$/));
        let wrappedHtml = '';
        for (const part of parts) {
            if (part.trim().length === 0 && !part.includes('<br>') && !part.includes('\n')) continue; 
            if (part.match(/<pre>/) || part.match(/<h[1-6]>/)) { wrappedHtml += part; } 
            else { wrappedHtml += `<span class="sentence">${part.replace(/(?<!<br>)\n/g, '<br>')}</span>`; }
        }
        html = wrappedHtml;
    }
    if (!wrapSentences) { html = html.replace(/(?<!<br>)\n/g, '<br>'); }
    return html;
}

function sentenceFadeInEffect(element, rawText, messageIndex) {
    return new Promise(resolve => {
        isFadingIn = true;
        element.innerHTML = renderMarkdown(rawText, true);
        const sentences = element.querySelectorAll('.sentence');
        let index = 0;
        const delay = FADE_IN_DELAY; 
        const abortFadeIn = () => { isFadingIn = false; sentences.forEach(s => s.classList.add('visible')); if (autoScrollEnabled) scrollToBottom(true); resolve(); };
        fadeOutAbortController = { abort: abortFadeIn };

        function showNextSentence() {
            if (!isFadingIn) { return; }
            if (index < sentences.length) {
                const currentSentence = sentences[index];
                currentSentence.classList.add('visible');
                if (autoScrollEnabled) {
                    const rect = currentSentence.getBoundingClientRect();
                    const wrapperRect = contentWrapper.getBoundingClientRect();
                    const composerHeight = composer.clientHeight;
                    if (rect.bottom > wrapperRect.bottom - composerHeight - 20) { scrollToBottom(true); }
                }
                index++; setTimeout(showNextSentence, delay);
            } else { isFadingIn = false; resolve(); }
        }
        showNextSentence();
    });
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
    const lastBotMessageElement = chatMessages.lastElementChild;
    let indicatorText = null; let spinner = null; let indicatorContainer = null;
    
    if (lastBotMessageElement) {
        indicatorContainer = lastBotMessageElement.querySelector('#thinking-indicator');
        if (indicatorContainer) { spinner = indicatorContainer.querySelector('.loading-spinner'); indicatorText = indicatorContainer.querySelector('.thinking-indicator-text'); }
    }
    
    if (isFadingIn && fadeOutAbortController) {
        fadeOutAbortController.abort();
        if (indicatorText) { indicatorText.textContent = '답변 중지됨'; indicatorText.classList.add('completed'); }
        if (indicatorContainer) indicatorContainer.classList.add('left-aligned'); 
        if (spinner) spinner.classList.add('reset-spin'); 
        
        if (lastBotMessageElement) {
            const stopText = document.createElement('div'); stopText.className = 'stop-message'; stopText.textContent = "답변 중지됨.";
            lastBotMessageElement.insertAdjacentElement('afterend', stopText);
            history.push({ role: 'model', content: fullResponse, feedback: null }); saveChatHistory();
            const actionContainer = createBotActions(fullResponse, history.length - 1);
            lastBotMessageElement.appendChild(actionContainer); updateRegenerateButtons();
        }
        setStreamingState(false); scrollToBottom(true); return;
    }
    
    if (abortController) {
        abortController.abort();
        // 중지 로직은 텍스트 생성 로직 내부에 포함됨
    }
    setStreamingState(false); scrollToBottom(true);
}


async function sendMessage(userMessageOverride = null, isRegenerate = false) {
    const userMessage = userMessageOverride !== null ? userMessageOverride : inputField.value.trim();
    if (userMessage.length === 0 || isStreaming || isFadingIn) { if (isStreaming || isFadingIn) showSnackbar('현재 답변 생성 중이거나 애니메이션이 동작 중입니다.'); return; }

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
    } 
    
    if (userMessageOverride === null) { inputField.value = ''; inputField.rows = MIN_ROWS; autoResizeTextarea(); }
    
    const { botMessageElement, indicatorElement, streamingBlockElement, spinnerElement, indicatorTextElement } = appendBotMessageContainer();
    
    setStreamingState(true);
    abortController = new AbortController();
    const signal = abortController.signal;
    
    fullResponse = ""; 
    
    try {
        // 🌟 이미지 생성 모드 vs 텍스트 생성 모드 분기
        if (isImageMode) {
            // 🖼️ 이미지 생성 요청 (비스트리밍)
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
                history.push({ role: 'model', content: fullResponse, feedback: null }); saveChatHistory();
                if (spinnerElement) spinnerElement.classList.add('reset-spin'); 
                if (indicatorTextElement) { indicatorTextElement.textContent = '이미지 생성 완료'; indicatorTextElement.classList.add('completed'); }
                indicatorElement.classList.add('left-aligned');
                
                // 이미지 생성 후 모드 자동 해제
                toggleImageMode(false);
                
            } else {
                throw new Error(data.error || "이미지 생성 실패");
            }

        } else {
            // 📝 기존 텍스트 생성 로직 (스트리밍)
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
            let buffer = ""; let isFirstChunk = true; 

            while (true) {
                const { done, value } = await reader.read();
                if (done) break; 
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n');
                buffer = parts.pop(); 

                for (const part of parts) {
                    const cleanPart = part; 
                    if (cleanPart.trim() === "[DONE]") {
                        fullResponse += buffer;
                        setStreamingState(false);
                        history.push({ role: 'model', content: fullResponse, feedback: null }); saveChatHistory();
                        if (spinnerElement) spinnerElement.classList.add('reset-spin'); 
                        if (indicatorTextElement) { indicatorTextElement.textContent = '답변 완료됨'; indicatorTextElement.classList.add('completed'); }
                        indicatorElement.classList.add('left-aligned'); 
                        sentenceFadeInEffect(streamingBlockElement, fullResponse, history.length - 1).then(() => {
                            const actionContainer = createBotActions(fullResponse, history.length - 1);
                            botMessageElement.appendChild(actionContainer); updateRegenerateButtons();
                            if (autoScrollEnabled) scrollToBottom(true);
                        });
                        reader.releaseLock(); return; 
                    }
                    
                    if (cleanPart.length > 0) {
                        if (isFirstChunk) { startStreamingUI(indicatorElement); isFirstChunk = false; }
                        fullResponse += cleanPart + '\n'; 
                        streamingBlockElement.innerHTML = renderMarkdown(fullResponse);
                        if (autoScrollEnabled) scrollToBottom(false);
                    }
                }
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') { 
            console.log('Fetch aborted'); 
        } 
        else {
            const errorMsg = `⚠️ 오류: ${error.message}`;
            startStreamingUI(indicatorElement); streamingBlockElement.innerHTML = `<p style="color:red;">${errorMsg}</p>`;
            if (spinnerElement) spinnerElement.classList.add('reset-spin');
            if (indicatorTextElement) { indicatorTextElement.textContent = '응답 오류'; indicatorTextElement.classList.add('completed'); }
            // 오류 발생 시 사용자 메시지만 남기기
            if (history.length > 0 && history[history.length - 1].role === 'user') { history.pop(); saveChatHistory(); }
            updateRegenerateButtons();
        }
        setStreamingState(false); scrollToBottom(true); 
    }
    if(isStreaming) setStreamingState(false);
}

// ===========================================
// 5. 이벤트 리스너
// ===========================================

// 테마/스타일 변경 이벤트
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem(THEME_KEY) === 'auto') { applyTheme('auto'); }
});
themeBtns.forEach(btn => { btn.addEventListener('click', () => { applyTheme(btn.dataset.themeVal); }); });
uiStyleBtns.forEach(btn => { btn.addEventListener('click', () => { applyUIStyle(btn.dataset.style); }); });

// 이미지 모드 토글
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

// 채팅 기본 동작
inputField.addEventListener('input', toggleSendButton);
inputField.addEventListener('input', autoResizeTextarea);
sendButton.addEventListener('click', () => sendMessage());
stopButton.addEventListener('click', stopResponse);

// 입력창 엔터 키 (모바일 환경이 아닐 경우)
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

// 퀵 액션 버튼
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

// 모달 토글 버튼
plusButton.addEventListener('click', (e) => { e.preventDefault(); togglePlusModal(); });
plusModalBackdrop.addEventListener('click', (e) => { if (e.target === plusModalBackdrop) togglePlusModal(false); });

settingsButton.addEventListener('click', (e) => { e.preventDefault(); toggleSettingsModal(); });
settingsModalBackdrop.addEventListener('click', (e) => { if (e.target === settingsModalBackdrop) toggleSettingsModal(false); });

// 💡 [추가] About Modal 토글 버튼
if(aboutButton) {
    aboutButton.addEventListener('click', (e) => { 
        e.preventDefault(); 
        toggleSettingsModal(false); 
        setTimeout(() => { toggleAboutModal(true); }, 200); 
    });
}
aboutModalBackdrop.addEventListener('click', (e) => { if (e.target === aboutModalBackdrop) toggleAboutModal(false); });

// 대화 초기화
resetChatButton.addEventListener('click', (e) => { e.preventDefault(); toggleResetConfirmModal(true); });
confirmCancelBtn.addEventListener('click', () => toggleResetConfirmModal(false));
confirmResetBtn.addEventListener('click', resetChat);
resetConfirmModalBackdrop.addEventListener('click', (e) => { if (e.target === resetConfirmModalBackdrop) toggleResetConfirmModal(false); });

// 스크롤 및 스크롤 다운 버튼
contentWrapper.addEventListener('scroll', () => {
    const isAtBottom = contentWrapper.scrollHeight - contentWrapper.scrollTop - contentWrapper.clientHeight < 1;
    if (isAtBottom) { autoScrollEnabled = true; scrollDownButton.classList.remove('visible'); } 
    else if (contentWrapper.scrollTop < contentWrapper.scrollHeight - contentWrapper.clientHeight - 100) {
        autoScrollEnabled = false;
        if (!isStreaming && !isFadingIn) { scrollDownButton.classList.add('visible'); }
    }
});
scrollDownButton.addEventListener('click', () => { scrollToBottom(true); scrollDownButton.classList.remove('visible'); autoScrollEnabled = true; });

const toolAttach = document.getElementById('tool-attach');
if(toolAttach) { toolAttach.addEventListener('click', (e) => { e.preventDefault(); togglePlusModal(true); }); }

if(toolStudy) { toolStudy.addEventListener('click', () => { toolStudy.classList.toggle('active-blue'); }); }

// ===========================================
// 6. 초기화
// ===========================================

window.onload = function() {
    loadTheme();
    loadUIStyle(); 
    loadChatHistory();
    toggleSendButton();
    autoResizeTextarea();
};
