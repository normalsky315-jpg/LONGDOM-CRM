// 通用案場設定：不寫死任何特定建案品牌名稱，也不自行幫名稱翻譯英文。
// 實際佈署到特定案場時，透過環境變數帶入真正的名稱即可。
export const SITE_NAME = import.meta.env.VITE_SITE_NAME || '示範建案';
export const SITE_TAGLINE = import.meta.env.VITE_SITE_TAGLINE || 'SALES OPERATING SYSTEM';
