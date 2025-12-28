# Rich Domain Studio - Development Guide

## Development Environment

The studio has a complete development environment with hot reload for both frontend and backend.

### Quick Start

Run both servers simultaneously:

```bash
npm run dev:studio:all
```

This will start:
- **API Server** (Backend): `http://localhost:6699`
- **Vite Dev Server** (Frontend): `http://localhost:5173`

Open `http://localhost:5173` in your browser to see the studio.

### Individual Commands

Run servers separately:

```bash
# Frontend only (Vite dev server with hot reload)
npm run dev:studio:web

# Backend only (API server with auto-restart on changes)
npm run dev:studio:server
```

### How It Works

#### Frontend (Vite Dev Server)
- Located in: `src/studio/web/`
- Port: `5173` (auto-increments if busy)
- Features:
  - ⚡ Instant hot module replacement (HMR)
  - 🎨 Tailwind CSS with JIT compilation
  - 📝 TypeScript with instant type checking
  - 🔄 Auto-reload on file changes

#### Backend (API Server)
- Entry point: `src/studio/dev-server.ts`
- Port: `6699`
- Features:
  - 🔄 Auto-restart on TypeScript changes (`tsx watch`)
  - 📊 Pretty logs with `pino-pretty`
  - 🌐 CORS enabled for Vite dev server
  - 🚀 No build step required

#### Proxy Configuration
The Vite dev server automatically proxies API requests to the backend:
- `/api/*` → `http://localhost:6699/api/*`

This is configured in `src/studio/web/vite.config.ts`.

### Making Changes

#### Frontend Changes
1. Edit any file in `src/studio/web/src/`
2. Save the file
3. Browser automatically reloads with changes

#### Backend Changes
1. Edit any file in `src/studio/server/` or `src/studio/dev-server.ts`
2. Save the file
3. Server automatically restarts
4. Frontend may need a manual refresh

### Project Structure

```
src/studio/
├── dev-server.ts          # Development API server (no static files)
├── server/
│   ├── index.ts          # Production API server
│   ├── scanner/          # Domain entity scanner
│   └── executor/         # Code execution sandbox
└── web/
    ├── src/
    │   ├── App.tsx       # Main React component
    │   ├── components/   # UI components
    │   ├── store/        # Zustand state management
    │   └── interfaces.ts # TypeScript types
    ├── vite.config.ts    # Vite configuration
    └── package.json      # Frontend dependencies
```

### Tips

1. **Fast Refresh**: React Fast Refresh preserves component state during hot reload
2. **Type Safety**: TypeScript errors appear in terminal and browser console
3. **Network Tab**: Use browser DevTools to inspect API calls
4. **Console Logs**: Backend logs appear in the terminal with colors
5. **Port Conflicts**: If ports are busy, Vite auto-increments, API fails (close other processes)

### Production Build

Build for production:

```bash
# Build everything
npm run build

# Or build studio only
npm run build:studio
```

This creates:
- Backend: `dist/studio/server/`
- Frontend: `dist/studio/web/dist/`

### Troubleshooting

**Port 6699 already in use:**
```bash
# Windows
netstat -ano | findstr :6699
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:6699 | xargs kill -9
```

**Frontend not loading:**
- Check if Vite dev server is running
- Verify the port in terminal output
- Clear browser cache (Ctrl+Shift+R)

**API not responding:**
- Check if backend server started successfully
- Verify no TypeScript errors in terminal
- Check CORS configuration in `dev-server.ts`

**Hot reload not working:**
- Restart dev servers
- Clear `node_modules` and reinstall: `npm run clean && npm install`
- Check file watchers limit (Linux): `echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf`

---

Happy coding! 🚀
