# Vibe Editor – Automated Vertical Reel Generator

A full-stack application for creating stunning vertical reels by combining your videos with green-screen templates.

## Prerequisites

- **Node.js** 18+ 
- **pnpm** (package manager)
- **FFmpeg** installed and in system PATH

## Quick Start

### 1. Backend
```bash
cd Backend
pnpm install
pnpm run dev
```
Backend runs on `http://localhost:4000`

### 2. Frontend (new terminal)
```bash
cd Frontend
pnpm install
pnpm run dev
```
Frontend runs on `http://localhost:5173`

## Features

- 📹 Upload or record videos from webcam
- 🎬 Upload green-screen templates (with audio + text animation)
- 👁️ Live preview of video + template combination
- ⚡ FFmpeg-powered render pipeline with chromakey compositing
- 📥 Download rendered MP4 reels
- 📊 Render progress tracking
- 🗑️ Manage videos, templates, and renders

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, SQLite, FFmpeg
- **Package Manager**: pnpm

## API Endpoints

| Method | Endpoint           | Description              |
|--------|--------------------|--------------------------|
| GET    | /api/videos        | List all videos          |
| POST   | /api/videos        | Upload video             |
| DELETE | /api/videos/:id    | Delete video             |
| GET    | /api/templates     | List all templates       |
| POST   | /api/templates     | Upload template          |
| DELETE | /api/templates/:id | Delete template          |
| POST   | /api/renders       | Start render job         |
| GET    | /api/renders/:id   | Get render status        |
| GET    | /api/renders       | List all renders         |
| DELETE | /api/renders/:id   | Delete render            |
