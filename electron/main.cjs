const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const http = require('http');

let activeServerUrl = null;

async function startLocalServer() {
    if (activeServerUrl) return activeServerUrl;

    const handler = (await import('serve-handler')).default;

    return new Promise((resolve, reject) => {
        const server = http.createServer((request, response) => {
            return handler(request, response, {
                public: path.join(__dirname, '../dist'),
                rewrites: [
                    { source: '**', destination: '/index.html' }
                ]
            });
        });

        server.listen(5173, () => {
            const port = 5173;
            activeServerUrl = `http://localhost:${port}`;
            console.log('Server running at:', activeServerUrl);
            resolve(activeServerUrl);
        });

        server.on('error', (err) => {
            console.error('Server failed to start:', err);
            reject(err);
        });
    });
}

async function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 15, y: 15 },
        backgroundColor: '#0a0a0a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
        },
        autoHideMenuBar: true,
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        try {
            const url = await startLocalServer();
            mainWindow.loadURL(url);
        } catch (err) {
            console.error('Failed to load local server:', err);
        }
    }
}

// Configure autoUpdater
autoUpdater.logger = console;
autoUpdater.autoDownload = false; // Disable auto-download to allow user choice
autoUpdater.autoInstallOnAppQuit = false; // We want explicit install
autoUpdater.allowPrerelease = true; // Allow prereleases for testing/dev

// In dev mode, we want to test the real updater
if (isDev) {
    autoUpdater.forceDevUpdateConfig = true;
}

// Helper to send status to renderer
function sendStatusToWindow(text, data = null) {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-status', { text, data });
    });
}

function sendErrorToWindow(error) {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('update-error', error.message || error.toString());
    });
}

autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('checking-for-update');
});

autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('update-not-available', info);
});

autoUpdater.on('error', (err) => {
    console.error('AutoUpdater Error:', err);
    // If it's the specific "No published versions" error in dev, we might frame it better, but raw error is fine for now
    sendErrorToWindow(err);
});

autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('update-downloaded', info);
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
    try {
        await autoUpdater.checkForUpdates();
    } catch (error) {
        console.error('Error checking for updates:', error);
        sendErrorToWindow(error);
    }
});

ipcMain.handle('start-download', async () => {
    try {
        await autoUpdater.downloadUpdate();
    } catch (error) {
        console.error('Error starting download:', error);
        sendErrorToWindow(error);
    }
});

ipcMain.handle('quit-and-install', () => {
    console.log('IPC: quit-and-install received. Executing autoUpdater.quitAndInstall(false, true)');
    try {
        autoUpdater.quitAndInstall(false, true);
    } catch (err) {
        console.error('Error in quitAndInstall:', err);
        sendErrorToWindow(err);
    }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            const mainWindow = windows[0];
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();

        // Check for updates on startup
        if (!isDev) {
            // In production we can rely on the manual check or this one usually check download notify
            // But since we disabled autoDownload, checkForUpdatesAndNotify might behave differently.
            // autoUpdater.checkForUpdates(); // simple check
        }
        // Actually, let's just create window. The user can check manually or we can trigger check via IPC from frontend on mount if we want.
        // For now, let's keep it simple.

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

