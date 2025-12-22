document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
document.onkeydown = function(e) {
  if (e.keyCode == 123) { e.preventDefault(); return false; } 
  if (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0) || e.keyCode == 'C'.charCodeAt(0))) { e.preventDefault(); return false; } 
  if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) { e.preventDefault(); return false; } 
};

// ===========================================
// 1. DOM 요소 및 상수 정의
// ===========================================

function formatMessageContent(text) {
    if (!text) return "";
    let html = text;

    // 1. [THOUGHT] 태그 추출 및 통합 (여러 번 끊겨 들어와도 하나로 합침)
    // 정규표현식으로 모든 [THOUGHT]...[/THOUGHT] 구간을 찾습니다.
    const thoughtMatches = html.match(/\[THOUGHT\]([\s\S]*?)\[\/THOUGHT\]/g);
    let combinedThought = "";
    let finalAnswerText = html;

    if (thoughtMatches) {
        // 모든 생각 조각에서 태그를 떼고, 내부 줄바꿈을 공백으로 치환하여 합칩니다.
        combinedThought = thoughtMatches
            .map(m => m.replace(/\[\/?THOUGHT\]/g, '').trim())
            .join(' ')
            .replace(/\n/g, ' '); 
        
        // 원본 텍스트에서 [THOUGHT] 태그가 포함된 모든 구간을 삭제하여 답변만 남깁니다.
        finalAnswerText = html.replace(/\[THOUGHT\]([\s\S]*?)\[\/THOUGHT\]/g, '');
    }

    // 2. 마크다운 변환 (답변 텍스트만 변환)
    let renderedHtml = typeof marked !== 'undefined' ? marked.parse(finalAnswerText) : finalAnswerText;

    // 3. 통합된 생각 박스를 HTML 상단에 배치 (새로고침 시에도 동일하게 렌더링)
    if (combinedThought) {
        // ✨ [수정] details 태그에서 'open'을 삭제하여 기본적으로 닫힘 상태로 렌더링
        const thoughtHtml = `
            <details class="thought-dropdown">
                <summary>
                    <span class="material-symbols-rounded dropdown-icon">chevron_right</span>
                    추론 과정 (생각 보기)
                </summary>
                <div class="thought-process" style="white-space: normal !important; display: block !important; word-break: break-all;">
                    ${combinedThought}
                </div>
            </details>
        `;
        renderedHtml = thoughtHtml + renderedHtml;
    }
  
    // 4. [TOOL] 태그 처리 (웹 검색 출처 카드)
    const toolRegex = /\[TOOL\]web_search: (\{.*?\})/g;
    const cards = [];
    renderedHtml = renderedHtml.replace(toolRegex, function(match, p1) {
        try {
            const data = JSON.parse(p1);
            cards.push(`
                <div class="citation-card" onclick="window.open('${data.url}', '_blank')">
                    <div class="citation-title">${data.title}</div>
                    <div class="citation-url">${new URL(data.url).hostname}</div>
                </div>`);
            return ''; 
        } catch (e) { return ''; }
    });

    if (cards.length > 0) {
        renderedHtml += `<div class="citation-container">${cards.join('')}</div>`;
    }

    return renderedHtml;
}









// script.js 상단 부분 수정

const accessModalBackdrop = document.getElementById('access-modal-backdrop');
const accessIdInput = document.getElementById('access-id-input'); 
const accessPwInput = document.getElementById('access-pw-input'); 
const accessConfirmBtn = document.getElementById('access-confirm-btn');
const accessError = document.getElementById('access-error');

const fakeImageProgress = [
    "이미지를 생성 중입니다.",
    "구도를 잡는 중입니다..",
    "색감을 조정하는 중입니다...",
    "디테일을 추가하는 중입니다....",
    "마무리 작업 중입니다....."
];

// 로그인 처리 함수
async function handleLoginCheck() { 
    const inputId = accessIdInput.value.trim();
    const inputPw = accessPwInput.value.trim(); 
    
    // 입력값 검증
    if (!inputId || !inputPw) {
        accessError.textContent = "아이디와 비밀번호를 모두 입력해 주세요.";
        accessError.style.display = 'block';
        return;
    }
    
    // 버튼 로딩 상태 변경
    const originalBtnText = accessConfirmBtn.textContent;
    accessConfirmBtn.disabled = true;
    accessConfirmBtn.textContent = '확인 중...';

    try {
        // 백엔드로 요청 전송 (경로는 실제 서버 주소에 맞게 수정 필요)
        // 예: [https://jaewondev.pythonanywhere.com/check-access](https://jaewondev.pythonanywhere.com/check-access)
        const response = await fetch('https://jaewondev2.pythonanywhere.com/check-access', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: inputId, password: inputPw }) 
        });

        const result = await response.json();

        if (result.success) {
            // ✅ 로그인 성공
            // CSS의 !important를 덮어쓰기 위해 style.setProperty에 'important' priority를 사용했습니다.
            accessModalBackdrop.style.setProperty('opacity', '0', 'important');
            accessModalBackdrop.style.setProperty('visibility', 'hidden', 'important');
            
            setTimeout(() => {
                // display: none도 !important로 강제하여 완전히 숨김 처리
                accessModalBackdrop.style.setProperty('display', 'none', 'important');
            }, 500);
            
            // 로그인 정보를 localStorage에 저장 (선택적)
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userId', inputId);

            // 채팅 시작 로직 호출 (이미 window.onload에서 호출되지만, 명시적으로)
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
            
        } else {
            // ❌ 로그인 실패
// ... (이 아래 코드는 수정할 필요 없음)
            // ❌ 로그인 실패
            accessError.textContent = result.message || "아이디 또는 비밀번호가 잘못되었습니다.";
            accessError.style.display = 'block';
            accessPwInput.value = ''; // 비밀번호만 초기화
            accessPwInput.focus();
        }

    } catch (error) {
        console.error('로그인 확인 중 오류 발생:', error);
        accessError.textContent = "서버 연결에 실패했습니다.";
        accessError.style.display = 'block';
    } finally {
        // 버튼 상태 복구
        accessConfirmBtn.disabled = false;
        accessConfirmBtn.textContent = originalBtnText;
    }
}









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
const BACKEND_ENDPOINT = "https://jaewondev.pythonanywhere.com/ask"; // 기본 (G-5 Pro)
const BACKEND_ENDPOINT_G4 = "https://jaewondev.pythonanywhere.com/g4ask"; // [신규] G-4용
const BACKEND_ENDPOINT_FAST = "https://jaewondev.pythonanywhere.com/askfast"; // [신규] G-Fast용

let currentModel = 'g-fast'; // [신규] 현재 모델 상태 ('g5-pro' or 'g4')

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
    content: "너는 MinsuGPT야. 너는 신재원님이 만들었어. 사용자가 따로 물어보지 않으면 너의 역할이나 개발자 정보를 따로 답하지마. 그리고 항상 마크다운스타일로 대답해. 검색같은 도구는 최소한으로 사용해. Request Entity Too Large오류가 발생할 수 있으니 web_search는 가능한 가장 적게 해. 사용자의 질문에 답변할때 웹검색은 가장적게해. 검색을 하나 해서 이미 질문에 대답할 수 있으면 더이상 하지마."
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
// Marked 라이브러리 커스텀 설정 (링크버튼, 이미지 다운로드)
// ===========================================

// 이미지 확장자 판별용 정규식
const imageExtensions = /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff)$/i;

const renderer = {
    // 1. 링크 처리 ([텍스트](URL) 또는 일반 URL)
    link(obj) {
        // marked 버전에 따라 인자가 객체 {href, title, text}로 들어오거나 순서대로 들어올 수 있음
        // 안전하게 처리하기 위해 인자 확인
        const href = (typeof obj === 'object' && obj.href) ? obj.href : arguments[0];
        const title = (typeof obj === 'object' && obj.title) ? obj.title : arguments[1];
        const text = (typeof obj === 'object' && obj.text) ? obj.text : arguments[2];

        if (!href) return text;

        // ★ 핵심: 링크가 이미지 파일(.png, .jpg 등)이면 이미지로 렌더링 강제 전환
        if (imageExtensions.test(href)) {
            return renderer.image(href, title || text, text);
        }

        // 일반 링크는 버튼 스타일로 반환
        return `<a href="${href}" class="chat-link-btn" target="_blank" title="${title || ''}">
                    <span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle; margin-right:2px;">link</span>
                    ${text}
                </a>`;
    },

    // 2. 이미지 처리 (![텍스트](URL))
    image(obj) {
        const href = (typeof obj === 'object' && obj.href) ? obj.href : arguments[0];
        const title = (typeof obj === 'object' && obj.title) ? obj.title : arguments[1];
        const text = (typeof obj === 'object' && obj.text) ? obj.text : arguments[2];

        const fileName = text || 'image';

        // 이미지 HTML + 다운로드 버튼 생성
        return `
            <div class="chat-img-wrapper">
                <img src="${href}" alt="${text}" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\'color:red\'>이미지 로드 실패</span>'">
                <button class="img-download-btn" onclick="downloadImage('${href}', '${fileName}')" title="이미지 다운로드">
                    <span class="material-symbols-rounded">download</span> 다운로드
                </button>
            </div>
        `;
    }
};

// Marked에 렌더러 적용
marked.use({ renderer });

// 줄바꿈 허용 옵션
marked.setOptions({
    breaks: true
});

// 이미지 다운로드 헬퍼 함수
window.downloadImage = function(url, fileName) {
    // 다운로드 중임을 표시 (버튼 텍스트 변경 등 가능)
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            // 확장자가 없으면 .png 기본값
            let downloadName = fileName;
            if (!downloadName.includes('.')) {
                // URL에서 확장자 추출 시도
                const extMatch = url.match(/\.(png|jpg|jpeg|gif|webp)/i);
                const ext = extMatch ? extMatch[0] : '.png';
                downloadName += ext;
            }
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        })
        .catch(err => {
            console.error('이미지 다운로드 실패 (CORS 문제일 수 있음):', err);
            // 실패 시 새 창으로 열기
            window.open(url, '_blank');
        });
};


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
    const savedStyle = localStorage.getItem(UI_STYLE_KEY) || 'simple'; 
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


    // ✨ [추가] 새 채팅 시 화면 초기화 로직
    if (chatMessages) {
        chatMessages.innerHTML = ''; // 메시지창 비우기
        chatMessages.style.display = 'none'; // 메시지창 숨김
        chatMessages.classList.add('new-chat-mode'); // 🌟 [신규] 새 채팅 모드 클래스 추가 (여백 2배)
    }
    
    if (initialContent) {
        initialContent.style.display = 'flex';     // 초기 화면 보이기
        initialContent.style.opacity = '1';
        initialContent.style.visibility = 'visible';


        playIntroAnimation();
      
    }




  
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
        // 🌟 [신규] 기존 대화가 있으면 새 채팅 모드(넓은 여백) 제거
        chatMessages.classList.remove('new-chat-mode');
        // 대화가 있으면 초기 화면 숨김
        initialContent.style.opacity = '0';
        initialContent.style.visibility = 'hidden'; 
        chatMessages.style.display = 'flex';

        history.forEach((message, index) => {
            if (message.role === 'user') { 
                // 사용자 메시지 출력 (기존 함수 유지)
                appendUserMessage(message.content, message.images || [], false); 
            } 
            else if (message.role === 'model') { 
                // 모델 메시지 출력
                if (message.content.includes('<img src="data:image')) {
                    appendBotImage(message.content, false);
                } else {
                    initialContent.style.display = 'flex';
                    // ✅ 저장된 대화 기록(history)을 불러올 때도 
                    // formatMessageContent 함수를 거쳐서 HTML로 변환 후 삽입
                    const botMessageContainer = document.createElement('div');
                    botMessageContainer.className = 'bot-message';
                    botMessageContainer.setAttribute('data-index', index);

                    const streamingBlock = document.createElement('div');
                    streamingBlock.className = 'streaming-block'; 
                    
                    // 여기서 변환 함수를 호출하여 [THOUGHT] 태그 등을 처리합니다.
                    streamingBlock.innerHTML = formatMessageContent(message.content);



                    // ✨ [추가] 새로고침 시에도 링크를 버튼으로 변환하는 로직
    const links = streamingBlock.querySelectorAll('p > a, li > a');
    links.forEach(link => {
        // 텍스트가 http로 시작하거나 href와 같은 경우 버튼으로 변환
        if (link.innerText.trim().startsWith('http') || link.innerText.trim() === link.href.trim()) {
            link.classList.add('link-button');
            link.innerHTML = `<span>링크 접속하기</span>`;
            link.target = '_blank';
        }
    });



                  
                    botMessageContainer.appendChild(streamingBlock);

                    // 피드백 버튼 등 액션 아이콘 추가
                    const actionContainer = createBotActions(message.content, index, message.feedback);
                    botMessageContainer.appendChild(actionContainer);
                    
                    chatMessages.appendChild(botMessageContainer);
                }
            }
        });
        
        // 재생성 버튼 상태 업데이트 및 스크롤 조절
        updateRegenerateButtons(); 
        scrollToBottom(true);
    } else {
        // 대화가 없으면 초기 화면 표시
        initialContent.style.opacity = '1';
        initialContent.style.visibility = 'visible';
        chatMessages.style.display = 'none';
    }
}

function appendBotMessageFromHistory(content, feedbackStatus = null) {
    const botMessageContainer = document.createElement('div');
    botMessageContainer.className = 'bot-message';
    
    const streamingBlock = document.createElement('div');
    streamingBlock.className = 'streaming-block'; 
    
    // 🛠️ 여기서 아까 만든 변환 함수를 사용하여 깨짐 방지!
    streamingBlock.innerHTML = formatMessageContent(content);
    
    botMessageContainer.appendChild(streamingBlock);
    botMessageContainer.appendChild(createBotActions(content, history.indexOf(content), feedbackStatus));
    chatMessages.appendChild(botMessageContainer);
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
// script.js 내부 함수 수정

function autoResizeTextarea() {
    const style = getComputedStyle(inputField);
    const line_height_px = parseFloat(style.getPropertyValue('--line-height-px')) || 22.4; 
    const minInputContainerHeight = parseFloat(style.getPropertyValue('--min-input-container-height')) || 48; 

    // 1. 텍스트박스 높이 계산
    inputField.rows = MIN_ROWS;
    inputField.style.height = 'auto'; 
    
    let scrollH = inputField.scrollHeight;
    let newRows = Math.round(scrollH / line_height_px);
    newRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, newRows));
    
    inputField.rows = newRows;
    inputField.style.height = 'auto'; // 높이 적용
    
    // 2. 컨테이너 높이 맞춤 (Flex 구조라 전체 레이아웃이 알아서 밀려 올라감)
    // ⚠️ 기존의 chatMessages.style.paddingBottom 코드는 삭제합니다.
    // 구조적 레이아웃에서는 입력창이 커지면 채팅창 영역이 자동으로 줄어듭니다.
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
      let textToCopy = msg.content || ""; // msg는 해당 메시지 객체

    // 2. [THOUGHT]...[/THOUGHT] 제거 정규식
    // 대소문자 무시(i), 여러 줄 포함([\s\S]), 탐욕적이지 않게(*?)
    textToCopy = textToCopy.replace(/\[THOUGHT\][\s\S]*?\[\/THOUGHT\]/gi, "").trim();
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
    
    // --- streamInterval 부분 교체 시작 ---
streamInterval = setInterval(() => {
    if (streamQueue.length > 0) {
        // 끊김 없는 출력을 위해 한 번에 처리할 글자 수 조절
        const charsToTake = 12; 
        const chunkToAdd = streamQueue.slice(0, charsToTake);
        streamQueue = streamQueue.slice(charsToTake); 
        
        displayedResponse += chunkToAdd;
        fullResponse = displayedResponse; 

        // [핵심] 공통 함수로 렌더링
        streamingBlockElement.innerHTML = formatMessageContent(displayedResponse);

        // ✨ [추가] 답변 생성 중에는 추론 과정(details)을 강제로 펼침
        const details = streamingBlockElement.querySelector('.thought-dropdown');
        if (details) {
            details.open = true;
        }

        // 링크 버튼 처리
        const links = streamingBlockElement.querySelectorAll('p > a, li > a');
        links.forEach(link => {
            if (link.innerText.trim().startsWith('http') || link.innerText.trim() === link.href.trim()) {
                link.classList.add('link-button');
                link.innerHTML = `<span>링크 접속하기</span>`;
                link.target = '_blank';
            }
        });
        
        if (autoScrollEnabled) scrollToBottom(false);

    } else if (isNetworkFinished && streamQueue.length === 0) {
        // 스트리밍 종료 처리
        clearInterval(streamInterval);
        streamInterval = null;

        // ✨ [추가] 답변이 완료되면 추론 과정을 자동으로 닫음
        const details = streamingBlockElement.querySelector('.thought-dropdown');
        if (details) {
            details.open = false;
        }
        
        // 원본 텍스트(태그 포함)를 히스토리에 저장
        history.push({ 
            role: 'model', 
            content: displayedResponse, 
            feedback: null 
        }); 
        
        updateCurrentSession(); 
        
        // UI 상태 복구
        if (spinnerElement) spinnerElement.classList.add('reset-spin'); 
        if (indicatorTextElement) { 
            indicatorTextElement.style.display = 'none'; 
            indicatorTextElement.classList.add('completed'); 
        }
        indicatorElement.classList.add('left-aligned'); 
        
        // 하단 액션 버튼 추가
        const actionContainer = createBotActions(displayedResponse, history.length - 1);
        botMessageElement.appendChild(actionContainer); 
        
        updateRegenerateButtons();
        scrollToBottom(true);
        setStreamingState(false);
    }
}, 10);
// --- streamInterval 부분 교체 종료 ---
    







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
           // [수정 후]
let targetUrl;
if (currentModel === 'g4') {
    targetUrl = BACKEND_ENDPOINT_G4;
} else if (currentModel === 'g-fast') {
    targetUrl = BACKEND_ENDPOINT_FAST;
} else {
    targetUrl = BACKEND_ENDPOINT; // g5-pro
}



          
            const requestBody = { 
                message: userMessage, 
                history: [PRE_PROMPT, ...history],
            };
            
            const lastUserMsg = history[history.length - 1];
            if(lastUserMsg && lastUserMsg.images && lastUserMsg.images.length > 0) {
                requestBody.images = lastUserMsg.images;
            }

            // [수정] fetch 요청 시 targetUrl 사용
            const response = await fetch(targetUrl, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', },
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
        window.open('[https://minsugpt.kro.kr/app/update](https://minsugpt.kro.kr/app/update)', '_blank');
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
// script.js 파일 하단 (7. 초기화 섹션)

// script.js 파일 하단 (7. 초기화 섹션) 내 window.onload 함수 내부 수정/교체

// script.js 하단 window.onload 내부

window.onload = function() {
    // ... 기존 코드들 ...

    // ✅ 로그인 버튼 이벤트 연결
    if(accessConfirmBtn) {
        accessConfirmBtn.addEventListener('click', handleLoginCheck);
    }
    
    // 엔터키 입력 시 로그인 시도
    if(accessIdInput && accessPwInput) {
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLoginCheck();
            }
        };
        accessIdInput.addEventListener('keypress', handleEnter);
        accessPwInput.addEventListener('keypress', handleEnter);
        
        // 페이지 로드 시 ID 입력창에 포커스 (로그인이 우선이므로)
        setTimeout(() => {
            accessIdInput.focus();
        }, 300);
    }
    playIntroAnimation();
    // ... 나머지 초기화 코드들 ...
    // ... 나머지 기존 코드 ...
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





// ===========================================
// [신규] 3. 모델 선택 UI 제어 및 이벤트 리스너 (파일 하단에 추가)
// ===========================================

// 요소 선택
const headerModelSelect = document.getElementById('header-model-select');
const headerModelDropdown = document.getElementById('header-model-dropdown');
const headerModelText = document.getElementById('header-model-text');

const simpleModelBtn = document.getElementById('tool-model-selector');
const simpleModelDropdown = document.getElementById('simple-model-dropdown');
const simpleModelText = document.getElementById('simple-model-text');

// 드롭다운 닫기 함수
function closeAllDropdowns() {
    if(headerModelDropdown) headerModelDropdown.classList.remove('show');
    if(simpleModelDropdown) simpleModelDropdown.classList.remove('show');
}

// 모델 변경 처리 함수
function setModel(model) {
    currentModel = model;
    
    // ✨ G-Fast 텍스트 처리 추가
    let displayText = 'G-5 Pro';
    if (model === 'g4') displayText = 'G-4 beta';
    else if (model === 'g-fast') displayText = 'G-Fast';

    // 1. 텍스트 업데이트 (헤더 & 심플툴바 모두)
    if(headerModelText) headerModelText.textContent = displayText;
    if(simpleModelText) simpleModelText.textContent = displayText;

    // 2. 선택 상태(체크표시/색상) 업데이트
    const allOptions = document.querySelectorAll('.model-option-item');
    allOptions.forEach(opt => {
        if(opt.dataset.model === model) opt.classList.add('selected');
        else opt.classList.remove('selected');
    });

    // 3. 드롭다운 닫기
    closeAllDropdowns();
}

// 이벤트 리스너: 헤더 모델 선택 클릭
if(headerModelSelect) {
    headerModelSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShow = headerModelDropdown.classList.contains('show');
        closeAllDropdowns();
        if(!isShow) headerModelDropdown.classList.add('show');
    });
}

// 이벤트 리스너: 심플 툴바 모델 선택 클릭
if(simpleModelBtn) {
    simpleModelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShow = simpleModelDropdown.classList.contains('show');
        closeAllDropdowns();
        if(!isShow) simpleModelDropdown.classList.add('show');
    });
}

// 이벤트 리스너: 드롭다운 아이템 클릭 (옵션 선택)
document.querySelectorAll('.model-option-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedModel = item.dataset.model;
        setModel(selectedModel);
    });
});

// 이벤트 리스너: 외부 클릭 시 닫기
document.addEventListener('click', () => {
    closeAllDropdowns();
});









// ===========================================
// [추가] 랜덤 환영 문구 및 애니메이션 로직
// ===========================================
const greetingMessages = [
    "오늘은 기분이 어떠신가요?",
    "무엇을 도와드릴까요?",
    "오늘도 힘내세요",
    "어디서부터 시작할까요?"
];

function playIntroAnimation() {
    const container = document.getElementById('initial-content');
    const textElement = document.getElementById('random-greeting');

    if (container && textElement) {
        // 1. 텍스트 랜덤 변경
        const randomMsg = greetingMessages[Math.floor(Math.random() * greetingMessages.length)];
        textElement.textContent = randomMsg;

        // 2. 애니메이션 클래스 초기화
        container.classList.remove('start-anim');
        
        // 브라우저가 스타일 변화를 강제로 인지하도록 함 (중요)
        void container.offsetWidth; 
        
        // 3. 클래스 추가하여 애니메이션 시작
        container.classList.add('start-anim');
    }
}






// [필수] 모바일 브라우저 툴바 및 키보드 가림 완벽 대응
function syncHeight() {
    const phone = document.querySelector('.phone');
    if (phone && window.visualViewport) {
        // 실제 가시 화면 높이(툴바/주소창 제외)를 가져옴
        const visibleHeight = window.visualViewport.height;
        phone.style.height = `${visibleHeight}px`;
    }
}

if (window.visualViewport) {
    // 툴바가 생기거나 사라질 때, 키보드가 올라올 때 모두 실행
    window.visualViewport.addEventListener('resize', syncHeight);
    window.visualViewport.addEventListener('scroll', syncHeight);
}

// 초기 로드 시 실행
window.addEventListener('load', syncHeight);

// [추가] 텍스트 입력 시 항상 마지막 줄이 보이도록 스크롤 유지
const ta = document.querySelector('.input-container textarea');
if (ta) {
    ta.addEventListener('input', function() {
        this.scrollTop = this.scrollHeight;
    });
}
