# Vibe Editor Backend Documentation

This document provides a comprehensive overview of the `REEL_CREATION` backend, detailing its core functionality, architecture, and the specific APIs it exposes.

## 1. Overview
The backend is an Express-based Node.js application (`index.ts`) running on port 4000. Its primary purpose is to handle the uploading of media files (videos, templates, and images), manage their metadata via a database interface, and orchestrate asynchronous video rendering jobs using FFmpeg. 

### Key Functionality:
- **Media Management**: Accepts and stores video and image uploads into an `uploads/` directory with generated thumbnails.
- **Template Management**: Stores After Effects/FFmpeg templates along with their media slots (start times, durations, type of media). 
- **Video Rendering**: Triggers background rendering jobs using FFmpeg (`services/ffmpeg.service.ts`) to merge user media into predefined templates, supporting both standard video overlays and slide-based templates.
- **Static Hosting**: Serves the generated renders and uploaded media back to the client via a static `uploads/` route.

---

## 2. API Reference

All API routes are prefixed with `/api`.

### 2.1 Health Check
- **`GET /api/health`**
  - **Description**: Returns the server status, timestamp, and uptime.
  - **Response**:
    ```json
    {
      "status": "ok",
      "timestamp": "2026-09-26T12:00:00.000Z",
      "uptime": 120.5
    }
    ```

### 2.2 Videos (`/api/videos`)
Handles raw video uploads.

- **`GET /api/videos`**
  - **Description**: Lists all uploaded videos.
  - **Response**: ` { "success": true, "data": [ ...Video objects ] } `

- **`GET /api/videos/:id`**
  - **Description**: Retrieves a single video by ID.
  - **Response**: `{ "success": true, "data": Video }`

- **`POST /api/videos`**
  - **Description**: Uploads a video file, calculates its duration, and generates a thumbnail.
  - **Payload**: `multipart/form-data` with field `video`.
  - **Response**:
    ```json
    {
      "success": true,
      "data": {
        "id": "uuid",
        "originalName": "vid.mp4",
        "filename": "uuid.mp4",
        "duration": 15,
        "thumbnail": "thumb.jpg",
        "createdAt": "date"
      }
    }
    ```

- **`DELETE /api/videos/:id`**
  - **Description**: Deletes a video and its thumbnail from the database and filesystem.
  - **Response**: `{ "success": true, "data": { "id": "uuid" } }`

### 2.3 Templates (`/api/templates`)
Manages templates which define where user media is inserted during a render.

- **`GET /api/templates`**
  - **Description**: Lists all templates.
  - **Response**: `{ "success": true, "data": [ ...Template objects ] }`

- **`GET /api/templates/:id`**
  - **Description**: Retrieves a single template.
  - **Response**: `{ "success": true, "data": Template }`

- **`POST /api/templates`**
  - **Description**: Uploads a template file, creating a dedicated folder, generating a thumbnail, and parsing media slots.
  - **Payload**: `multipart/form-data` with field `template`. Can include `name`, `mediaSlots` (JSON string), `isSlideTemplate`, `slideDurations`.
  - **Response**:
    ```json
    {
      "success": true,
      "data": {
        "id": "uuid",
        "name": "Template Name",
        "filename": "uuid/template.ext",
        "duration": 20,
        "thumbnail": "uuid/thumb.jpg",
        "createdAt": "date",
        "isSlideTemplate": false,
        "mediaSlots": [...]
      }
    }
    ```

- **`PUT /api/templates/:id`**
  - **Description**: Updates template metadata (name, slots, etc.).
  - **Payload (JSON)**:
    ```json
    {
      "name": "New Name",
      "mediaSlots": [...]
    }
    ```
  - **Response**: `{ "success": true, "data": UpdatedTemplate }`

- **`DELETE /api/templates/:id`**
  - **Description**: Deletes a template and removes its dedicated directory.
  - **Response**: `{ "success": true, "data": { "id": "uuid" } }`

### 2.4 Renders (`/api/renders`)
Handles asynchronous job creation to render videos using templates.

- **`GET /api/renders`**
  - **Description**: Lists all render jobs. Appends `downloadUrl` to completed jobs.
  - **Response**: `{ "success": true, "data": [ ...Render objects ] }`

- **`GET /api/renders/:id`**
  - **Description**: Retrieves status and `downloadUrl` of a specific render.
  - **Response**: `{ "success": true, "data": Render }`

- **`POST /api/renders`**
  - **Description**: Starts an asynchronous rendering job. Uses FFmpeg in the background to merge a selected `videoId` (or `slideImages`) with a `templateId`.
  - **Payload (JSON)**:
    ```json
    {
      "templateId": "uuid-of-template",
      "videoId": "uuid-of-video",
      "slideImages": ["array", "of", "image", "paths"] // Required for slide templates
    }
    ```
  - **Response**: Returns HTTP `202 Accepted` indicating the job has started.
    ```json
    {
      "success": true,
      "data": {
        "id": "render-uuid",
        "videoId": "uuid-of-video",
        "templateId": "uuid-of-template",
        "status": "pending",
        "progress": 0,
        "slideImages": [],
        "createdAt": "date"
      }
    }
    ```

- **`DELETE /api/renders/:id`**
  - **Description**: Deletes a render record and its generated output video file.
  - **Response**: `{ "success": true, "data": { "id": "uuid" } }`

### 2.5 Images (`/api/images`)
Handles static image uploads (e.g. for slide templates).

- **`POST /api/images`**
  - **Description**: Uploads a single image.
  - **Payload**: `multipart/form-data` with field `image`.
  - **Response**:
    ```json
    {
      "success": true,
      "data": {
        "filename": "uuid.jpg",
        "originalName": "image.jpg"
      }
    }
    ```
