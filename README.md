# Zenshin Web Version

## Setup

### 1. Start the backend server
```bash
cd server
npm install
npm start
```

### 2. Start the frontend (development)
```bash
cd client
npm install
npm run dev
```

Then open http://localhost:5173

### Production
```bash
cd client && npm run build
# Then just run the server - it serves the built client at http://localhost:64621
```

## Notes

- The backend server runs on port 64621 by default
- Settings are stored in `~/Documents/Zenshin/settings.json`
- Downloads go to `~/Downloads/ZenshinDownloads` by default
- AnimePahe cookies are read from `~/Documents/Zenshin/cookies.json`
- Discord RPC is not available in the web version
- VLC integration is not available in the web version (use browser player instead)
- Window controls (minimize/maximize/close) are no-ops in the web version
- AniList OAuth: click "Login with AniList" to open the auth page in a new tab
