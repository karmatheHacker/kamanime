# 🌌 Zenshin Web Version: Deep Dive

Welcome to the web-native implementation of **Zenshin**, a premium anime tracker and streaming platform. This version is designed to bring the desktop experience to the browser while maintaining high performance and local machine integration.

---

## � Screenshots

<div align="center">
  <img src="./screenshots/home.png" width="400" alt="Home Page" />
  <img src="./screenshots/info.png" width="400" alt="Anime Info" />
  <br />
  <img src="./screenshots/episodes.png" width="400" alt="Episode List" />
  <img src="./screenshots/player.png" width="400" alt="Video Player" />
</div>

---


## �🔗 Original Desktop Project
If you are looking for the original Electron-based desktop application, you can find it here:
👉 **[Zenshin Desktop (GitHub)](https://github.com/hitarth-gg/zenshin)**

---

## 🏗️ Architecture: How the Web Works

Zenshin Web is split into two primary components that communicate over a local network bridge. This "Hybrid-Web" approach allows the application to bypass browser limitations (like CORS and filesystem access) while providing a smooth, responsive UI.

### 1. The Frontend (Client)
- **Technology**: Built with **React 18** and **Vite**.
- **UI System**: Modern, responsive interface with a focus on aesthetics and smooth transitions.
- **Communication**: Interacts with the local Node.js server via `Axios` and `WebSockets`. 
- **State Management**: Uses **Convex** for real-time data syncing across devices and local state for immediate UI feedback.

### 2. The Backend (Server)
- **Technology**: **Node.js** with **Express**.
- **Core Engine**: Uses **WebTorrent** for high-efficiency media streaming.
- **Data Persistence**:
  - **Local Settings**: Stored in `~/Documents/Zenshin/settings.json` on your host machine.
  - **Cookies/Auth**: AnimePahe cookies are managed locally to ensure session persistence.
- **Media Streaming**: Implements **HTTP Range Requests**. When you click play, the server creates a readable stream from the torrent and pipes it directly to your browser's video engine, allowing for near-instant seeking and low-latency playback.

### 3. Data Flow & Syncing
- **Torrents**: The server manages the lifecycle of magnets. It fetches metadata, selects specific file indices, and optimizes download/upload speeds based on your settings.
- **Convex Integration**: Torrent progress and global states are synced to **Convex**, a real-time backend-as-a-service. This allows you to potentially monitor your downloads or watch progress from other instances of Zenshin.

---

## 🛠️ Detailed Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [NPM](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)

### Step 1: Initialize the Backend
The server is the heart of the operation. It must be running for the client to work.
```bash
cd server
npm install
npm start
```
*The server will start on port `64621` by default.*

### Step 2: Launch the Frontend
In a new terminal:
```bash
cd client
npm install
npm run dev
```
*Access the UI at `http://localhost:5173`.*

### Production Build
To run the full stack in an optimized production environment:
```bash
cd client && npm run build
cd ../server && npm start
```
*The server will automatically serve the built client at `http://localhost:64621`.*

---

## 📊 Desktop vs. Web: Comparison

| Feature | Desktop (Electron) | Web (Current) |
| :--- | :---: | :---: |
| **Media Player** | VLC / Internal MPV | Browser Native Player |
| **Discord RPC** | ✅ Full Support | ❌ Not Available |
| **Window Controls** | Custom (Native) | Browser Default |
| **Filesystem Access** | Direct | Via Local Node Bridge |
| **Performance** | High (Native) | High (Vite Optimized) |
| **Portability** | Requires Install | Browser Accessible |

---

## 📁 File Structure
- `/client`: React source code, components, and styling.
- `/server`: Express routes, WebTorrent logic, and scraper implementations.
- `~/Documents/Zenshin`: Your local database (Settings & Cookies).
- `~/Downloads/ZenshinDownloads`: Default directory for downloaded media.

---

## 🛠️ Troubleshooting
- **CORS Errors**: Ensure the server is running on port `64621`. The client expects the API at this specific endpoint.
- **Port Conflicts**: You can change the `backendPort` in `~/Documents/Zenshin/settings.json`.
- **Streaming Issues**: Make sure your local firewall allows connections on the backend port.

---
*Created with ❤️ for the Anime Community.*
