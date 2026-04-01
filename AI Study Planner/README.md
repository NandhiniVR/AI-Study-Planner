# 🧠 AI Study Planner

> A full-stack AI-powered learning platform that transforms your syllabus into a personalized, exam-focused study package — instantly.

---

## ✨ Features

### 📚 Smart Learning Generator
- Paste text, upload files, or drop a YouTube link — the AI does the rest
- Generates **comprehensive study notes**, **flashcards**, **mind maps**, **flowcharts**, and **practice questions** tailored to your target marks
- Supports **PDF**, **DOCX**, **PPT/PPTX**, and **Image (OCR)** uploads
- Extracts **YouTube video transcripts** automatically
- Download generated notes as a **formatted PDF**

### 📝 AI Notes
- Generate instant, structured study notes on any topic
- Notes are beautifully formatted with headings, bold key terms, and bullet points
- Saved to your account via Firebase — accessible anytime

### 🎯 Mock Test Generator
- Configurable MCQ, short-answer, and long-answer question sets
- Adjustable difficulty: Easy / Medium / Hard
- Auto-graded with instant feedback and scoring

### 🤖 AI Assistant Chatbot
- Ask any study-related question
- Generates flashcards, mind maps, and flowcharts on demand
- Contextual — uses your uploaded notes as reference

### ⏱️ Pomodoro Timer
- Focus session tracking with customizable durations
- Break reminders and session history

### 📅 Smart Timetable
- AI-generated study schedules based on subject count, hours per day, and exam dates
- Visual calendar-style layout

### 📊 Analytics Dashboard
- Track study sessions, marks progress, and productivity trends
- Interactive charts powered by Chart.js

### 🔑 Authentication
- Firebase Google Sign-In
- All data is private and tied to your account

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router v7, Vite 8 |
| **Backend** | Node.js, Express 5 |
| **AI Engine** | Groq API (`llama-3.1-8b-instant`) |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Authentication |
| **Visualizations** | Mermaid.js, React Flow (@xyflow/react), Chart.js |
| **File Parsing** | pdf-parse, mammoth (DOCX), officeparser (PPT), Tesseract.js (OCR) |
| **PDF Export** | html2pdf.js |
| **Styling** | Vanilla CSS with custom design system |

---

## 📁 Project Structure

```
AI Study Planner/
├── src/                        # React frontend
│   ├── pages/
│   │   ├── SmartLearningPage.jsx   # Main AI generator
│   │   ├── NotesPage.jsx           # AI Notes
│   │   ├── MockTestPage.jsx        # Mock test interface
│   │   ├── ChatbotPage.jsx         # AI chatbot
│   │   ├── PomodoroPage.jsx        # Focus timer
│   │   ├── TimetablePage.jsx       # Smart timetable
│   │   ├── AnalyticsPage.jsx       # Charts & analytics
│   │   ├── StudyPlanPage.jsx       # Study plan viewer
│   │   ├── DashboardPage.jsx       # Home dashboard
│   │   ├── SetupPage.jsx           # Onboarding
│   │   └── LoginPage.jsx           # Auth
│   ├── components/
│   │   ├── Sidebar.jsx             # Navigation sidebar
│   │   └── TTSPlayer.jsx           # Text-to-speech player
│   ├── contexts/
│   │   └── AuthContext.jsx         # Firebase auth context
│   ├── layouts/
│   │   └── DashboardLayout.jsx     # Shared layout with sidebar
│   └── firebase.js                 # Firebase configuration
│
├── server/                     # Express backend
│   ├── routes/
│   │   ├── generate.js             # Smart Learning AI generation
│   │   ├── notes.js                # AI Notes generation
│   │   ├── generate-test.js        # Mock test generation
│   │   ├── grade.js                # Auto-grading
│   │   ├── chat.js                 # Chatbot AI
│   │   └── timetable.js            # Timetable generation
│   ├── index.js                    # Express server entry
│   └── .env                        # API keys (not committed)
│
├── start.bat                   # One-click startup script
├── package.json                # Frontend dependencies
└── vite.config.js              # Vite configuration
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A [Groq API key](https://console.groq.com/) (free tier available)
- A [Firebase project](https://console.firebase.google.com/) with Firestore and Authentication enabled

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ai-study-planner.git
cd "ai-study-planner/AI Study Planner"
```

---

### 2. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
cd ..
```

---

### 3. Configure Environment Variables

Create `server/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
```

Create `src/firebase.js` (or update the existing one) with your Firebase config:

```js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
```

---

### 4. Start the App

**Option A — One-click (Windows):**

Double-click `start.bat` or run:
```bash
start.bat
```
This starts both the backend (port 5000) and frontend (port 5173) simultaneously.

**Option B — Manual:**

Terminal 1 (Backend):
```bash
cd server
node index.js
```

Terminal 2 (Frontend):
```bash
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Backend health check |
| `POST` | `/generate` | Generate full study package (notes, flashcards, mind map, etc.) |
| `POST` | `/notes` | Generate AI notes for a topic |
| `POST` | `/generate-test` | Generate mock test questions |
| `POST` | `/grade` | Auto-grade submitted answers |
| `POST` | `/chat` | AI chatbot response |
| `POST` | `/timetable` | Generate study timetable |

### `/generate` — Supported Input Types

| Input Type | How to Send |
|-----------|-------------|
| Plain text / topics | `topics` form field |
| YouTube video | `youtubeUrl` form field |
| PDF file | `files` multipart field |
| DOCX file | `files` multipart field |
| PPT / PPTX file | `files` multipart field |
| Image (OCR) | `files` multipart field |

---

## 🔑 Getting a Free Groq API Key

1. Visit [https://console.groq.com/](https://console.groq.com/)
2. Sign up / Log in
3. Go to **API Keys** → **Create API Key**
4. Copy the key and paste it into `server/.env`

> The free tier provides generous limits — more than enough for personal use.

---

## 🛠️ Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Google Sign-In provider
4. Enable **Firestore Database** → Start in production mode
5. Add the following Firestore rules for authenticated access:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

6. Copy your Firebase config from **Project Settings → Your Apps → Web App**

---

## 📦 Key Dependencies

### Frontend
| Package | Purpose |
|---------|---------|
| `react` `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `firebase` | Auth + Firestore |
| `mermaid` | Flowchart rendering |
| `@xyflow/react` | Mind map visualization |
| `chart.js` + `react-chartjs-2` | Analytics charts |
| `html2pdf.js` | PDF export |
| `tesseract.js` | Browser-side OCR |
| `pdfjs-dist` | PDF text extraction |

### Backend
| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `axios` | Groq API calls |
| `multer` | File upload handling |
| `pdf-parse` | PDF text extraction |
| `mammoth` | DOCX extraction |
| `officeparser` | PPT extraction |
| `tesseract.js` | Server-side OCR |
| `youtube-transcript` | YouTube caption extraction |
| `dotenv` | Environment variable loading |

---

## 🙌 Acknowledgements

- [Groq](https://groq.com/) — Ultra-fast LLM inference
- [Meta LLaMA](https://llama.meta.com/) — The underlying language model
- [Firebase](https://firebase.google.com/) — Auth and database
- [Mermaid.js](https://mermaid.js.org/) — Flowchart diagrams
- [React Flow](https://reactflow.dev/) — Interactive mind maps

---

## 📄 License

This project is for personal and educational use. Feel free to fork and build on it!
