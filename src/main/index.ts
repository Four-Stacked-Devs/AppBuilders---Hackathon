import {
  app,
  shell,
  BrowserWindow,
  Menu,
  nativeImage,
  session,
  systemPreferences,
  Tray
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import winIcon from '../../build/icon.ico?asset'
import type { AiStatus } from '@shared/status'
import { initLlm } from './ai/llm'
import parseSchema from './ai/parse.schema.json'
import { registerIpc } from './ipc'
import { requests } from './meta'

// Dev only: run a second, separate VOX (its own data file and browser profile) for testing,
// e.g. VOX_USER_DATA=/tmp/vox-test. Must be set before the app is ready.
if (process.env.VOX_USER_DATA && !app.isPackaged) app.setPath('userData', process.env.VOX_USER_DATA)
// Dev only: VOX_HIDE_WINDOW=1 opens that test window off-screen and off the taskbar (it is
// driven over the debug port), so it can't be mistaken for the real app but still renders.
const hideWindow = !app.isPackaged && process.env.VOX_HIDE_WINDOW === '1'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    // The window and taskbar icon on every platform (dev runs show Electron's own otherwise).
    icon: process.platform === 'win32' ? winIcon : icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: !hideWindow
    },
    ...(hideWindow ? { x: -3000, y: 0, skipTaskbar: true, focusable: false } : {})
  })

  mainWindow.on('ready-to-show', () => {
    if (hideWindow) mainWindow.showInactive()
    else mainWindow.show()
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

let tray: Tray | null = null

// System tray icon with the panther art; click opens the window, the menu can quit.
function createTray(): void {
  if (hideWindow) return
  const img = nativeImage.createFromPath(icon).resize({ width: 24, height: 24 })
  tray = new Tray(img)
  tray.setToolTip('VOX')
  const show = (): void => {
    const w = BrowserWindow.getAllWindows()[0]
    if (!w) return
    if (w.isMinimized()) w.restore()
    w.show()
    w.focus()
  }
  tray.on('click', show)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open VOX', click: show },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )
}

// Broadcast to every window, so a window re-created on macOS still gets updates.
const broadcastStatus = (s: AiStatus): void => {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('ai:status-changed', s)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.vox.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Only the microphone (for local Whisper) is ever granted.
  // Count every request the window makes to the internet (shown in Settings). Nothing is
  // blocked here; the page's CSP already limits connections to the app itself.
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    requests.record(details.url)
    cb({})
  })

  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) =>
    cb(permission === 'media')
  )
  if (process.platform === 'darwin') systemPreferences.askForMediaAccess('microphone')

  if (process.platform === 'darwin') app.dock?.setIcon(nativeImage.createFromPath(icon))

  registerIpc()
  createWindow()
  createTray()

  // Load the model in the background; never block startup on it.
  void initLlm(broadcastStatus, [parseSchema])

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
