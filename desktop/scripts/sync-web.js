/* 把專案根目錄的前端檔案複製進 desktop/app/，供打包用。
 * 根目錄為單一真實來源；desktop/app/ 為建置產物（.gitignore 忽略）。
 * 自動打包根目錄所有 *.html + assets/（＋ sw.js 若存在），
 * 反映 main 目前的實際內容。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '..', 'app');

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

rmrf(OUT);
fs.mkdirSync(OUT, { recursive: true });

// 根目錄所有 .html
const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.toLowerCase().endsWith('.html'));
for (const f of htmlFiles) {
  fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
  console.log('copied', f);
}

// 選擇性單檔（存在才複製）
for (const f of ['sw.js']) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(OUT, f));
    console.log('copied', f);
  }
}

// assets/ 目錄
const assetsSrc = path.join(ROOT, 'assets');
if (fs.existsSync(assetsSrc)) {
  copyDir(assetsSrc, path.join(OUT, 'assets'));
  console.log('copied dir assets');
}

console.log('sync-web done ->', OUT, `(${htmlFiles.length} html)`);
