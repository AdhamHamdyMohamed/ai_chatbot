document.addEventListener('DOMContentLoaded', function () {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const messages = document.getElementById('messages');
    const newChatBtn = document.getElementById('newChatBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const chatHistoryList = document.getElementById('chatHistoryList');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const emptyHistory = document.getElementById('emptyHistory');
    const confirmationDialog = document.getElementById('confirmationDialog');
    const cancelClearBtn = document.getElementById('cancelClearBtn');
    const confirmClearBtn = document.getElementById('confirmClearBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const chatArea = document.getElementById('chatArea');

    let currentChat = [];
    let chatHistory = [];
    let activeChatId = null;
    let isSidebarOpen = false;

    // Replace with your actual OpenAI API key
    const apiKey = "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"; // Replace with your actual key

    // Check if mobile view
    function isMobileView() {
        return window.innerWidth <= 992;
    }

    // Toggle sidebar
    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
        if (isSidebarOpen) {
            sidebar.classList.add('show');
            chatArea.classList.add('sidebar-open');
            document.body.style.overflow = 'hidden';
        } else {
            sidebar.classList.remove('show');
            chatArea.classList.remove('sidebar-open');
            document.body.style.overflow = '';
        }
    }

    // Close sidebar when clicking outside on mobile
    function handleClickOutside(event) {
        if (isMobileView() && isSidebarOpen &&
            !sidebar.contains(event.target) &&
            event.target !== mobileMenuBtn) {
            toggleSidebar();
        }
    }

    // Initialize
    function init() {
        if (isMobileView()) {
            sidebar.classList.remove('show');
            chatArea.classList.remove('sidebar-open');
        } else {
            sidebar.classList.add('show');
            chatArea.classList.add('sidebar-open');
        }

        // Load chat history from localStorage
        if (localStorage.getItem('chatHistory')) {
            chatHistory = JSON.parse(localStorage.getItem('chatHistory'));
            renderChatHistory();
        }

        // Event listeners
        document.addEventListener('click', handleClickOutside);
        window.addEventListener('resize', function () {
            if (!isMobileView() && !isSidebarOpen) {
                isSidebarOpen = true;
                sidebar.classList.add('show');
                chatArea.classList.add('sidebar-open');
            } else if (isMobileView() && isSidebarOpen) {
                isSidebarOpen = false;
                sidebar.classList.remove('show');
                chatArea.classList.remove('sidebar-open');
            }
        });
    }

    // Send message when button is clicked
    sendBtn.addEventListener('click', sendMessage);

    // Send message when Enter key is pressed
    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // New chat button
    newChatBtn.addEventListener('click', startNewChat);

    // Clear history button
    clearHistoryBtn.addEventListener('click', showConfirmationDialog);
    cancelClearBtn.addEventListener('click', hideConfirmationDialog);
    confirmClearBtn.addEventListener('click', clearAllHistory);

    // Mobile menu button
    mobileMenuBtn.addEventListener('click', toggleSidebar);

    function showConfirmationDialog() {
        if (chatHistory.length === 0) return;
        confirmationDialog.style.display = 'flex';
    }

    function hideConfirmationDialog() {
        confirmationDialog.style.display = 'none';
    }

    function clearAllHistory() {
        chatHistory = [];
        localStorage.removeItem('chatHistory');
        renderChatHistory();
        hideConfirmationDialog();

        // If we're currently viewing a history chat, clear it
        if (activeChatId) {
            startNewChat();
        }
    }

    function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        // Hide welcome message if it's the first message
        if (welcomeMessage) welcomeMessage.style.display = 'none';

        // Add user message to chat
        addMessage(message, 'user');
        currentChat.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

        // Clear input
        userInput.value = '';
        userInput.disabled = true;
        sendBtn.disabled = true;

        // Show typing indicator
        showTypingIndicator();

        // Call OpenAI API
        callOpenAI(message);
    }

    function callOpenAI(userMessage) {
        // Prepare messages for API (include all previous messages for context)
        const apiMessages = currentChat.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: apiMessages,
                temperature: 0.7
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Remove typing indicator
                removeTypingIndicator();

                const botResponse = data.choices[0]?.message.content;
                if (botResponse) {
                    addMessage(botResponse, 'bot');
                    currentChat.push({ role: 'assistant', content: botResponse, timestamp: new Date().toISOString() });

                    // Update chat history if this is an existing chat
                    if (activeChatId) {
                        updateChatHistory();
                    } else if (currentChat.length === 2) {
                        // This is the first exchange in a new chat
                        saveNewChat();
                    }
                } else {
                    throw new Error("No response from AI");
                }
            })
            .catch(error => {
                console.error("Error calling OpenAI API:", error);
                removeTypingIndicator();
                addMessage("Sorry, I encountered an error. Please try again.", 'bot');
            })
            .finally(() => {
                userInput.disabled = false;
                sendBtn.disabled = false;
                userInput.focus();
            });
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        `;
        messages.appendChild(typingDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
        messageDiv.textContent = text;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    function startNewChat() {
        // Save current chat to history if not empty
        if (currentChat.length > 0 && !activeChatId) {
            saveNewChat();
        }

        // Clear current chat
        currentChat = [];
        activeChatId = null;
        messages.innerHTML = '<div class="text-center text-muted mt-5" id="welcomeMessage">' +
            '<h4>Welcome to AI Chatbot</h4>' +
            '<p>Start a new conversation by typing a message below</p>' +
            '</div>';
        welcomeMessage = document.getElementById('welcomeMessage');

        // Remove active class from all chat history items
        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.remove('active');
        });

        // Close sidebar on mobile after starting new chat
        if (isMobileView()) {
            toggleSidebar();
        }
    }

    function saveNewChat() {
        const chatId = Date.now();
        chatHistory.unshift({
            id: chatId,
            title: currentChat[0].content.substring(0, 20) + (currentChat[0].content.length > 20 ? '...' : ''),
            messages: [...currentChat],
            lastUpdated: new Date().toISOString()
        });
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        renderChatHistory();
    }

    function updateChatHistory() {
        const chatIndex = chatHistory.findIndex(c => c.id === activeChatId);
        if (chatIndex !== -1) {
            chatHistory[chatIndex].messages = [...currentChat];
            chatHistory[chatIndex].lastUpdated = new Date().toISOString();
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
            renderChatHistory();
        }
    }

    function renderChatHistory() {
        if (chatHistory.length === 0) {
            emptyHistory.style.display = 'block';
            return;
        }

        emptyHistory.style.display = 'none';

        // Sort chats by last updated (newest first)
        chatHistory.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

        chatHistoryList.innerHTML = '';
        chatHistory.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-history-item');
            if (chat.id === activeChatId) {
                chatItem.classList.add('active');
            }

            const chatContent = document.createElement('div');
            chatContent.style.flex = '1';

            const chatTitle = document.createElement('div');
            chatTitle.textContent = chat.title;
            chatTitle.style.fontWeight = '500';

            const chatTime = document.createElement('div');
            chatTime.classList.add('timestamp');
            chatTime.textContent = formatDate(chat.lastUpdated);

            chatContent.appendChild(chatTitle);
            chatContent.appendChild(chatTime);

            chatItem.innerHTML = '<i class="fas fa-comment-alt chat-icon"></i>';
            chatItem.appendChild(chatContent);

            chatItem.addEventListener('click', () => {
                loadChat(chat.id);
                if (isMobileView()) {
                    toggleSidebar();
                }
            });
            chatHistoryList.appendChild(chatItem);
        });
    }

    function formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function loadChat(chatId) {
        const chat = chatHistory.find(c => c.id === chatId);
        if (!chat) return;

        currentChat = [...chat.messages];
        activeChatId = chatId;
        messages.innerHTML = '';

        if (welcomeMessage) welcomeMessage.style.display = 'none';

        currentChat.forEach(msg => {
            addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot');
        });

        // Update active state in sidebar
        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = Array.from(document.querySelectorAll('.chat-history-item')).find(item => {
            return item.getAttribute('data-chat-id') == chatId;
        });
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    // Initialize the app
    init();
});