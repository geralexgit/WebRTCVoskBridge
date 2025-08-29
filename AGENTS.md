
---

# 📄 AGENTS.md

## 🚀 Overview

**AI HR Bot** is a system that can understand a candidate’s speech in real time, convert it into text, analyze it using a local LLM (e.g., **Gemma 3n\:latest**), compare it with job descriptions and resumes, and automatically generate relevant interview questions.
The goal is to automate initial interviews and simplify HR workflows.

---

## 🎯 Solution Concept

The objective of this case is to implement a custom **HR Avatar** with the following features, divided into stages:

1. **Resume analysis and candidate selection** based on job requirements.
2. **Structured interview conduction** with dynamically adaptive questions.
3. **Quantitative evaluation** of candidate-job match.
4. **Decision generation with transparent logic** (explainable AI).

---

## 🛠 Functional Requirements

### 🎙 Voice Interaction with Candidates

* Real-time speech recognition with **multi-language and dialect support**, including noise suppression and error correction.
* Dynamic interview flow: adjust questions based on previous answers (e.g., go deeper into technical details when a skill is confirmed).
* Capture pauses, emotional tone, and logical structure of answers for **soft skills analysis**.

### 🧠 Automatic Answer Analysis and Matching

* NLP-based matching of answers with job requirements (skills, experience, keywords).
* Highlight confirmed / unconfirmed requirements.
* Calculate a **percentage match score** with configurable weights (e.g., technical 50%, communication 30%, case-solving 20%).
* Detect contradictions (e.g., mismatched years of experience) and **red flags** (generic responses, avoidance of questions).

### 📊 Interview Report Generation

* Overall **job fit percentage** as the main score.
* Detailed breakdown per competency: strengths, gaps, recommendations (`proceed`, `reject`, `needs clarification`).
* Automated **personalized feedback** to candidates (e.g., *“Your Python skills meet requirements, but SQL knowledge needs improvement”*).

---

## 🎙 Module 1: Real-time Speech Recognition (ASR)

### Architecture

* **Frontend (React/Next.js)**

  * Captures audio via browser APIs.
  * Downsamples to 16kHz PCM16 via **AudioWorklet**.
  * Sends audio chunks via **WebRTC DataChannel**.

* **Signaling Server (Node.js)**

  * Handles WebRTC connections.
  * Forwards audio to ASR server.

* **ASR Server (Python + Vosk)**

  * Consumes PCM16 audio.
  * Produces real-time partial + final transcripts in JSON.

---

## 🧠 Module 2: HR AI Service

### Inputs

* Job description
* Candidate resume
* (Optional) ASR-transcribed responses

### Process

1. Extract requirements from job description.
2. Extract candidate skills from resume.
3. Match skills with requirements.
4. Identify **gaps**.
5. Generate **structured interview questions**: technical, case-based, soft skills.

### API (Node.js + Express)

* `POST /process-resume`
  Input: job description + resume.
  Output: JSON with matches, gaps, questions.

### LLM

* **Runtime**: Ollama
* **Model**: `gemma3n:latest`
* **Role**: skills extraction, job-fit scoring, question generation.

---

## 🔊 Module 3: Text-to-Speech (TTS)

* Converts LLM responses to speech.
* Recommended engines: **Coqui TTS, VITS, XTTS**.
* Supports multi-language voice synthesis.

---

## 🗄️ Storage & Analytics

* **Database**: PostgreSQL / MongoDB

  * Store job descriptions, resumes, transcripts, interview logs, reports.
* **Vector DB**: Qdrant / Weaviate / Milvus

  * Semantic search across resumes and jobs.

---

## 📐 Architecture Pipeline

1. Browser (React/Next.js) → microphone (candidate speaks).
2. ASR (Vosk) → transcription.
3. Backend API (Node.js) → LLM (Gemma 3n).
4. LLM → analyzes candidate/job, generates adaptive questions.
5. Candidate’s next answer → loop continues.
6. After interview → scoring, reporting, recommendations.
7. (Optional) TTS → HR bot responses as audio.

---

## 👥 Example User Journey

1. Candidate connects to HR bot (web browser).
2. HR bot greets the candidate by voice.
3. Candidate says: *“I have 3 years of experience with Python and Excel.”*

   * ASR transcribes speech.
   * LLM compares response with job requirements (e.g., SQL required, missing).
   * Bot dynamically adapts: *“Can you describe your experience with SQL databases?”*
4. Candidate answers. Bot analyzes technical depth.
5. Bot asks a **case-study question**: *“Imagine a dataset of sales for one year. How would you identify key patterns?”*
6. Candidate replies, bot detects hesitation and lack of detail → lowers score in problem-solving.
7. Interview ends. Bot generates:

   * **Job fit: 72%**
   * Strengths: Python, data visualization
   * Gaps: SQL, analytical problem-solving
   * Recommendation: *“Proceed with caution, further SQL training required”*
8. Candidate receives personalized feedback email.

---

## ✅ Tech Stack

* **ASR**: Vosk
* **Frontend**: React / Next.js
* **Backend**: Node.js (Express)
* **LLM Runtime**: Ollama + Gemma 3n\:latest
* **TTS**: Coqui / VITS
* **Storage**: PostgreSQL + VectorDB

---
