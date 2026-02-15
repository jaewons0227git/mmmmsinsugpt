 let currentLang = 'ko';
        let isGenerating = false;
        let isSearchActive = false;
        let isThinkingActive = false;
        let isManuallyStopped = false; // Flag to handle immediate stop
        let typingTimeout = null;
        let thinkingTimeout = null;
        let currentBubbleElement = null;
        let currentBotRowElement = null; 
        let streamReader = null;

        let currentChatId = null;
        let currentMessages = [];
        let currentAttachments = []; 
        const STORAGE_KEY = 'chat_history_v1';
        
        let systemPrompt = localStorage.getItem('systemPrompt') || '';
        let botTone = localStorage.getItem('botTone') || 'friendly';
        let isHistoryEnabled = localStorage.getItem('isHistoryEnabled') !== 'false';
        
        let hapticStrength = parseInt(localStorage.getItem('hapticStrength')) || 1; 

        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const newChatBtn = document.getElementById('newChatBtn');
        const welcomeScreen = document.getElementById('welcome-screen');
        const chatContent = document.getElementById('chat-content');
        const bottomInterface = document.getElementById('bottom-interface');
        const centerInput = document.getElementById('centerInput');
        const centerSendBtn = document.getElementById('centerSendBtn');
        const bottomInput = document.getElementById('bottomInput');
        const bottomSendBtn = document.getElementById('bottomSendBtn');
        const settingsModal = document.getElementById('settings-modal');
        const dialogModal = document.getElementById('dialog-modal');
        const chatHistoryList = document.getElementById('chatHistoryList');
        const hiddenFileInput = document.getElementById('hiddenFileInput');
        const imageLightbox = document.getElementById('image-lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const settingsSidebar = document.getElementById('settingsSidebar');
        const settingsContent = document.getElementById('settingsContent');

        const icons = {
            send: '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>',
            stop: '<svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>',
            copy: '<svg class="action-icon" style="transform: scaleX(-1);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
            check: '<svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>',
            regenerate: '<svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>',
            edit: '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>',
            trash: '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>'
        };

        function init() {
            if (window.innerWidth <= 768) sidebar.classList.add('collapsed');
            updateUIText('ko');
            loadHistoryFromStorage();
            
            document.getElementById('systemPromptInput').value = systemPrompt;
            document.getElementById('historyToggle').checked = isHistoryEnabled;
            document.getElementById('hapticRange').value = hapticStrength; 
            
            const toneKey = botTone;
            if(translations['ko'][toneKey]) {
                document.getElementById('currentToneLabel').innerText = translations['ko'][toneKey];
                document.querySelectorAll('#toneSelect .custom-option').forEach(opt => {
                     if(opt.getAttribute('data-i18n') === toneKey) opt.classList.add('selected');
                     else opt.classList.remove('selected');
                });
            }

            const urlParams = new URLSearchParams(window.location.search);
            const chatIdFromUrl = urlParams.get('chat');
            
            if (chatIdFromUrl) {
                loadChat(chatIdFromUrl);
            } else {
                startNewChat(false);
            }
        }

        function toggleSearchMode(origin) {
            isSearchActive = !isSearchActive;
            const btnCenter = document.getElementById('centerSearchBtn');
            const btnBottom = document.getElementById('bottomSearchBtn');
            
            if (isSearchActive) {
                btnCenter.classList.add('active');
                btnBottom.classList.add('active');
            } else {
                btnCenter.classList.remove('active');
                btnBottom.classList.remove('active');
            }
            triggerHaptic();
        }

        function toggleThinkingMode(origin) {
            isThinkingActive = !isThinkingActive;
            const btnCenter = document.getElementById('centerThinkBtn');
            const btnBottom = document.getElementById('bottomThinkBtn');
            
            if (isThinkingActive) {
                btnCenter.classList.add('active');
                btnBottom.classList.add('active');
            } else {
                btnCenter.classList.remove('active');
                btnBottom.classList.remove('active');
            }
            triggerHaptic();
        }

        function toggleAttachMenu(origin) {
            const menu = document.getElementById(origin + 'AttachMenu');
            const isOpen = menu.classList.contains('open');
            document.querySelectorAll('.attach-menu').forEach(el => el.classList.remove('open'));
            if (!isOpen) menu.classList.add('open');
        }

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.attach-menu') && !e.target.closest('.icon-btn')) {
                document.querySelectorAll('.attach-menu').forEach(el => el.classList.remove('open'));
            }
        });

        function handleFileUpload(type, origin) {
            document.querySelectorAll('.attach-menu').forEach(el => el.classList.remove('open'));
            hiddenFileInput.setAttribute('accept', type === 'image' ? 'image/*' : '*/*');
            hiddenFileInput.onchange = (e) => processFiles(e.target.files, origin);
            hiddenFileInput.click();
        }

        async function processFiles(files, origin) {
            if (!files || files.length === 0) return;

            for (let file of files) {
                if (file.type.startsWith('image/')) {
                    const compressedDataUrl = await compressImage(file);
                    const base64String = compressedDataUrl.split(',')[1];
                    currentAttachments.push({ type: 'image', data: compressedDataUrl, base64: base64String, name: file.name, fileObject: file });
                } else {
                    currentAttachments.push({ type: 'file', name: file.name, size: file.size, fileObject: file });
                }
            }
            renderAttachments();
            hiddenFileInput.value = '';
        }

        function compressImage(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const MAX_SIZE = 800;
                        let width = img.width;
                        let height = img.height;
                        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
                        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                        canvas.width = width; canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.7));
                    };
                };
            });
        }

        function renderAttachments() {
            const centerPreview = document.getElementById('center-preview');
            const bottomPreview = document.getElementById('bottom-preview');
            [centerPreview, bottomPreview].forEach(container => {
                container.innerHTML = '';
                if (currentAttachments.length > 0) container.classList.add('has-items');
                else container.classList.remove('has-items');
                currentAttachments.forEach((att, index) => {
                    const card = document.createElement('div');
                    card.className = `attach-card ${att.type === 'file' ? 'file-type' : ''}`;
                    if (att.type === 'image') {
                        card.style.backgroundImage = `url(${att.data})`;
                        card.onclick = () => openImageLightbox(att.data);
                    } else {
                        card.innerText = "📄\n" + att.name.substring(0, 10) + "...";
                    }
                    const removeBtn = document.createElement('div');
                    removeBtn.className = 'attach-card-remove';
                    removeBtn.innerHTML = '&times;';
                    removeBtn.onclick = (e) => { e.stopPropagation(); removeAttachment(index); };
                    card.appendChild(removeBtn);
                    container.appendChild(card);
                });
            });
            toggleBtnState(centerInput.value, centerSendBtn);
            toggleBtnState(bottomInput.value, bottomSendBtn);
        }

        function removeAttachment(index) {
            currentAttachments.splice(index, 1);
            renderAttachments();
        }

        function openImageLightbox(src) { lightboxImg.src = src; imageLightbox.classList.add('open'); }
        function closeImageLightbox() { imageLightbox.classList.remove('open'); setTimeout(() => { lightboxImg.src = ''; }, 300); }

        function generateId(length = 12) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
            return result;
        }

        function getStoredChats() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }

        function saveChatToStorage(chatObj) {
            let chats = getStoredChats();
            const existingIndex = chats.findIndex(c => c.id === chatObj.id);
            if (existingIndex > -1) chats[existingIndex] = chatObj; else chats.unshift(chatObj);
            chatObj.updatedAt = Date.now();
            chats.sort((a, b) => b.updatedAt - a.updatedAt);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); } 
            catch (e) { if (e.name === 'QuotaExceededError') { while (chats.length > 0) { chats.pop(); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); break; } catch (e2) { if (chats.length === 0) break; } } } }
            renderHistoryList();
        }

        function deleteChatFromStorage(id) {
            let chats = getStoredChats();
            chats = chats.filter(c => c.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
            renderHistoryList();
        }

        function startNewChat(updateUrl = true) {
            if (isGenerating) stopGeneration();
            currentChatId = generateId();
            currentMessages = [];
            currentAttachments = [];
            renderAttachments();
            chatContent.innerHTML = '';
            welcomeScreen.classList.remove('hidden');
            chatContent.classList.remove('visible');
            bottomInterface.classList.remove('visible');
            newChatBtn.classList.add('active');
            centerInput.value = ''; bottomInput.value = '';
            centerInput.style.height = '28px'; bottomInput.style.height = '28px';
            toggleBtnState('', centerSendBtn);
            document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
            if (updateUrl) { const url = new URL(window.location); url.searchParams.set('chat', currentChatId); window.history.pushState({}, '', url); }
            if (window.innerWidth <= 768) { sidebar.classList.add('collapsed'); sidebarOverlay.classList.remove('visible'); }
            
            sendSystemConfig();
        }

        function loadChat(id) {
            const chats = getStoredChats();
            const chat = chats.find(c => c.id === id);
            if (!chat) { startNewChat(); return; }
            if (isGenerating) stopGeneration();
            currentChatId = chat.id;
            currentMessages = chat.messages || [];
            currentAttachments = [];
            renderAttachments();
            welcomeScreen.classList.add('hidden');
            chatContent.classList.add('visible');
            bottomInterface.classList.add('visible');
            newChatBtn.classList.remove('active');
            chatContent.innerHTML = '';
            
            currentMessages.forEach((msg, index) => {
                if (msg.role === 'user') appendMessageUI('user', msg.content, false, msg.attachments);
                else if (msg.role === 'bot') {
                    appendMessageUI('bot', msg.content, false);
                    const rows = chatContent.querySelectorAll('.message-row.bot');
                    const lastRow = rows[rows.length-1];
                    const isLastMessage = (index === currentMessages.length - 1);
                    if(lastRow) addActionButtons(lastRow.querySelector('.bot-bubble-wrapper'), msg.content, isLastMessage);
                }
            });
            const url = new URL(window.location); url.searchParams.set('chat', currentChatId); window.history.pushState({}, '', url);
            renderHistoryList();
            if (window.innerWidth <= 768) { sidebar.classList.add('collapsed'); sidebarOverlay.classList.remove('visible'); }
            scrollToBottom();
            
            sendSystemConfig();
        }

        function renderHistoryList() {
            const chats = getStoredChats();
            chatHistoryList.innerHTML = '';
            chats.forEach(chat => {
                const div = document.createElement('div');
                div.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
                div.onclick = (e) => { if (e.target.closest('.history-action-btn')) return; loadChat(chat.id); };
                const titleSpan = document.createElement('span'); titleSpan.className = 'history-title'; titleSpan.innerText = chat.title || 'New Conversation';
                const actionsDiv = document.createElement('div'); actionsDiv.className = 'history-actions';
                const editBtn = document.createElement('div'); editBtn.className = 'history-action-btn'; editBtn.innerHTML = icons.edit; editBtn.onclick = () => openRenameModal(chat.id, chat.title);
                const delBtn = document.createElement('div'); delBtn.className = 'history-action-btn delete'; delBtn.innerHTML = icons.trash; delBtn.onclick = () => confirmDeleteChat(chat.id);
                actionsDiv.appendChild(editBtn); actionsDiv.appendChild(delBtn);
                div.appendChild(titleSpan); div.appendChild(actionsDiv); chatHistoryList.appendChild(div);
            });
        }

        function openDialog(title, inputMode, confirmCallback) {
            document.getElementById('dialog-title').innerText = title;
            const input = document.getElementById('dialog-input');
            const confirmBtn = document.getElementById('dialog-confirm-btn');
            if (inputMode) { input.style.display = 'block'; input.value = inputMode; input.focus(); confirmBtn.className = 'dialog-btn confirm'; confirmBtn.innerText = translations[currentLang].newChat === "New Chat" ? "Save" : "저장"; } 
            else { input.style.display = 'none'; confirmBtn.className = 'dialog-btn delete-confirm'; confirmBtn.innerText = translations[currentLang].delete; }
            confirmBtn.onclick = () => { const val = input.value.trim(); if (inputMode && !val) return; confirmCallback(val); closeDialog(); };
            dialogModal.classList.add('open');
        }
        function closeDialog() { dialogModal.classList.remove('open'); }
        dialogModal.addEventListener('click', (e) => { if (e.target === dialogModal) closeDialog(); });
        function openRenameModal(id, currentTitle) { openDialog(translations[currentLang].editTitle, currentTitle || 'New Conversation', (newTitle) => { let chats = getStoredChats(); const chat = chats.find(c => c.id === id); if (chat) { chat.title = newTitle; saveChatToStorage(chat); } }); }
        function confirmDeleteChat(id) { openDialog(translations[currentLang].deleteConfirmMsg, null, () => { deleteChatFromStorage(id); if (currentChatId === id) startNewChat(); }); }
        function confirmDeleteAllChats() { openDialog(translations[currentLang].deleteAllConfirmMsg, null, () => { localStorage.removeItem(STORAGE_KEY); startNewChat(); renderHistoryList(); closeSettings(); }); }

        function toggleSidebar() { const isCollapsed = sidebar.classList.toggle('collapsed'); if (window.innerWidth <= 768) { if (!isCollapsed) sidebarOverlay.classList.add('visible'); else sidebarOverlay.classList.remove('visible'); } }
        
        function triggerHaptic() { 
            if (navigator.vibrate && hapticStrength > 0) navigator.vibrate(hapticStrength); 
        }
        
        function autoResize(el) { el.style.height = '28px'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; }
        function scrollToBottom() { chatContent.scrollTop = chatContent.scrollHeight; }
        function toggleBtnState(val, btn) { if (isGenerating) { btn.classList.add('stop-active'); } else { (val.trim().length > 0 || currentAttachments.length > 0) ? btn.classList.add('active') : btn.classList.remove('active'); btn.classList.remove('stop-active'); } }
        function handleKeydown(e, type) { if (e.isComposing) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendClick(type); } }

        centerInput.addEventListener('input', function() { autoResize(this); toggleBtnState(this.value, centerSendBtn); });
        centerInput.addEventListener('keydown', (e) => handleKeydown(e, 'center'));
        bottomInput.addEventListener('input', function() { autoResize(this); toggleBtnState(this.value, bottomSendBtn); });
        bottomInput.addEventListener('keydown', (e) => handleKeydown(e, 'bottom'));

        // --- System Config Logic (Background) ---
        async function sendSystemConfig() {
            const endpoint = isSearchActive || isThinkingActive
                ? 'https://jaewondev6.pythonanywhere.com/ask' 
                : 'https://jaewondev6.pythonanywhere.com/askfast';
            
            let instructions = "";
            if (systemPrompt) instructions += `[System Instruction: ${systemPrompt}]\n`;
            instructions += `[Tone Instruction: Act ${botTone}.`;
            if (['friendly', 'soft', 'stiff'].includes(botTone)) instructions += " Use polite honorifics (korean 'yo/nida').";
            else if (botTone === 'friend') instructions += " Use casual language (Banmal).";
            instructions += "]\n(This is a system setup message. Do NOT respond to this message. Just set your persona.)";

            try {
                fetch(endpoint, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: instructions, history: [], image_base64: [] })
                }).catch(() => {}); 
            } catch (e) {}
        }

        async function handleSendClick(origin) {
            if (isGenerating) { stopGeneration(); return; }
            triggerHaptic();

            const input = origin === 'center' ? centerInput : bottomInput;
            const text = input.value.trim();
            if (!text && currentAttachments.length === 0) return;

            const endpoint = isSearchActive || isThinkingActive
                ? 'https://jaewondev6.pythonanywhere.com/ask' 
                : 'https://jaewondev6.pythonanywhere.com/askfast';
            
            if (origin === 'center') {
                newChatBtn.classList.remove('active'); 
                welcomeScreen.classList.add('hidden'); 
                chatContent.classList.add('visible'); 
                bottomInterface.classList.add('visible');
            }

            let hiddenInst = "";
            if (systemPrompt) hiddenInst += `[System: ${systemPrompt}] `;
            hiddenInst += `[Tone: ${botTone}] `;
            if (['friendly', 'soft', 'stiff'].includes(botTone)) hiddenInst += "[Use honorifics] ";
            else if (botTone === 'friend') hiddenInst += "[Use banmal] ";

            const messageToSend = `${hiddenInst}\n${text}`;

            let historyPayload = [];
            if (isHistoryEnabled) {
                historyPayload = currentMessages.map(m => ({
                    role: m.role === 'bot' ? 'model' : 'user',
                    content: m.content
                }));
            }

            let imagePayload = currentAttachments.filter(a => a.type === 'image').map(a => a.base64);

            const requestBody = JSON.stringify({
                message: messageToSend,
                history: historyPayload,
                image_base64: imagePayload
            });

            const attachmentsToSend = [...currentAttachments];
            currentAttachments = [];
            renderAttachments(); 

            input.value = ''; input.style.height = '28px';
            toggleBtnState('', origin === 'center' ? centerSendBtn : bottomSendBtn);

            appendMessageUI('user', text, false, attachmentsToSend);
            currentMessages.push({ role: 'user', content: text, attachments: attachmentsToSend });
            
            let chats = getStoredChats();
            let currentChat = chats.find(c => c.id === currentChatId);
            let title = currentChat ? currentChat.title : (text.substring(0, 30) || "Conversation");
            saveChatToStorage({ id: currentChatId, title: title, messages: currentMessages });

            scrollToBottom();
            
            document.querySelectorAll('.action-btn.regenerate').forEach(btn => btn.closest('.message-actions').remove());

            await streamResponse(endpoint, {'Content-Type': 'application/json'}, requestBody);
        }

        async function streamResponse(endpoint, headers, body) {
            startGenerationState();
            isManuallyStopped = false; 
            
            const row = document.createElement('div'); row.className = 'message-row bot';
            const wrapper = document.createElement('div'); wrapper.className = 'bot-bubble-wrapper';
            const bubble = document.createElement('div'); bubble.className = 'message-bubble bot-content';
            const dot = document.createElement('div'); dot.className = 'thinking-dot';
            bubble.appendChild(dot);
            wrapper.appendChild(bubble); row.appendChild(wrapper); chatContent.appendChild(row);
            scrollToBottom();
            
            currentBotRowElement = wrapper;
            currentBubbleElement = bubble;
            
            let fullText = "";
            let displayedText = "";
            let firstChunk = true;

            const typeWriter = setInterval(() => {
                if (isManuallyStopped) {
                    clearInterval(typeWriter);
                    return;
                }

                if (displayedText.length < fullText.length) {
                    if (firstChunk) { bubble.innerHTML = ""; firstChunk = false; triggerHaptic(); }
                    const charsToAdd = fullText.slice(displayedText.length, displayedText.length + 3);
                    displayedText += charsToAdd;
                    bubble.innerHTML = marked.parse(displayedText);
                    scrollToBottom();
                    triggerHaptic(); 
                } else if (!isGenerating && displayedText.length === fullText.length) {
                     clearInterval(typeWriter);
                }
            }, 30);

            try {
                const response = await fetch(endpoint, { method: 'POST', headers: headers, body: body });
                if (!response.body) throw new Error('ReadableStream not supported');
                streamReader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    if (isManuallyStopped) break;
                    const { done, value } = await streamReader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    const cleanChunk = chunk.replace(/\[DONE\]/g, ''); 
                    fullText += cleanChunk;
                }
            } catch (error) {
                console.error('Stream error:', error);
                if (currentBubbleElement) {
                     if (firstChunk) bubble.innerHTML = ""; 
                     currentBubbleElement.innerHTML += `<br><span class="stopped-text">[Error: ${error.message}]</span>`;
                }
            } finally {
                if (!isManuallyStopped) {
                    const checkDone = setInterval(() => {
                        if (displayedText.length >= fullText.length) {
                            clearInterval(checkDone); clearInterval(typeWriter);
                            finishGeneration(fullText);
                        }
                    }, 100);
                }
                streamReader = null;
            }
        }

        function appendMessageUI(role, text, isTyping = false, attachments = []) {
            const row = document.createElement('div'); row.className = `message-row ${role}`;
            if (attachments && attachments.length > 0) {
                const attachDiv = document.createElement('div'); attachDiv.className = 'bubble-attachments';
                attachments.forEach(att => {
                    const card = document.createElement('div');
                    if (att.type === 'image') { card.className = 'bubble-image-card'; card.style.backgroundImage = `url(${att.data})`; card.onclick = () => openImageLightbox(att.data); } 
                    else { card.className = 'bubble-file-card'; card.innerText = "📄 " + att.name; }
                    attachDiv.appendChild(card);
                });
                row.appendChild(attachDiv);
            }
            if (role === 'bot') {
                const wrapper = document.createElement('div'); wrapper.className = 'bot-bubble-wrapper';
                const bubble = document.createElement('div'); bubble.className = `message-bubble ${role}-content`;
                wrapper.appendChild(bubble); row.appendChild(wrapper); chatContent.appendChild(row);
                currentBotRowElement = wrapper;
                bubble.innerHTML = marked.parse(text);
            } else {
                if (text) { const bubble = document.createElement('div'); bubble.className = `message-bubble ${role}-content`; bubble.innerText = text; row.appendChild(bubble); }
                
                const userActions = document.createElement('div'); userActions.className = 'user-actions';
                const copyBtn = document.createElement('div'); copyBtn.className = 'action-btn'; copyBtn.innerHTML = icons.copy;
                copyBtn.onclick = () => { navigator.clipboard.writeText(text); copyBtn.innerHTML = icons.check; setTimeout(() => copyBtn.innerHTML = icons.copy, 2000); };
                const editBtn = document.createElement('div'); editBtn.className = 'action-btn'; editBtn.innerHTML = icons.edit;
                const thisMsgIndex = currentMessages.length;
                editBtn.onclick = () => handleEditClick(bubble, thisMsgIndex);
                userActions.appendChild(copyBtn); userActions.appendChild(editBtn);
                row.appendChild(userActions);

                chatContent.appendChild(row);
            }
            scrollToBottom();
            return row;
        }

        function startGenerationState() {
            isGenerating = true;
            centerSendBtn.innerHTML = icons.stop; bottomSendBtn.innerHTML = icons.stop;
            centerSendBtn.classList.add('stop-active'); bottomSendBtn.classList.add('stop-active');
        }

        function addActionButtons(wrapperElement, bubbleText, showRegen = false) {
            if (!wrapperElement) return;
            if (wrapperElement.querySelector('.message-actions')) return; 

            const actionsDiv = document.createElement('div'); actionsDiv.className = 'message-actions';
            
            const copyBtn = document.createElement('div'); copyBtn.className = 'action-btn'; copyBtn.innerHTML = icons.copy;
            copyBtn.onclick = function() {
                const tempDiv = document.createElement('div'); tempDiv.innerHTML = bubbleText;
                const textToCopy = tempDiv.innerText || bubbleText;
                navigator.clipboard.writeText(textToCopy.replace('[답변 중지됨]', '')).then(() => {
                    copyBtn.innerHTML = icons.check; setTimeout(() => { copyBtn.innerHTML = icons.copy; }, 2000);
                });
            };
            actionsDiv.appendChild(copyBtn);

            if (showRegen) {
                const regenBtn = document.createElement('div'); regenBtn.className = 'action-btn regenerate'; regenBtn.innerHTML = icons.regenerate;
                regenBtn.onclick = function() {
                    const rowToRemove = wrapperElement.closest('.message-row');
                    if (rowToRemove) rowToRemove.remove();
                    if (currentMessages.length > 0 && currentMessages[currentMessages.length-1].role === 'bot') currentMessages.pop();
                    const lastUserMsg = currentMessages.slice().reverse().find(m => m.role === 'user');
                    if(lastUserMsg) {
                        const endpoint = isSearchActive || isThinkingActive ? 'https://jaewondev6.pythonanywhere.com/ask' : 'https://jaewondev6.pythonanywhere.com/askfast';
                        
                        let regenImages = [];
                        if (lastUserMsg.attachments) {
                            regenImages = lastUserMsg.attachments.filter(a => a.type === 'image').map(a => a.base64);
                        }
                        
                        let hiddenInst = "";
                        if (systemPrompt) hiddenInst += `[System: ${systemPrompt}] `;
                        hiddenInst += `[Tone: ${botTone}] `;
                        
                        const regenBody = JSON.stringify({
                            message: `${hiddenInst}\n${lastUserMsg.content}`,
                            history: currentMessages.map(m => ({ role: m.role==='bot'?'model':'user', content: m.content })),
                            image_base64: regenImages
                        });

                        streamResponse(endpoint, {'Content-Type': 'application/json'}, regenBody);
                    }
                };
                actionsDiv.appendChild(regenBtn);
            }

            wrapperElement.appendChild(actionsDiv);
            requestAnimationFrame(() => { actionsDiv.classList.add('visible'); scrollToBottom(); });
        }

        function finishGeneration(finalText) {
            isGenerating = false;
            
            document.querySelectorAll('.action-btn.regenerate').forEach(btn => btn.closest('.message-actions').remove());

            if (currentBotRowElement && currentBubbleElement) {
                addActionButtons(currentBotRowElement, finalText, true);
            }

            if (finalText) {
                currentMessages.push({ role: 'bot', content: finalText });
                let chats = getStoredChats();
                const chat = chats.find(c => c.id === currentChatId);
                if (chat) { chat.messages = currentMessages; saveChatToStorage(chat); }
            }

            currentBubbleElement = null; currentBotRowElement = null;
            centerSendBtn.innerHTML = icons.send; bottomSendBtn.innerHTML = icons.send;
            centerSendBtn.classList.remove('stop-active'); bottomSendBtn.classList.remove('stop-active');
            toggleBtnState(centerInput.value, centerSendBtn); toggleBtnState(bottomInput.value, bottomSendBtn);
        }

        function stopGeneration() {
            isManuallyStopped = true; 
            if (streamReader) streamReader.cancel();
            
            let finalText = "";
            if (currentBubbleElement) {
                if (currentBubbleElement.innerHTML.includes('thinking-dot')) {
                    currentBubbleElement.innerHTML = "";
                }
                const stopSpan = document.createElement('span'); stopSpan.className = 'stopped-text'; stopSpan.innerText = " [답변 중지됨]";
                currentBubbleElement.appendChild(stopSpan);
                finalText = currentBubbleElement.innerHTML; 
            }
            isGenerating = false;
            finishGeneration(finalText);
        }

        function handleEditClick(bubble, messageIndex) {
            const originalText = currentMessages[messageIndex].content;
            const editContainer = document.createElement('div'); editContainer.className = 'edit-container';
            const textarea = document.createElement('textarea'); textarea.className = 'edit-textarea'; textarea.value = originalText;
            const btnRow = document.createElement('div'); btnRow.className = 'edit-buttons';
            const saveBtn = document.createElement('button'); saveBtn.className = 'edit-btn save'; saveBtn.innerText = 'Save & Submit';
            saveBtn.onclick = () => submitEdit(messageIndex, textarea.value);
            const cancelBtn = document.createElement('button'); cancelBtn.className = 'edit-btn cancel'; cancelBtn.innerText = 'Cancel';
            cancelBtn.onclick = () => cancelEdit(bubble, originalText);
            btnRow.appendChild(cancelBtn); btnRow.appendChild(saveBtn);
            editContainer.appendChild(textarea); editContainer.appendChild(btnRow);
            bubble.innerHTML = ''; bubble.appendChild(editContainer); textarea.focus();
        }

        function cancelEdit(bubble, originalText) { bubble.innerHTML = originalText; }

        async function submitEdit(messageIndex, newText) {
            if (!newText.trim()) return;
            currentMessages = currentMessages.slice(0, messageIndex);
            
            chatContent.innerHTML = '';
            currentMessages.forEach((msg, idx) => {
                if (msg.role === 'user') appendMessageUI('user', msg.content, false, msg.attachments);
                else if (msg.role === 'bot') {
                    appendMessageUI('bot', msg.content, false);
                    const rows = chatContent.querySelectorAll('.message-row.bot');
                    const lastRow = rows[rows.length-1];
                    if(lastRow) addActionButtons(lastRow.querySelector('.bot-bubble-wrapper'), msg.content, false);
                }
            });

            appendMessageUI('user', newText, false, []); 
            currentMessages.push({ role: 'user', content: newText, attachments: [] }); 
            
            scrollToBottom();
            
            const endpoint = isSearchActive || isThinkingActive ? 'https://jaewondev6.pythonanywhere.com/ask' : 'https://jaewondev6.pythonanywhere.com/askfast';
            let hiddenInst = "";
            if (systemPrompt) hiddenInst += `[System: ${systemPrompt}] `;
            hiddenInst += `[Tone: ${botTone}] `;
            const messageToSend = `${hiddenInst}\n${newText}`;
            let historyPayload = [];
            if (isHistoryEnabled) { historyPayload = currentMessages.map(m => ({ role: m.role === 'bot' ? 'model' : 'user', content: m.content })); }
            
            const requestBody = JSON.stringify({ message: messageToSend, history: historyPayload, image_base64: [] });
            await streamResponse(endpoint, {'Content-Type': 'application/json'}, requestBody);
        }

        function loadHistoryFromStorage() { renderHistoryList(); }
        function openSettings() { settingsModal.classList.add('open'); if(window.innerWidth <= 768) { sidebar.classList.add('collapsed'); sidebarOverlay.classList.remove('visible'); } }
        function closeSettings() { settingsModal.classList.remove('open'); document.querySelectorAll('.custom-select-container').forEach(el => el.classList.remove('open')); if(window.innerWidth <= 768) backToSettingsList(); }
        settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });
        function toggleDropdown(id) { const el = document.getElementById(id); document.querySelectorAll('.custom-select-container').forEach(item => { if (item.id !== id) item.classList.remove('open'); }); el.classList.toggle('open'); }
        function setTheme(mode, optionEl) { const container = document.getElementById('themeSelect'); container.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected')); optionEl.classList.add('selected'); const key = optionEl.getAttribute('data-i18n'); document.getElementById('currentThemeLabel').innerText = translations[currentLang][key]; container.classList.remove('open'); if (mode === 'system') { const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches; document.body.setAttribute('data-theme', isDark ? 'dark' : 'light'); } else { document.body.setAttribute('data-theme', mode); } }
        function setLanguage(langCode, label, optionEl) { const container = document.getElementById('langSelect'); container.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected')); optionEl.classList.add('selected'); document.getElementById('currentLangLabel').innerText = label; container.classList.remove('open'); currentLang = langCode; updateUIText(langCode); renderHistoryList(); }
        
        function savePersonalization() { systemPrompt = document.getElementById('systemPromptInput').value; localStorage.setItem('systemPrompt', systemPrompt); sendSystemConfig(); }
        function setTone(toneValue, label, optionEl) { const container = document.getElementById('toneSelect'); container.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected')); optionEl.classList.add('selected'); document.getElementById('currentToneLabel').innerText = label; container.classList.remove('open'); botTone = toneValue; localStorage.setItem('botTone', botTone); sendSystemConfig(); }
        function toggleHistoryMemory(checkbox) { isHistoryEnabled = checkbox.checked; localStorage.setItem('isHistoryEnabled', isHistoryEnabled); }
        function updateHapticStrength(val) { hapticStrength = parseInt(val); localStorage.setItem('hapticStrength', hapticStrength); triggerHaptic(); }

        function updateUIText(lang) { const t = translations[lang]; if (!t) return; document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if (t[key]) el.innerText = t[key]; }); document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const key = el.getAttribute('data-i18n-placeholder'); if (t[key]) el.placeholder = t[key]; }); const currentThemeKey = document.querySelector('#themeSelect .custom-option.selected').getAttribute('data-i18n'); if (currentThemeKey && t[currentThemeKey]) document.getElementById('currentThemeLabel').innerText = t[currentThemeKey]; const toneKey = botTone; if(t[toneKey]) document.getElementById('currentToneLabel').innerText = t[toneKey]; }
        document.addEventListener('click', function(e) { if (!e.target.closest('.custom-select-container')) { document.querySelectorAll('.custom-select-container').forEach(el => el.classList.remove('open')); } });

        function switchSettingsTab(tabName, navItem) {
            document.querySelectorAll('.settings-nav-item').forEach(el => el.classList.remove('active'));
            if(navItem) navItem.classList.add('active');
            document.querySelectorAll('.tab-section').forEach(el => el.classList.remove('active-tab'));
            const target = document.getElementById('tab-' + tabName);
            if(target) target.classList.add('active-tab');
            const key = navItem ? navItem.querySelector('span:not(.set-icon)').getAttribute('data-i18n') : 'general';
            document.getElementById('settings-header-title').innerText = translations[currentLang][key] || key;
            if (window.innerWidth <= 768) { document.getElementById('settingsSidebar').classList.add('hidden'); document.getElementById('settingsContent').classList.add('active'); }
        }

        function backToSettingsList() {
            document.getElementById('settingsSidebar').classList.remove('hidden');
            document.getElementById('settingsContent').classList.remove('active');
        }
        
        // Marked.js 커스텀 렌더러 설정
const renderer = new marked.Renderer();

renderer.code = function(code, language) {
    // 1. 언어가 없으면 highlight.js로 자동 감지 시도
    let validLanguage = language;
    let highlightedCode = code;

    if (language && hljs.getLanguage(language)) {
        try {
            highlightedCode = hljs.highlight(code, { language: language }).value;
        } catch (e) {
            console.error(e);
        }
    } else {
        // 언어 미지정 시 자동 감지
        const result = hljs.highlightAuto(code);
        highlightedCode = result.value;
        validLanguage = result.language || 'plaintext'; // 감지된 언어 이름
    }

    // 2. HTML 구조 생성 (헤더 + 본문)
    // 랜덤 ID 생성 (복사 기능을 위해 필요할 수 있음)
    const uniqueId = 'code-' + Math.random().toString(36).substr(2, 9);
    
    // 이모지 없이 순수 언어명만 표시 (예: HTML)
    const displayLang = (validLanguage || 'CODE').toUpperCase();

    return `
    <div class="code-block-container">
        <div class="code-block-header">
            <span class="lang-name">${displayLang}</span>
            <button class="copy-btn" onclick="copyToClipboard(this, \`${encodeURIComponent(code)}\`)">
                <i class="far fa-copy"></i> 복사
            </button>
        </div>
        <div class="code-block-body">
            <pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>
        </div>
    </div>
    `;
};

marked.setOptions({ renderer: renderer });

// ---------------------------------------------------------
// [기능 함수 1] 마크다운 변환 함수
// 봇의 응답 텍스트를 이 함수에 넣으면 HTML로 변환되어 나옵니다.
// 예: msgDiv.innerHTML = parseMarkdown(botResponseText);
function parseMarkdown(text) {
    return marked.parse(text);
}

// [기능 함수 2] 복사 버튼 기능
function copyToClipboard(btnElement, encodedCode) {
    const code = decodeURIComponent(encodedCode);
    
    navigator.clipboard.writeText(code).then(() => {
        // 복사 성공 시 아이콘/텍스트 변경
        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-check"></i> 완료!';
        btnElement.style.color = '#2da44e'; // 초록색

        // 2초 뒤 원상복구
        setTimeout(() => {
            btnElement.innerHTML = '<i class="far fa-copy"></i> 복사';
            btnElement.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('복사 실패:', err);
        alert('복사에 실패했습니다.');
    });
}

        init();
