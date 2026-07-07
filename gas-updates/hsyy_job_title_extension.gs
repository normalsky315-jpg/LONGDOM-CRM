/**
 * ⚠️ 這不是可以直接貼上執行的檔案，是兩處「單行修改」的說明。
 *
 * 用途：讓使用者管理可以編輯「職稱」（例如：專案經理／專案副理），
 * 並讓任務指派下拉選單顯示職稱，方便分辨同樣是 manager 角色的
 * 不同人員。
 *
 * 一樣強烈建議：把 hsyy 現在完整的程式碼傳給 Claude，讓它比照
 * hstd 產生一份完整版檔案整份覆蓋貼上，比自己找兩行修改更不容易出錯。
 *
 * 如果要自己動手，請在你現有的主檔案裡找到以下兩處，各加一行：
 *
 * 【修改 1】function updateUserRole(payload) 裡面，找到這一行：
 *
 *     if (payload.displayName !== undefined) updates.display_name = payload.displayName;
 *
 *   在它正下方加一行：
 *
 *     if (payload.jobTitle    !== undefined) updates.job_title    = payload.jobTitle;
 *
 * 【修改 2】function getSalesByProject(projectName) 裡面，找到這一行：
 *
 *     .map(function(r) { return { name: r.display_name, lineUserId: r.line_user_id }; });
 *
 *   改成：
 *
 *     .map(function(r) { return { name: r.display_name, lineUserId: r.line_user_id, jobTitle: r.job_title || '' }; });
 *
 * 改完存檔，部署 → 管理部署 → 編輯 → 新版本 → 部署即可，
 * 不需要新增任何分頁，User_Role_Table 原本就有 job_title 欄位。
 */
