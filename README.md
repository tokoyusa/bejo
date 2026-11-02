# Replicator (React + Node.js)

Replicator turns a set of video clips into a single YouTube-ready MP4. It merges one or more source videos, lays a transparent PNG overlay on top, draws four custom text fields, and adds an audio track. The video is looped automatically so the final file has exactly the same length as the audio.

This web application has been rewritten into a modern React application backed by an Express server executing the real FFmpeg rendering pipeline.

## Features

- **Live 1280x720 Composite Preview**: Real-time canvas preview of video frames, transparent PNG overlay, and text cards with positioning guidelines before rendering.
- **Automatic Audio Looping**: Automatically calculates durations with `ffprobe`, loops video clips seamlessly (`-stream_loop`) to match audio duration, and muxes AAC audio.
- **Four Text Fields**: Heading, Name (bold), Extra text, and Date, rendered using bundled Noto Sans fonts (including Cyrillic support).
- **Multi-clip Video Concatenation**: Add, reorder, or preview multiple video clips.
- **Real-Time Render Streaming**: Server-Sent Events (SSE) live progress bar and terminal log streaming directly from FFmpeg output.
- **Built-in Player & Downloader**: In-browser preview modal and instant download for the resulting `youtube_ready.mp4`.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide icons, Canvas API
- **Backend**: Node.js, Express, Multer, Vite, Child Process / FFmpeg & FFprobe
- **Resolution**: 1280x720 @ 24fps (H.264 / AAC)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` in your browser.

## License

Released under the [MIT License](LICENSE).
