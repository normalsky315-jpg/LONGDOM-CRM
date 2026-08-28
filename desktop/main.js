/* 龍登 CRM — Windows 桌面軟體（Electron 主程序）
 *
 * 設計：
 *  - 網頁內容打包在軟體內（app/ 目錄），非連外部網站。
 *  - 以內建本機 HTTP 伺服器（127.0.0.1 隨機埠）提供內容，
 *    讓頁面有穩定的 http origin，對後端（GAS）的請求行為與正式站一致。
 *  - 啟動時清除 Service Worker / 快取儲存，避免軟體更新後顯示舊版；
 *    但保留 localStorage，讓使用者的登入 session 跨啟動保留。
 *  - 資料同步仍需網路（客戶資料在 Google Sheets / GAS），此為既有架構。
 */
const { app, BrowserWindow, Menu, shell, session } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, 'app');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

let serverPort = 0;

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
        // 阻擋目錄跳脫
        const filePath = path.normalize(path.join(APP_DIR, urlPath));
        if (!filePath.startsWith(APP_DIR)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
          res.end(data);
        });
      } catch (e) {
        res.writeHead(500);
        res.end('Server error');
      }
    });
    server.on('error', reject);
    // 綁定本機隨機埠
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      resolve(serverPort);
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 430,
    height: 900,
    minWidth: 360,
    minHeight: 600,
    title: '龍登 CRM',
    backgroundColor: '#1A1A2E',
    autoHideMenuBar: true, // 隱藏選單列，避免像瀏覽器
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 外部連結（如導航 App、Google Maps）改用系統瀏覽器開啟，不在軟體視窗內開網頁
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  win.loadURL(`http://127.0.0.1:${serverPort}/index.html`);
  return win;
}

app.whenReady().then(async () => {
  // 移除預設選單（File/Edit/View…），讓外觀像獨立軟體而非瀏覽器
  Menu.setApplicationMenu(null);

  // 清除 SW/快取（保留 localStorage 登入 session）
  try {
    await session.defaultSession.clearStorageData({
      storages: ['serviceworkers', 'cachestorage', 'shadercache'],
    });
  } catch (e) { /* 忽略 */ }

  try {
    await startLocalServer();
  } catch (e) {
    // 埠啟動失敗時仍嘗試以 file:// 開啟（退化路徑）
    console.error('local server failed:', e);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
