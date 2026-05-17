// State
const state = {
  conversationHistory: [], // full history sent to Gemini on every call
  questionCount: 0,        // tracks how many AI questions have been asked
  isLoading: false         // prevents duplicate sends
};

// System Prompt
const SYSTEM_PROMPT = `You are a talent discovery guide. Your job is to identify a person's natural talents through conversation.

Rules:
- Ask ONE short, thoughtful, adaptive question at a time
- Each question should build on the previous answer
- Questions should reveal how the person thinks, what energizes them, and what comes naturally to them
- Keep questions concise — one or two sentences max
- Do not number the questions
- Do not explain why you're asking
- Do not give feedback or commentary between questions, just ask the next one
- Be warm but professional in tone

When asked to generate the talent profile, respond ONLY with this exact JSON shape and nothing else:
{
  "title": "The [Adjective] [Noun]",
  "why": "2-3 sentences explaining why this is their talent based on their answers",
  "how": "2-3 sentences on how this talent shows up in their daily life and work"
}`;

// DOM References
const messagesContainer = document.getElementById('messages-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Groq API Call
async function callGemini(messages) {
  // Convert Gemini format to OpenAI format for Groq
  const groqMessages = messages.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.parts[0].text
  }));

  const response = await fetch(CONFIG.GEMINI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...groqMessages
      ],
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  if (!response.ok) throw new Error(`Groq API error: ${response.status}`);

  const data = await response.json();
  return data.choices[0].message.content;
}

// UI Helpers

// Renders a message bubble in the chat
function renderMessage(text, role) {
  const wrapper = document.createElement('div');
  wrapper.className = role === 'user'
    ? 'flex justify-end'
    : 'flex justify-start';

  const bubble = document.createElement('div');
  bubble.className = role === 'user'
    ? 'bg-emerald-500 text-black rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm leading-relaxed font-medium'
    : 'chat-message max-w-[80%] text-sm leading-relaxed';

  bubble.textContent = text;
  wrapper.appendChild(bubble);
  messagesContainer.appendChild(wrapper);
  scrollToBottom();
}

// Shows a typing indicator while waiting for Gemini
function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'typing-indicator';
  indicator.className = 'flex justify-start';
  indicator.innerHTML = `
    <div class="chat-message px-4 py-3 text-sm text-zinc-400 italic">
      Thinking...
    </div>
  `;
  messagesContainer.appendChild(indicator);
  scrollToBottom();
}

function removeTypingIndicator() {
  document.getElementById('typing-indicator')?.remove();
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Shows the "See Results" button after profile is generated
function showResultsButton() {
  const wrapper = document.createElement('div');
  wrapper.className = 'flex justify-center py-4';

  const button = document.createElement('button');
  button.textContent = 'See Results';
  button.className = 'bg-emerald-500 text-black rounded-2xl px-6 py-3 font-semibold hover:bg-emerald-600 transition cursor-pointer';
  button.onclick = () => {
    window.location.href = 'reveal.html';
  };

  wrapper.appendChild(button);
  messagesContainer.appendChild(wrapper);
  scrollToBottom();

  // Disable input
  userInput.disabled = true;
  sendBtn.disabled = true;
}

// Disables input while AI is responding
function setLoading(loading) {
  state.isLoading = loading;
  sendBtn.disabled = loading;
  userInput.disabled = loading;
  sendBtn.textContent = loading ? '...' : 'Send';
}

// Core Chat Flow

// Sends a message to Gemini and renders the response
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || state.isLoading) return;

  // Render user message
  renderMessage(text, 'user');
  userInput.value = '';

  // Append to history
  state.conversationHistory.push({ role: 'user', parts: [{ text }] });

  setLoading(true);
  showTypingIndicator();

  try {
    if (state.questionCount >= 10) {
      // All 10 questions answered — generate talent profile
      removeTypingIndicator();
      await generateProfile();
    } else {
      // Ask the next adaptive question
      const aiResponse = await callGemini(state.conversationHistory);

      removeTypingIndicator();
      renderMessage(aiResponse, 'ai');

      // Append AI response to history
      state.conversationHistory.push({ role: 'model', parts: [{ text: aiResponse }] });
      state.questionCount++;
    }
  } catch (error) {
    removeTypingIndicator();
    renderMessage('Something went wrong. Please refresh and try again.', 'ai');
    console.error(error);
  } finally {
    setLoading(false);
  }
}

// Generates the final talent profile and shows results button
async function generateProfile() {
  // Ask Groq to generate the profile based on the full conversation
  const profileRequest = [
    ...state.conversationHistory,
    {
      role: 'user',
      parts: [{ text: 'Based on all my answers, generate my talent profile now in JSON format with fields: title, why, and how.' }]
    }
  ];

  try {
    const profileResponse = await callGemini(profileRequest);

    // Extract JSON from response - handle various formats
    let clean = profileResponse;
    
    // Remove markdown code blocks
    clean = clean.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Find and extract JSON object
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const profile = JSON.parse(jsonMatch[0]);

    // Store in sessionStorage for reveal.js to read
    sessionStorage.setItem('talentProfile', JSON.stringify(profile));

    // Show results message and button (typing indicator already removed)
    renderMessage('Your talent profile is ready!', 'ai');
    showResultsButton();
  } catch (error) {
    renderMessage('Could not generate your profile. Please refresh and try again.', 'ai');
    console.error('Profile generation error:', error);
  }
}

// Asks the first question automatically when the page loads
async function initChat() {
  setLoading(true);
  showTypingIndicator();

  try {
    // Seed the conversation with an opening prompt
    const openingPrompt = [{ role: 'user', parts: [{ text: 'Start the talent discovery. Ask me your first question.' }] }];
    const firstQuestion = await callGemini(openingPrompt);

    removeTypingIndicator();
    renderMessage(firstQuestion, 'ai');

    // Add both the seed and the response to history
    state.conversationHistory.push(
      { role: 'user', parts: [{ text: 'Start the talent discovery. Ask me your first question.' }] },
      { role: 'model', parts: [{ text: firstQuestion }] }
    );

    state.questionCount = 1;
  } catch (error) {
    removeTypingIndicator();
    renderMessage('Failed to start. Please refresh the page.', 'ai');
    console.error(error);
  } finally {
    setLoading(false);
  }
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

// Allow Enter key to send
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Init
initChat();