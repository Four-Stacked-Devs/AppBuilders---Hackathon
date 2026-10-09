import { app, shell, BrowserWindow, session, systemPreferences } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { AiStatus } from '@shared/status'
import { initLlm } from './ai/llm'
import { registerIpc } from './ipc'

// Dev only: run a second, separate VOX (its own data file and browser profile) for testing,
// e.g. VOX_USER_DATA=/tmp/vox-test. Must be set before the app is ready.
if (process.env.VOX_USER_DATA && !app.isPackaged) app.setPath('userData', process.env.VOX_USER_DATA)

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Broadcast to every window, so a window re-created on macOS still gets updates.
const broadcastStatus = (s: AiStatus): void => {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('ai:status-changed', s)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Only the microphone (for local Whisper) is ever granted.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) =>
    cb(permission === 'media')
  )
  if (process.platform === 'darwin') systemPreferences.askForMediaAccess('microphone')

  registerIpc()
  createWindow()

  // Load the model in the background; never block startup on it.
  void initLlm(broadcastStatus)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
