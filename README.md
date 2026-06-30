<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200&auto=format&fit=crop" />
  
  # ⏳ Chrono: The Last-Minute Life Saver
  
  **An AI-powered productivity companion that proactively assists in planning, prioritizing, and completing tasks before deadlines are missed.**
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-Access_Here-blue?style=for-the-badge&logo=googlecloud)](https://chrono-1033583129131.asia-southeast1.run.app)
  [![Hackathon](https://img.shields.io/badge/Coding_Ninjas-Vibe_2_Ship-orange?style=for-the-badge)](https://blockseblock.com/dashboard)
  
  <br />

  <div>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Framer_Motion-000000?style=for-the-badge&logo=framer&logoColor=blue" alt="Framer Motion" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
    <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
    <img src="https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Google Cloud" />
  </div>
</div>

---

## 🚀 Live Demo & Evaluator Instructions

**Live Application:** [Chrono on Google Cloud Run](https://chrono-1033583129131.asia-southeast1.run.app)  
**GitHub Repository:** [Prithwish-18/Chrono](https://github.com/Prithwish-18/Chrono)

### ⚠️ IMPORTANT: Google Calendar Testing Instructions
You are welcome to register and use your own email address to test the core dashboard (Tasks, AI Planner, Chrono-Coach, Pomodoro, and Daily Goals). 

However, because the Google Calendar API is currently in "Testing" mode under Google Cloud OAuth constraints, **you MUST use the following pre-whitelisted credentials if you wish to test the live Google Calendar Synchronization feature:**

* **Email:** `vibe2ship.test@gmail.com`
* **Password:** `Vibe2shiptest@1234`

*(If you attempt to connect the Calendar API with a non-whitelisted email, Google will return an `Error 403: access_denied` screen).*

---

## 🎯 Problem Statement

**The Last-Minute Life Saver**  
Students, professionals, and entrepreneurs frequently miss deadlines, assignments, meetings, and important commitments. Existing productivity tools often rely on passive reminders that are easy to ignore and do little to help users actually complete their tasks[cite: 5].

**The Chrono Solution:**  
Chrono moves beyond traditional static reminders[cite: 5]. It is a context-aware application that acts as a proactive productivity companion[cite: 5]. By leveraging semantic AI reasoning, Chrono transforms unorganized, anxiety-inducing task lists into structured, actionable hourly roadmaps synchronized directly to a user's real-world timeline.

---

## ✨ Key Features

* 🎙️ **Voice-Automated Task Capturing:** Native Web Speech API integration allowing users to dictate tasks, details, and complex situations hands-free[cite: 5].
* 🧠 **Intelligent Task Prioritization:** A Gemini-powered engine that analyzes task deadlines and importance to dynamically re-sequence daily agendas[cite: 5].
* 🤖 **Chrono-Coach (Conversational Mentor):** An interactive sidebar coach that parses real-time stress scenarios, drafts markdown-formatted strategies, and allows users to inject actionable planner blocks directly into their dashboard with a single tap[cite: 5].
* 📅 **One-Tap Google Calendar Sync:** Translates AI-generated daily schedules and task complexity estimates into precise 24-hour timestamp blocks, securely writing them to the user's Google Calendar[cite: 5].
* 🍅 **Procedural Pomodoro Suite:** A highly reliable focus timer featuring triangle-wave synthesized audio chimes built natively with the Web Audio API to guarantee 100% execution reliability[cite: 5].
* 🔥 **Gamified Consistency Tracking:** Real-time Firestore-backed streak tracking, level progression, and an 84-day visual consistency heatmap for habit building[cite: 5].

---

## 🏗️ Technical Architecture & Google Integration

This project was engineered for high performance, utilizing a modern decoupled stack:

### Frontend & UI
* **React 19 & TypeScript:** Strongly typed, component-driven UI architecture.
* **Tailwind CSS v4 & Framer Motion:** Fluid, responsive bento-grid layouts with seamless overlay transitions.

### Backend & Database
* **Express.js (Node.js):** Lightweight backend routing and API management.
* **Firebase Core:** Real-time `Firestore` synchronization and `Firebase Auth` security gates.

### Google Technologies Utilized[cite: 5]
* **Google Cloud Run:** Fully containerized production deployment.
* **Google Identity Services (OAuth 2.0):** Secure, token-based authentication for Google APIs.
* **Google Calendar API:** Two-way read/write capabilities for live scheduling.
* **GoogleGenAI SDK (Gemini):** Advanced AI reasoning logic.

### 🛡️ AI Fallback & Resilience Strategy
To ensure the application remains 100% functional during hackathon evaluation traffic spikes or transient network issues, Chrono implements a **Multi-Stage AI Fallback Architecture**:
1. Defaults to `gemini-3.5-flash` for high-speed reasoning.
2. Automatically routes to `gemini-3.1-flash-lite` or `gemini-flash-latest` upon encountering `503` or `429` (Rate Limit) errors.
3. Utilizes exponential backoff algorithms and localized procedural processing (falling back to strict chronological/alphabetical sorting) if external APIs become completely unavailable.

---

## 💻 Local Setup & Installation

If you wish to run Chrono locally, follow these steps:

**1. Clone the repository:**
```bash
git clone [https://github.com/Prithwish-18/Chrono.git](https://github.com/Prithwish-18/Chrono.git)
cd Chrono
```

**2. Install dependencies:**
```bash
npm install
```

**3. Configure Environment Variables:**
Create a .env file in the root directory and populate it with your own keys (refer to .env.example):
```bash

GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
VITE_FIREBASE_API_KEY="YOUR_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
VITE_FIREBASE_APP_ID="YOUR_APP_ID"
VITE_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID"
```

**4. Run the development server:**
```bash
npm run dev
```

Built with ❤️ for the Coding Ninjas x Google for Developers VIBE 2 SHIP Hackathon.

