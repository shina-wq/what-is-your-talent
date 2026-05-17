const CONFIG = {
  GEMINI_PROXY_URL:
    window.location.port === '5500'
      ? 'http://localhost:3000/api/gemini'
      : '/api/gemini'
};