// State
const state = {
  conversationHistory: [],
  exchangeCount: 0,   // counts completed user-answer exchanges
  isLoading: false,
  isGeneratingProfile: false // NEW: Flag to prevent any rendering during profile generation
};

const MAX_EXCHANGES = 10;

// System Prompt
const SYSTEM_PROMPT = `You are a talent discovery guide. Your job is to identify a person's natural talents through conversation.

CRITICAL RULES:
- ONLY ask ONE short, thoughtful, adaptive question per response
- Each question should build on the previous answer
- Questions should reveal how the person thinks, what energizes them, and what comes naturally to them
- Keep questions concise — one or two sentences max
- Do not number the questions
- Do not explain why you're asking
- Do not give feedback or commentary between questions, just ask the next one
- Be warm but professional in tone
- NEVER generate a profile unless explicitly asked in a message that says "Based on all my answers, generate my talent profile now"

PROFILE GENERATION ONLY:
When you receive a message that EXPLICITLY says "Based on all my answers, generate my talent profile now in JSON format with fields: title, why, and how", then respond ONLY with this JSON shape and nothing else:
{
  "title": "The [Adjective] [Noun]",
  "why": "2-3 sentences explaining why this is their talent based on their answers",
  "how": "2-3 sentences on how this talent shows up in their daily life and work"
}

Until you receive that specific request, ONLY ask questions. Do not mention generating a profile, do not offer to generate a profile, just ask the next discovery question.`;

// DOM References
const messagesContainer = document.getElementById('messages-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Groq API Call
async function callGroq(messages) {
  const groqMessages = messages.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.parts[0].text
  }));

  const response = await fetch(CONFIG.GROQ_PROXY_URL, {
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
function renderMessage(text, role) {
  const trimmed = text.trim();
  
  // Safety check: Don't render JSON-like responses
  // Check if it starts with { and ends with } OR contains JSON object
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
      /^\s*\{[\s\S]*"title"[\s\S]*"why"[\s\S]*"how"[\s\S]*\}\s*$/.test(text)) {
    console.warn('BLOCKED: Attempted to render JSON/profile as message. Stack trace:', new Error().stack);
    console.warn('Content attempted:', text.substring(0, 150));
    return;
  }
  
  console.log(`Rendering ${role} message:`, trimmed.substring(0, 100));
  
  const wrapper = document.createElement('div');
  wrapper.className = role === 'user' ? 'flex justify-end' : 'flex justify-start';

  const bubble = document.createElement('div');
  bubble.className = role === 'user'
    ? 'bg-emerald-500 text-black rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm leading-relaxed font-medium'
    : 'chat-message max-w-[80%] text-sm leading-relaxed';

  bubble.textContent = text;
  wrapper.appendChild(bubble);
  messagesContainer.appendChild(wrapper);
  scrollToBottom();
}

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

function setLoading(loading) {
  state.isLoading = loading;
  sendBtn.disabled = loading;
  userInput.disabled = loading;
  sendBtn.textContent = loading ? '...' : 'Send';
}

function showResultsButton() {
  // Lock input permanently
  userInput.disabled = true;
  sendBtn.disabled = true;

  const wrapper = document.createElement('div');
  wrapper.className = 'flex justify-center py-4';

  const button = document.createElement('button');
  button.textContent = 'See Your Results';
  button.className = 'bg-emerald-500 text-black rounded-2xl px-6 py-3 font-semibold hover:bg-emerald-600 transition cursor-pointer';
  button.onclick = () => window.location.href = 'reveal.html';

  wrapper.appendChild(button);
  messagesContainer.appendChild(wrapper);
  scrollToBottom();
}

// Core Chat Flow
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || state.isLoading) return;

  renderMessage(text, 'user');
  userInput.value = '';

  state.conversationHistory.push({ role: 'user', parts: [{ text }] });
  state.exchangeCount++;

  console.log(`Exchange count: ${state.exchangeCount}/${MAX_EXCHANGES}`);

  setLoading(true);
  showTypingIndicator();

  try {
    if (state.exchangeCount >= MAX_EXCHANGES) {
      // Enough signal — generate the profile
      console.log('Max exchanges reached, generating profile...');
      state.isGeneratingProfile = true; // Set flag BEFORE generating
      await generateProfile();
      state.isGeneratingProfile = false; // Clear flag AFTER generating
      return; // Explicitly return to ensure nothing else runs
    }
    
    // Only get AI response if NOT at max exchanges
    const aiResponse = await callGroq(state.conversationHistory);
    removeTypingIndicator();
    renderMessage(aiResponse, 'ai');
    state.conversationHistory.push({ role: 'model', parts: [{ text: aiResponse }] });
  } catch (error) {
    removeTypingIndicator();
    renderMessage('Something went wrong. Please refresh and try again.', 'ai');
    console.error('sendMessage error:', error);
  } finally {
    setLoading(false);
    state.isGeneratingProfile = false;
  }
}

async function generateProfile() {
  const profileRequest = [
    ...state.conversationHistory,
    {
      role: 'user',
      parts: [{ text: 'Based on all my answers, generate my talent profile now in JSON format with fields: title, why, and how.' }]
    }
  ];
    console.log('Calling Groq to generate profile...');
    const profileResponse = await callGroq(profileRequest);
    console.log('Profile response received:', profileResponse.substring(0, 100) + '...');
    
    removeTypingIndicator();

    // Strip markdown fences and extract JSON
    const clean = profileResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Find JSON object - match from first { to last }
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      console.error('No JSON found. Response:', clean);
      throw new Error('No JSON found in profile response');
    }
    
    const jsonString = clean.substring(firstBrace, lastBrace + 1);
    console.log('Extracted JSON:', jsonString.substring(0, 100) + '...');
    
    const profile = JSON.parse(jsonString);

    // Validate profile has required fields
    if (!profile.title || !profile.why || !profile.how) {
      throw new Error('Profile missing required fields: ' + JSON.stringify(Object.keys(profile)));
    }

    console.log('Profile validated successfully:', profile.title);   console.error('Profile generation error:', error);
    renderMessage('Failed to generate profile. Please refresh and try again.', 'ai');
  }

// Kick off the conversation automatically on page load
async function initChat() {
  setLoading(true);
  showTypingIndicator();

  try {
    const openingPrompt = [{ role: 'user', parts: [{ text: 'Start the talent discovery. Ask me your first question.' }] }];
    const firstQuestion = await callGroq(openingPrompt);

    removeTypingIndicator();
    renderMessage(firstQuestion, 'ai');

    // Seed history with the opening exchange (doesn't count toward user exchanges)
    state.conversationHistory.push(
      { role: 'user', parts: [{ text: 'Start the talent discovery. Ask me your first question.' }] },
      { role: 'model', parts: [{ text: firstQuestion }] }
    );
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
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

initChat();