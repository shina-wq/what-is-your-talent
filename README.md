# WhatIsYourTalent

A conversational AI web application that helps users discover their natural talents through intelligent questioning.

## Overview

WhatIsYourTalent is an interactive platform that guides users through a 10-question conversation to identify their unique strengths and talents. Using the Groq API with open-source language models, the app asks adaptive, thoughtful questions to uncover how users think, what energizes them, and what comes naturally to them.

## Features

- **AI-Powered Conversations**: Uses Groq API with advanced language models for natural, adaptive questioning
- **Talent Discovery**: Generates personalized talent profiles based on user responses
- **Modern UI**: Clean, responsive design built with Tailwind CSS
- **Progressive Flow**:
  - Landing page with project overview
  - Interactive chat interface for Q&A
  - Results page revealing discovered talents
- **Full-Stack Application**: Node.js backend with vanilla JavaScript frontend

## Tech Stack

- **Backend**: Node.js (Express-like HTTP server)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework**: Tailwind CSS
- **AI Model**: Groq API (OpenAI-compatible)
- **Styling**: Custom CSS with Tailwind utilities

## Project Structure

```
.
├── app.js           # Node.js server setup and API endpoints
├── chat.js          # Chat interface logic and AI interactions
├── chat.html        # Chat page UI
├── config.js        # Client-side configuration
├── index.html       # Landing page
├── reveal.html      # Results/talent profile page
├── reveal.js        # Results page logic
├── styles.css       # Custom styles
├── package.json     # Project metadata and scripts
└── README.md        # This file
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- A Groq API key (free at [https://console.groq.com](https://console.groq.com))

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your API key:
   ```
   GROQ_API_KEY=your_api_key_here
   ```

### Running the Application

Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## How It Works

1. **Landing Page**: User visits the app and learns about the talent discovery concept
2. **Chat Interface**: The AI system prompt guides an intelligent conversation to explore the user's natural abilities
3. **Processing**: Answers are analyzed by the AI to identify patterns and talents
4. **Results**: A personalized talent profile is generated with title, explanation, and how the talent manifests in daily life

## Future Enhancements

- Save user conversations and talent profiles
- Share results with others
- Multiple talent profiles for different life areas
- Historical analysis of talent discovery patterns
- Integration with career recommendations

## License

Personal project - All rights reserved

## Support

For issues or questions about this project, please refer to the inline code documentation or contact me.
