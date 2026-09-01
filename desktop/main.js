/* 龍登 CRM — Windows 桌面軟體（Electron 主程序）
 *
 * 做法：以獨立視窗載入正式站（longdomcrm.realestatesky315.workers.dev），
 * 連線行為、LINE 登入、UI 皆與使用者平常在瀏覽器/LINE 使用時一致，且永遠最新。
 * 外觀為獨立軟體（自有圖示、視窗、精簡選單，無瀏覽器網址列）。
 *
 * 啟動先顯示本機選單頁（launcher.html）選擇案場（華雄天地 / 吉隆天曜），
 * 點選後於同一視窗載入對應正式站頁面。LINE 登入的 OAuth 導向於視窗內完成，
 * 登入 token 由網站儲存在該來源的 localStorage，跨啟動保留登入。
 */
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const SITE_HOST = 'longdomcrm.realestatesky315.workers.dev';
const HOME_FILE = path.join(__dirname, 'launcher.html');

let mainWindow;

function loadHome() {
  if (mainWindow) mainWindow.loadFile(HOME_FILE);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 430,
    height: 900,
    minWidth: 360,
    minHeight: 600,
    title: '龍登 CRM',
    backgroundColor: '#1A1A2E',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 分頁/新視窗開啟行為：
  //  - 自家網站與 LINE 登入頁 → 在應用內開啟（登入流程需要）
  //  - 其他外部連結（地圖、導航、電話）→ 交給系統瀏覽器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/\.line\.me/i.test(url) || url.indexOf(SITE_HOST) !== -1) {
      return { action: 'allow' };
    }
    if (/^https?:/i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  loadHome();
}

function buildMenu() {
  const template = [
    {
      label: '功能',
      submenu: [
        { label: '切換案場（回首頁）', click: loadHome },
        {
          label: '重新整理',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.webContents.reload(),
        },
        {
          label: '上一頁',
          accelerator: 'Alt+Left',
          click: () => {
            if (mainWindow && mainWindow.webContents.canGoBack()) mainWindow.webContents.goBack();
          },
        },
        { type: 'separator' },
        { label: '結束', role: 'quit' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// 使用標準 Chrome User-Agent（移除 Electron 標記），避免 LINE 登入等 OAuth 頁
// 因偵測到嵌入式/非標準瀏覽器而拒絕。Electron 31 對應 Chromium 126。
app.userAgentFallback =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
