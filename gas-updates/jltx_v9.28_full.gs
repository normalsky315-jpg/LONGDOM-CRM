// ============================================================
//  龍登 CRM — 吉隆天曜專用版 v9.28
//  v9.28 變更：CONFIG.INDUSTRIES 把「公教軍警」拆成「公教」／「軍人」／
//  「警察」三個獨立選項（主管反應軍人跟警察是不同族群，混在一起不好
//  統計）。★ 這個陣列只是 Config_Options 分頁第一次建立時的種子資料，
//  試算表已經存在的話不會自動套用這個改動——要讓現有系統立刻分開，
//  直接到 Google 試算表的 Config_Options 分頁把「公教軍警」那一列改成
//  「公教」，再新增兩列「軍人」「警察」即可，不用重新部署這份程式碼
//  v9.27 變更：把主管正式的「標記成交」流程跟銷售控制表串起來：
//    1. 標記成交 Modal 的「成交戶別」改成跟銷售控制表新增戶別同一套
//       棟別／型別／樓層三個下拉選單去對應唯一的 unit_id，不再讓使用
//       者手打（避免 A3/8F 這種每個人打法不一樣、對不起來的問題）。
//       Deal_Detail 新增 unit_id 欄位存這個對應關係，saveDealDetail
//       改成用 unit_id 去 Sales_Control 反查 unit_label 存回 unit 欄位
//    2. 標記成交 Modal 拿掉房屋底價／車位底價／溢價折價／成交價這幾
//       個銷售數字欄位——這些數字之後統一在銷售控制表填，避免同一件
//       事兩邊都要打一次、數字對不起來。saveDealDetail 原本就有把這
//       些欄位預設成 0 的邏輯，前端不送這些欄位不影響既有資料
//    3. 新增 syncSalesControlFromDeal_()：saveDealDetail 存檔成功後，
//       自動把成交戶別對應的 Sales_Control 狀態同步過去（待簽約→已
//       收訂、已簽約→已簽約），並寫入 linked_customer_id／
//       linked_customer_name。markDealDetailRefund 標記退戶時，也會
//       把對應的 Sales_Control 戶別狀態改回退戶
//    4. Sales_Control 拿掉「房屋開價」欄位（house_list_price）——這個
//       數字不重要，改用「房屋售價」即可，前端表單/卡片也一併拿掉
//    5. 修正銷售總價／銷售總坪數的算法：不管有沒有車位都直接把房屋
//       實際市價＋車位售價（房屋坪數＋車位坪數）加起來，不再限定「有
//       填車位編號才加車位」；平均單價維持原本的有車/無車分開算，只
//       是判斷「有沒有車位」的依據改成看車位售價/車位坪數是否有數字，
//       不再看車位編號欄位
//  v9.26 變更：銷售控制表改版，照主管實際使用方式重新設計：
//    1. 新增 seedSalesControlUnits()：依 2026/7/6 版銷售講義「戶別
//       規劃表」預先把全案 105 戶（住家104＋店面1）建進 Sales_Control，
//       坪數帶入講義上的「單戶銷售面積」，價格/狀態留給使用者之後填。
//       手動在 Apps Script 編輯器執行一次即可，用 unit_label 判斷避免
//       重複建立，可以放心重複執行
//    2. Sales_Control 新增 category（住家/店面）、linked_customer_id／
//       linked_customer_name 欄位，記錄這戶目前連結到哪個客戶
//    3. 新增業務端成交階段（Customer_Data 新增 sales_deal_stage／
//       sales_deal_unit_id／sales_deal_unit_label／reserved_until／
//       expected_sign_date，新增 updateCustomerDealStage API）：業務
//       自己在客戶資料上填「未成交／已下訂／已保留」，不用等主管，選
//       已下訂要指定戶別＋預計簽約時間、已保留要指定戶別＋保留至日期。
//       這是跟主管的正式成交標記（deal_status，updateCustomerDeal）
//       並行的第二套機制，選了會同步更新 Sales_Control 對應戶別的狀態
//       跟連結的客戶；同一戶不能同時連結給兩個不同客戶。如果業務端已
//       經是已下訂/已保留、但主管的正式成交標記還是未成交，代表主管
//       還沒處理，客戶卡片跟首頁銷售控制表卡片都會顯示提醒
//  v9.25 變更：
//    1. 客戶年齡改成實際輸入：登記/編輯表單的「年齡區間」選項改成直接
//       打實際歲數（例：38），不再讓業務挑「30-39歲」這種區間，資料更
//       準確。既有的來客年齡分布統計（依 age_range 分組）不用改，改成
//       後端存檔時用 ageToRange_ 自動用實際年齡換算 age_range，兩個
//       欄位都會存：age 給客戶名片/週報表接待明細表顯示實際歲數，
//       age_range 純粹餵給既有統計報表用，不會讓使用者直接填
//    2. 新增銷售控制表（全案戶別銷控）：新增 Sales_Control 分頁記錄
//       105 戶的成交/銷控狀態，狀態分待售／已保留／已收訂／已簽約／
//       退戶，已保留要填保留至日期、已收訂要填預計簽約時間。房屋/車位
//       售價坪數手動填，銷售總價／銷售總坪數／平均單價一律後端計算
//       （不含車：房屋售價÷房屋坪數；有車位：銷售總價÷(房屋坪數+
//       車位坪數)），不接受前端直接改，避免手動加總算錯。全角色都能看
//       （業務跟客戶談的時候方便直接查），只有 manager/admin 能新增/
//       編輯/刪除。新增 getSalesControlList／appendSalesControlUnit／
//       updateSalesControlUnit／deleteSalesControlUnit，doGet/doPost
//       都已接上路由，首頁新增「銷售控制表」卡片
//  v9.24 變更：修正外縣市地址（屏東縣萬丹鄉…等）被誤判成「純路名
//    門牌」、疊加上（錯誤的）高雄市行政區、導致查不到座標的問題：
//    使用者回報「更新地址後跑 geocodeMissingAddresses，還是沒有座標」，
//    log 顯示查詢字串變成「高雄市大寮區屏東縣萬丹鄉和平西路159號」
//    這種行政區互相矛盾的怪字串。根因是 buildGeocodeAddress_ 只檢查
//    詳細地址裡有沒有「市」「區」兩個字來判斷「是不是已經打了完整
//    地址」，沒有檢查「縣」「鄉」「鎮」，導致「屏東縣萬丹鄉…」這種
//    地址（沒有市、也沒有區）被誤判成「純路名門牌」，又疊加上
//    （錯誤的）「高雄市大寮區」。
//    修正：buildGeocodeAddress_ 改成只要詳細地址裡有「市」「區」
//    「縣」「鄉」「鎮」任一個字，就視為已經是完整地址，不再疊加
//    行政區欄位。
//  v9.23 變更：熱點地圖新增「已填地址待定位」橘色標示，分清楚跟
//    「真的沒填地址」的差別：
//    使用者回報「大寮區明明有 29 組客人（5 組沒填地址、24 組有填），
//    但地圖上只看到 19 個點」——根因是原本的紅色「未記錄詳細地址」
//    泡泡，其實混了兩種完全不同的狀況：真的沒填地址、跟填了地址但
//    還沒轉出座標（排隊中或轉換失敗），導致「有填地址」的人也被算
//    成「未記錄」，看起來點數對不起來。
//    1. getGeoPoints 新增回傳 pending（依行政區分組，統計「有填
//       detailed_address 但 geo_lat/geo_lng 還是空的」的筆數）
//    2. jltx.html 熱點地圖現在分三種顏色：藍色小點（已轉出座標）、
//       橘色圓圈（已填地址、還沒轉出座標）、紅色圓圈（真的沒填地址）
//  v9.22 變更：修正地址轉座標大量被限流（HTTP 429）的問題：
//    上一版加了失敗原因診斷後，使用者實測發現 16 筆失敗裡有 14 筆是
//    HTTP 429（太多請求），不是地址問題——確認 GAS 共用雲端 IP 打
//    Nominatim 免費服務，原本每筆間隔 1.1 秒（官方政策寫的「每秒最多
//    1 次查詢」）在實務上還是常常被限流。
//    1. geocodeQuery_ 收到 429 時，用漸增等待時間（3秒／6秒）原地
//       重試最多 3 次，撐過短暫限流，撐不過才真的算失敗
//    2. 所有查詢之間的間隔從 1.1 秒拉長到 2 秒，降低整體請求頻率
//    因為每筆間隔變長＋可能觸發重試，單次執行實際能處理的筆數會比
//    之前少，但每小時排程觸發器會持續補上，不用擔心處理不完
//  v9.21 變更：geocode 失敗原因加上診斷（分辨「被 Nominatim 擋掉」還是
//    「真的查無資料」）：
//    使用者回報一批失敗清單裡，有好幾筆是完整地址、真實存在的道路
//    （有門牌號碼），照理不該查不到，懷疑是 Nominatim 這個免費公用
//    服務把 GAS 共用雲端 IP 的請求限流/擋掉，不是地址本身的問題，但
//    原本的程式碼把「非 200 回應」跟「200 但查無資料」都當同一種
//    「失敗」處理，log 裡看不出差異，沒辦法確認猜測對不對。
//    1. geocodeQuery_ 改回傳 { geo, reason }，非 200 時記錄實際 HTTP
//       狀態碼＋回應內容片段，區分「HTTP 403/429 等被擋掉」跟
//       「Nominatim 查無結果」兩種不同失敗原因
//    2. geocodeAddress_ 三層退回查詢（完整地址→拿掉樓層→只留路名）
//       全部改用新的 {geo,reason} 格式傳遞，最後回傳最後一次嘗試的
//       失敗原因
//    3. geocodeMissingAddresses 的失敗清單現在每一筆後面會附上失敗
//       原因，例如「[HTTP 403（可能被 Nominatim 限流/擋掉，不是地址
//       問題）]」或「[Nominatim 查無結果]」，只有後者才需要去
//       Customer_Data 修正地址，前者換個時間重跑通常就會好
//  v9.20 變更：修正地址轉座標「查不到」的最大宗原因——行政區重複疊加：
//    實測發現業務登記時常常直接把完整地址（含市/區）打進「詳細地址」
//    欄位，原本的邏輯又把「行政區」欄位疊上去一次，變成「大寮區大寮區
//    開封街…」這種重複，甚至「大寮區高雄市三民區…」這種行政區互相
//    矛盾的怪字串，Nominatim 當然查不到（實測 15 筆裡 14 筆都是這個
//    原因）。
//    1. 新增 buildGeocodeAddress_：詳細地址裡已經有「市」字就直接用、
//       不疊加；只有「區」沒「市」才補「高雄市」；純路名門牌才用
//       「行政區」欄位組（外縣市會取「外縣市：」後面實際打的縣市名）
//    2. 新增 stripFloorSuffix_：拿掉門牌後面的樓層/室號（例如「225號
//       10樓」→「225號」），Nominatim 通常不認得樓層，留著可能查詢
//       失敗。geocodeAddress_ 現在會依序試：完整地址 → 拿掉樓層 →
//       只留路名，三層都失敗才真的算查不到
//    3. geocodeMissingAddresses 改用 buildGeocodeAddress_ 組查詢字串
//    部署後記得重新執行一次 geocodeMissingAddresses()，之前失敗的
//    那幾筆會被抓進待處理清單重新嘗試
//  v9.19 變更：熱點地圖語意調整＋只有路名也能定位：
//    1. geocodeAddress_ 新增退回查詢：完整地址查不到座標時（常見是
//       只寫路名沒門牌號碼、或門牌太新 OSM 還沒收錄），退一步只查到
//       路名為止（extractRoadName_ 截字），抓那條路的概略中心點當作
//       精確位置，比整筆掉回行政區層級更精確
//    2. jltx.html 熱點地圖語意改變：紅色泡泡原本代表「這個行政區的
//       全部來客數」（含已經精確定位的），現在改成只代表「還沒有
//       詳細地址、只知道行政區」的人數，標籤文字改成「XX區 未記錄
//       詳細地址 N筆」；全部客戶都已經精確定位的行政區不會再畫紅色
//       泡泡（沒有東西要標示）。前端改成先抓 getGeoPoints 精確點清單，
//       算出每個行政區「未定位」的人數後才畫紅色泡泡，避免同一個人
//       同時被藍點跟紅色泡泡重複計算
//  v9.18 變更：geocodeMissingAddresses 補上失敗清單，方便排查「查不到
//    座標」的原因：原本只 log 成功/失敗總數，看不出是哪幾筆、為什麼查
//    不到。改成把每一筆查不到座標的客戶姓名＋customer_id＋實際拿去
//    查詢的地址都印出來，方便對照 Customer_Data 手動修正。常見原因：
//    地址只寫到巷弄沒有門牌號碼、新建案地址 OSM 資料庫還沒收錄、地址
//    打錯字。修正後重跑一次 geocodeMissingAddresses() 即可。
//  v9.17 變更：來人熱點地圖升級成精確定位版（疊在行政區泡泡上）：
//    ★ 部署後要做的事：
//      1. 在 Apps Script 編輯器手動執行一次 geocodeMissingAddresses()，
//         把目前已經填了詳細地址、但還沒有座標的舊資料補上（新資料
//         之後靠下面第 4 點的每小時觸發器自動處理，不用再手動跑）
//      2. 重新執行一次 setupTriggers()，讓新增的每小時地址轉座標
//         觸發器生效（setupTriggers 會先刪掉同名舊觸發器再重建，
//         重複執行不會疊加出好幾個）
//    1. CUSTOMER_EXTRA_FIELDS 補上 geo_lat／geo_lng，
//       ensureCustomerExtraColumns 自動幫 Customer_Data 補欄位
//    2. 新增 geocodeAddress_：呼叫 Nominatim（OpenStreetMap 的免費
//       地址查詢服務，不用申請金鑰）把地址轉成經緯度
//    3. 新增 geocodeMissingAddresses(maxCount)：批次幫「有填詳細地址、
//       還沒有座標」的客戶資料轉座標並寫回。刻意不放進
//       appendCustomerData／updateCustomerData 即時轉換——Nominatim
//       免費用量限制「每秒最多 1 次查詢」，塞進去會拖慢建檔速度，
//       甚至可能重新踩到 v9.11 修過的「逾時重試造成重複建檔」那個坑
//    4. setupTriggers 新增每小時觸發器 geocodeMissingAddressesHourly，
//       業務登記/編輯客戶資料填了詳細地址後，最多一小時內自動補上座標
//    5. 新增 getGeoPoints：週報表用，撈出日期區間內已經有精確座標的
//       客戶清單，已接上 doGet 路由，權限同 getWeeklyReceptionList
//    6. jltx.html：
//       - 熱點地圖疊一層藍色小點，是已經轉出精確座標的個別客戶（藍點
//         的人也已經算在紅色行政區泡泡的數字裡，不是額外多算的）
//       - 紅色泡泡的標籤改成永遠顯示（不用滑鼠移過去才看得到），
//         列印或截圖出來才看得懂每個圈圈是哪個區、幾組
//       - 新增「🖨 列印地圖」按鈕，只印地圖那張卡片（其他畫面元素
//         列印時會被隱藏），地圖是真的 DOM/img 畫出來的，瀏覽器列印
//         會照畫面上看到的圖磚跟圓圈直接印出來，不用另外截圖處理
//  v9.16 變更：客戶登記/編輯新增「詳細地址」欄位（選填）：
//    1. CUSTOMER_EXTRA_FIELDS 補上 detailed_address，ensureCustomerExtraColumns
//       會自動幫 Customer_Data 補這個欄位，不用手動改表頭
//    2. appendCustomerData 寫入這個欄位；updateCustomerData 因為
//       editableFields 是 CUSTOMER_EXTRA_FIELDS.concat(...)，自動就能改
//    3. 對應前端：客戶登記表單「居住行政區」下方、編輯客戶資料的表單
//       「居住行政區」下方都新增「詳細地址」輸入框，選填
//    背景：週報表「來人熱點地圖」目前只能用行政區泡泡呈現（因為原本
//    沒有詳細地址可用），這次先把資料欄位補上，之後累積夠多詳細地址
//    後，可以另外做地址轉座標（geocoding），在地圖上疊一層精確定位的點
//  v9.15 變更：週報表「客戶接待明細」表格微調＋一鍵列印：
//    1. getWeeklyReceptionList 回傳欄位改成 visit_type／linked_customer_name／
//       linked_visit_date（原本是 revisit_plan，改掉是因為經理要看的是
//       「這筆是不是回籠、回籠自哪一筆」，不是未來的再訪計畫）
//    2. jltx.html：日期欄位拿掉年份（08-03 而不是 2026-08-03）；業務
//       欄位移到最後一欄（跟紙本表格順序一致：…棟別/回籠/介紹反應/業務）；
//       回籠欄改顯示「回籠（關聯 08/03）」，用客戶登記表單「回訪客人
//       關聯」功能存的 linked_visit_date 直接標出這筆是哪一筆的回籠
//    3. 新增「🖨 列印/匯出」按鈕：開新分頁用黑白表格版面（比較適合印
//       表機），標題「吉隆天曜 8/3~8/9號訪客資料表」，自動跳出瀏覽器
//       列印對話框，選「另存為 PDF」就能存檔
//  v9.14 變更：新增任務指派 LINE 推播：appendTask 建立任務時，如果有
//    指派給別人（assigned_to_line_user_id 有值且不是自己），就推播
//    標題／期限／說明／指派人給被指派的那個人本人，跟維修通報推播給
//    全體管理員不同，這裡是一對一推給被指派者。沒有設定 LINE_TOKEN
//    或指派給自己就不推，不會擋住任務照常建立。
//  v9.13 變更：客戶登記表單選項改成可自行編排（新增 Config_Options 表）：
//    背景：居住行政區、來源管道、年齡區間原本寫死在 jltx.html 的
//    HTML/JS 裡，職業／購屋動機寫死在這份程式碼的 CONFIG.INDUSTRIES／
//    CONFIG.PURCHASE_MOTIVES 裡，要調整任何一個都得改程式碼、重新部署。
//    1. 新增 Config_Options 分頁（ensureConfigOptionsSheet 自動建立，
//       欄位：option_type／value／sort_order／active），第一次建表時
//       會拿目前的預設值當種子資料寫進去，之後管理者要增刪/排序選項
//       直接在 Google 試算表編輯這張表就好，改完最多等 60 秒快取過期
//       （不想等的話手動執行 invalidateConfigOptionsCache 立即生效）
//    2. 新增 getConfigOptions：客戶登記表單一次抓齊五種選項（district／
//       source／age_range／industry／purchase_motive），已接上 doGet
//       路由。getIndustryList／getPurchaseMotiveList 保留原本的 action
//       名稱跟回傳格式（純陣列），內部改成讀 Config_Options，其他呼叫
//       端不用改
//    3. jltx.html：居住行政區／年齡區間／來源管道從寫死的 HTML 改成
//       跟職業/購屋動機一樣，改成用 API 回來的清單動態產生 chip；API
//       失敗時退回內建的預設值頂著，表單還是能用
//    4. 注意：來源管道的「其他」「親友介紹」、居住行政區的「外縣市」
//       這三個選項的特殊行為（跳出額外欄位）是用文字內容判斷，改了
//       這幾個選項的文字或刪除，對應欄位就不會再跳出來
//    5. 已存在的客戶資料不受影響——Customer_Data 存的是選項當時的文字，
//       不是連到選項清單的關聯，之後改選項清單不會動到歷史資料
//  v9.12 變更：週報表新增「客戶接待明細表」＋業務端「本週有望客」勾選送出：
//    背景：經理習慣用紙本表格（編號／日期／姓名／電話／區域／媒體／
//    職業／年齡／棟別／回籠／介紹反應／業務）看業務的接待狀況，原本
//    系統的週報表只有統計數字跟分布圖表，經理還是得另外翻業務的客戶
//    卡片才看得到明細；另外業務每週要手動挑 1~2 個有望客戶、手寫一份
//    給經理，這次一併處理掉：
//    1. 新增 Weekly_Hot_Picks 分頁（ensureWeeklyHotPicksSheet 自動建立，
//       不用手動加）記錄業務每週選的有望客戶
//    2. getWeeklyReceptionList（主管/admin）：把 Customer_Data 依週次
//       整理成跟紙本表格同樣的欄位，並標出哪幾筆這週被標記「有望」，
//       前端週報表頁面新增「客戶接待明細」表格（一頁看完整週，不用
//       再點進每個客戶卡片）
//    3. getMyWeekCustomersForPick／submitWeeklyHotPicks（業務）：業務
//       可以勾選這週接待過的客戶（最多 2 位）、填備註後送出，同一週
//       重複送出會取代掉原本選的，不會愈存愈多筆；前端新增「本週有望
//       客」頁面（Home 首頁新卡片，路由 #/weeklypick）
//    4. getWeeklyHotPicks（主管/admin）：跨業務彙整本週有望客清單，
//       週報表頁面新增「本週有望客」卡片，跟客戶接待明細表放同一頁
//    5. DATE_ONLY_FIELDS 補上 week_start／week_end，DATETIME_FIELDS
//       補上 submitted_at，避免 Sheets 自動把這兩個欄位轉成 Date 型別
//       導致 readSheetAsObjects 讀回來的格式跟查詢用的字串對不上
//  v9.11 變更：修正客戶登記重複建檔的 bug（appendCustomerData）：
//    根因：這支 API 要讀整張 Customer_Data 表查重複電話 + 寫 Sheets +
//    同步 Supabase（dwSyncVisitCreate_ 內有好幾支序列執行的 Supabase
//    REST 呼叫），耗時常常超過 jltx.html 的 gasFetch 10 秒逾時。逾時後
//    前端會自動重試一次，但 GAS 執行不會因為前端放棄等待就中止，於是
//    同一次送出真的被建立兩筆客戶資料（Sheets 兩列、Supabase 也可能
//    因此多一筆 visit）。
//    修法：client_request_id 當 idempotency key，配合 CacheService 做
//    「認領＋輪詢」：
//      1. 前端（jltx.html submitCustomer）每次送出產生一個
//         client_request_id，同一次送出如果因逾時自動重試，沿用同一個
//         id（gasFetch 重試用同一個 URL/payload）
//      2. 後端收到請求先檢查這個 key：已經有最終結果就直接回傳、不重
//         新建檔；還沒開始處理就存 PROCESSING 佔位再開始建檔（避免重試
//         送達時第一次執行還沒跑完，兩邊都查到空快取照樣建立兩筆）；
//         如果看到 PROCESSING，輪詢等第一次執行寫入最終結果（最多等
//         15 秒），不會自己重新建檔
//      3. 建檔失敗也要把失敗結果存進快取，釋放 PROCESSING 佔位，避免
//         真正重試時被誤判成「還在處理中」
//  v9.10 變更：Customer 360 總覽列表加上客戶背景輪廓統計：
//    新增 getMyCustomerStats（已接上 doGet 路由 case
//    'getMyCustomerStats'），跟 getMyCustomerOverview 同一份客戶名單、
//    同一套權限規則（業務限自己名下、主管/admin 看整個案場），統計：
//      - by_district：居住行政區分布（取每人最近一筆來訪的 district_at_visit）
//      - by_source：來源管道分布（取每人最近一筆來訪的 source）
//      - by_age_range：年齡區間分布（取每人最近一筆來訪的 age_range）
//      - by_unit_type：感興趣戶型分布（沿用既有 countByUnitField 模糊
//        比對規則，只看棟別＋戶型，暫不要求樓層）
//    用意是讓業務/主管打開總覽列表時，除了看到「誰要聯絡」，也能一眼
//    看出這批客戶的輪廓（哪個區域/媒體/年齡層/戶型特別集中），作為
//    後續開發方向的參考依據。抽出共用函式 dwGetVisibleProfiles_，
//    getMyCustomerOverview／getMyCustomerStats 共用同一套 ACL 篩選邏輯。
//    實際查詢邏輯都在 jltx_dualwrite_v1.gs
//  v9.9 變更：Customer 360 新增總覽列表：
//    新增 getMyCustomerOverview（已接上 doGet 路由 case
//    'getMyCustomerOverview'）：列出使用者權限範圍內的所有客戶，
//    依「最後互動距今天數」由久到近排序，最需要注意的排最前面，
//    沒有互動紀錄的視為最需要注意、排最前。業務只看自己名下、
//    主管/admin 看整個案場（跟其他 getMyCustomers 系列同一套規則）。
//    對應前端：customer360.html 打開頁面直接顯示總覽列表，不用先
//    搜尋姓名才有內容；搜尋框留空＝看總覽，輸入關鍵字才切換成搜尋
//    結果。實際查詢邏輯在 jltx_dualwrite_v1.gs 的 getMyCustomerOverview
//  v9.8 變更：客戶登記新增「回訪客人關聯」功能：
//    1. Customer_Data 新增 linked_customer_id／linked_customer_name／
//       linked_visit_date 三個欄位（透過 ensureCustomerExtraColumns
//       自動補表頭），appendCustomerData／updateCustomerData 都支援
//       讀寫
//    2. 新增 searchMyCustomers：讓業務登記回籠客人時，可以用姓名或
//       電話（都用模糊比對）搜尋自己權限範圍內的歷史客戶資料（跟
//       getMyCustomers 用同一套角色權限規則：業務限自己、主管限
//       案場、admin 不限），最多回傳 15 筆，依訪客日期新到舊排序，
//       已接上 doGet 路由
//    3. 對應前端：客戶登記表單選「回籠」時，訪客類別下方會跳出搜尋
//       欄位，選到符合的客戶後把 linked_customer_id 等資料存進這筆
//       新的回訪紀錄，客戶卡片上也會顯示「🔗 關聯：姓名（日期）」
//  v9.7 變更：銷售日報未提交 LINE 推播提醒改成「只在真的漏交時才通知」：
//    sendDailySalesReport（晚上9點觸發）原本不管當天有沒有交日報，
//    每天都會固定推播一則訊息（有交顯示統計、沒交顯示提醒），改成
//    只有「今天完全沒有人交日報」才推播，已經有交的話完全不推播，
//    避免每天固定跳訊息讓管理員養成忽略推播的習慣。★ 需要先在 Apps
//    Script 執行過一次 setupTriggers()，此觸發器才會真的被排程執行；
//    另外要在指令碼屬性設定 LINE_PUSH_TARGET（管理員的 LINE userId，
//    多人用逗號分隔）才會真的送出推播
//  v9.6 變更：getUserContext 效能優化（★ 這是目前系統「感覺很慢」
//    最主要的原因，強烈建議部署）：
//    1. getUserContext 在整份程式碼裡被呼叫超過 50 次，幾乎每一支 API
//       進來都會先呼叫一次，原本每次都重新完整讀一遍 User_Role_Table
//       整張表；光首頁一次載入前端就會平行發出 7、8 個 API 請求，
//       等於同一張表在一兩秒內被整張重複讀了 7、8 次
//    2. 改用 CacheService 快取 60 秒：同一使用者 60 秒內的後續請求
//       直接吃快取，不用再讀表；找不到使用者的結果不快取（避免新
//       使用者剛送出審核申請卻被「查無此人」的結果卡住）
//    3. 新增 invalidateUserContextCache，在 verifyAccess／
//       updateUserRole（含 approveUser／rejectUser）等會改到
//       User_Role_Table 的地方主動清快取，讓核准使用者、調整角色
//       這類操作可以馬上生效，不用等 60 秒快取過期
//  v9.5 變更：CONFIG.INDUSTRIES 新增「自營商」「餐飲業」兩個職業選項
//  v9.4 變更：LINE 官方帳號問答功能跟華雄天地 v9.31 同步更新（★ 目前
//    兩案場共用同一個 LINE 官方帳號，Webhook 網址現況指到華雄天地，
//    這份程式碼的 LINE 相關功能實際上收不到訊息，保留是為了將來
//    Webhook 改指過來時直接可用，細節見 handleWebhookEvent 上方註解）：
//    1. 只在跟官方帳號一對一私訊時回應，群組/多人聊天室訊息忽略
//    2. 新增跨案場路由 handleQaCommandRouted，指令前加「天地」/
//       「天曜」可以指定要查哪個案場的資料
//  v9.3 變更：新增「週報表」頁面，日報/週報/月報三個頁面互相加上
//    日／週／月切換 tabs，方便直接切換不同時間範圍的統計資料：
//    1. 新增 getWeeklyVisitorBreakdown：跟 getMonthlyVisitorBreakdown
//       同樣邏輯，接受 startDate/endDate（前端用 ISO 週次換算週一~
//       週日），統計居住行政區／來源管道／戶別反應分布，已接上
//       doGet 路由
//    2. ★ 前端 input[type=week] 用 ISO 週次字串（例如「2026-W31」），
//       跟 getWeeklyVisitorBreakdown 的 startDate/endDate 互轉都在
//       前端用 UTC 運算完成（純日期計算，不代表任何時間點，避免
//       使用者瀏覽器時區造成算出來的週一/週日日期跳掉一天）
//  v9.2 變更：補上前端一直有呼叫、但後端從未實作/接上路由的
//    updateDailyReport（「銷售日報」頁面的「✏️ 修改」按鈕，之前點下去
//    一定會失敗，因為後端根本沒有這支 action）：
//    1. 新增 updateDailyReport：僅限提交後3天內、manager 只能改自己
//       提交的、admin 不限，用 report_id 精準比對
//    2. 已接上 doGet/doPost 路由
//  v9.1 變更：修正 getCustomerList 的業務範圍篩選只比對
//    created_by_line_user_id 的 bug——admin 代填客戶資料時，建檔人是
//    admin，實際接待業務是 sales_line_user_id，業務自己看首頁「本月
//    接待共X組」會漏算這些代填的客戶，改成跟 getMyCustomers 一樣同時
//    比對 sales_line_user_id／created_by_line_user_id
//  v9.0 變更：
//    1. appendCustomerData 新增同電話重複建檔提醒：建檔時若同一支
//       電話已有客戶資料，不擋建檔（可能是換業務接手、客戶回訪等
//       正常情況），但會回傳既有資料（姓名/日期/業務），前端跳訊息
//       告知
//    2. 首頁「本月概況」改成「本月接待共 X 組」＋初訪／回籠／成交
//       三個統計卡（原本沒有單獨列出初訪數）
//  v8.9 變更：「戶別反應」統計（日報＋月報）改成用正規表示式直接掃
//    棟別＋戶型，不再限定新版下拉選單的固定格式，這樣舊資料手動填的
//    各種寫法（A3/13、A3.B3、A1-10/5、A5含車位，B5含車位…）也能正確
//    歸類成「A棟3型」「A棟1型」等統一分類，新舊資料統合在同一份統計
//  v8.8 變更：新增「月報表」頁面，統計整個月的接待/初訪/回籠/成交，
//    加上跟日報一樣的居住行政區／來源管道／戶別反應分布，直接連動
//    客戶資料表。新增 getMonthlyVisitorBreakdown 函式，把原本寫死在
//    getDailyVisitorBreakdown 裡的分類統計邏輯抽成 countByField／
//    countByUnitField 共用
//  v8.7 變更：日報頁「戶別反應」統計改成只看棟別＋戶型分類，樓層
//    不同不再算成不同筆（例如 A棟1型7樓、A棟1型8樓現在會合併成
//    「A棟1型」一筆計數）。已介紹產品本身（客戶資料裡實際記錄的
//    戶別清單，含樓層）不受影響，只有統計彙總的分類邏輯改變
//  v8.6 變更：修改客戶資料 Modal 新增「承辦業務員」欄位，主管/admin
//    可以直接改指派給哪位業務（業務本人仍不能改，只能看/改自己名下
//    客戶的其他欄位）。updateCustomerData 的可編輯欄位在非業務角色時
//    加入 sales_name／sales_line_user_id
//  ★ 從 v7.0 開始，客戶資料表（Customer_Data）跟客戶登記表單是
//  吉隆天曜專屬的客製化內容，跟華雄天地不再完全一樣（比對紙本
//  「訪客服務表」補齊了天地版本沒有的欄位）。之後若要用天地最新
//  版本重新同步吉隆天曜，要記得保留：
//    1. CUSTOMER_EXTRA_FIELDS / ensureCustomerExtraColumns()
//    2. appendCustomerData／updateCustomerData 裡用到這些欄位的部分
//    3. appendCustomerData 裡「只有 admin 能指派業務」的邏輯
//    4. generateWeeklyLeaveReport「不」排除 SKY 陳昭文（天地會排除，
//       吉隆天曜這裡刻意不排除）
//    5. CONFIG.INDUSTRIES / CONFIG.PURCHASE_MOTIVES 比天地多幾個選項
//    6. getDailyVisitorBreakdown／getWeeklyVisitorBreakdown／
//       getMonthlyVisitorBreakdown 的 by_unit（戶別反應）欄位與
//       countByUnitField——天地版本這幾支函式也有了（v9.28/v9.29 起
//       日報/週報/月報頁都有「來客分布」），但天地沒有結構化戶型
//       選單，只做 by_district／by_source，重新同步時要保留吉隆天曜
//       多出來的 by_unit 部分，不要整支被天地版本覆蓋掉
//  v8.5 變更：
//    1. 已介紹產品從自由輸入改成棟別／戶型／樓層下拉選單（可加入多筆），
//       B棟沒有6型，A棟樓層1~15，B棟樓層1~9
//    2. getDailyVisitorBreakdown 新增「戶別反應」統計（by_unit）：把
//       客戶的已介紹產品拆開分別計數，跟居住行政區／來源管道一起顯示
//       在日報頁面，方便對照廣告效益
//  v8.4 變更：銷售日報頁面新增「當日來客分布」，直接統計 Customer_Data
//    當天的客戶資料，顯示居住行政區／來源管道分布（不用另外手動填寫，
//    客戶資料本來就有記錄這些欄位，日報直接連動顯示即可）。新增
//    getDailyVisitorBreakdown 函式，權限規則比照既有的
//    getDailyReportSummary（業務看不到，只有主管/admin 看得到）
//  v8.3 變更：客戶資料表單簡化，只針對吉隆天曜：
//    1. 拿掉「地址」「購屋預算」「自備款」欄位（購屋預算是跟天地共用
//       的原始欄位，這裡沒有另外刪表格欄位，只是表單不再顯示/送出；
//       地址、自備款是吉隆天曜自己加的，已建立的舊資料欄位還在，不會
//       遺失）
//    2. 客戶職業新增：物流業、運輸業、上班族、農林漁牧業、技術設備類
//    3. 購屋動機新增：新婚準備
//    4. 坪數需求簡化成 3 個選項：20-30坪／30-40坪／40坪以上
//    5. 客戶癥結點新增：回去與家人討論
//  v8.2 變更：下週休假通報（generateWeeklyLeaveReport）不再排除
//    SKY 陳昭文，吉隆天曜這邊他的休假也要算進通報裡（天地維持排除，
//    只改吉隆天曜這份）
//  v8.1 變更：v8.0 的 getSalesByProject 去重改用 line_user_id，但
//    使用者回報還是有重複——代表 User_Role_Table 對同一個人有「同名
//    但不同 line_user_id」的多筆有效紀錄，改成依「姓名」去重才真的
//    擋得住
//  v8.0 變更：
//    1. 拿掉 v7.0 新增的電話（住家/公司）、交通方式、家庭結構、
//       來訪型態這 5 個欄位（已建立的舊資料如果剛好填過，欄位還在
//       試算表裡，只是表單不會再顯示/寫入了，不會遺失資料）
//    2. 來源管道選「親友介紹」時，新增「介紹人」欄位可以填姓名
//    3. 修正 getSalesByProject 業務下拉選單同一個人重複出現的 bug
//       （User_Role_Table 對同一人可能有多筆有效紀錄，現在依
//       line_user_id 去重）
//  v7.0 變更：
//    1. 新增「admin 可以代業務員填客戶資料」：appendCustomerData
//       現在只有 admin 送出 sales_line_user_id 才會生效（改指派給
//       別的業務），業務/主管送出這個欄位會被忽略，一律用自己的
//       身分，避免業務亂填別人名字
//    2. 比對紙本「訪客服務表」新增客戶資料欄位：性別、婚姻狀況、
//       地址、交通方式、電話（住家/公司，原本的電話欄位視為手機）、
//       來訪型態（個人/夫妻/家人/情侶/朋友/同事同行）、家庭結構、
//       來訪時段、坪數需求、房型需求備註、自備款、已介紹產品
//       （棟別/樓層），新增/編輯客戶都支援
//    3. 居住行政區選項改成吉隆天曜自己案場的區域（大寮/鳳山/林園/
//       小港/鳥松/大樹/前鎮/三民/苓雅/新興/仁武/楠梓/橋頭/外縣市），
//       原本沿用天地的左營/楠梓/鼓山那組不是吉隆天曜的商圈
//  以下沿用之前版本的功能（源自華雄天地）：
//  1. 客戶追蹤記錄模組（Contact_Log 分頁）：記錄每次接洽方式、備註、
//     選填下次追蹤日期，「我的客戶」「近期客戶」卡片可查看/新增；
//     電話號碼可一鍵撥打；首頁「待追蹤客戶」提醒
//  2. 排班：平日單日最多 2 人休假、六日禁休（主管排假不受此限制）
//  3. 客戶：刪除功能、電話/日期時間欄位文字保護
//  4. 每日日報：防重複提交、可刪除、主管3天內可修改
//  5. 任務／維修通報：都可刪除、都可編輯（不只改狀態）；維修通報
//     支援現場拍照上傳，優先度欄位已修正會正確存檔
//  6. 成交明細模組（Deal_Detail 分頁）：可編輯成交/延期簽約日期，
//     退戶會連動 Customer_Data 狀態 + 稽核紀錄
//  7. LINE 官方帳號「簡單問答」：查詢客戶、今日/本月業績、待簽約、
//     今日/下週休假、我的待辦
//  8. getSalesByProject、getTodayLeave 要求登入驗證；刪除功能共用
//     deleteRowById() helper
//  9. submitPublicLead：官網 EDM 表單（jltx-edm.html）專用的公開、
//     免登入陌客留資端點，這是天地沒有的吉隆天曜專屬功能，之後任何
//     一次同步都要記得保留（已含電話格式驗證/長度上限）
// ============================================================
//  ★ 這是既有帳號（吉隆天曜已經上線運作中），不是第一次部署：
//  1. 整份覆蓋貼上這個檔案到吉隆天曜的 Apps Script 專案
//     （CONFIG.SPREADSHEET_ID 已經是吉隆天曜自己的試算表 ID，不用改）
//  2. 部署 → 管理部署 → 編輯（鉛筆）→ 版本選「新版本」→ 部署
//     ★ 用「編輯現有部署」，不要「新增部署」，這樣網址不會變，
//       jltx.html / jltx-edm.html 的 GAS_URL 不用再改
// ============================================================

// ==================== CONFIG ====================
// ==================== CONFIG ====================
const CONFIG = {
  TIMEZONE: 'Asia/Taipei',

  PROP_KEYS: {
    COMPANY_PASSWORD:    'COMPANY_PASSWORD',
    LINE_TOKEN:          'LINE_CHANNEL_ACCESS_TOKEN',
    LINE_PUSH_TARGET:    'LINE_PUSH_TARGET',
    LINE_CHANNEL_SECRET: 'LINE_CHANNEL_SECRET'
  },

  SHEETS: {
    USER_ROLE:      'User_Role_Table',
    PROJECT:        'Project_List',
    CUSTOMER:       'Customer_Data',
    TASK:           'Task_List',
    DAILY_REPORT:   'Daily_Report',
    MAINTENANCE:    'Maintenance_Report',
    AUDIT_LOG:      'Audit_Log',
    CHANGE_LOG:     'Customer_Change_Log',
    LEAVE_SCHEDULE: 'Leave_Schedule',
    CALENDAR_NOTES: 'Calendar_Notes',
    DEAL_DETAIL:    'Deal_Detail',
    CONTACT_LOG:    'Contact_Log',
    WEEKLY_HOT_PICKS: 'Weekly_Hot_Picks',
    CONFIG_OPTIONS: 'Config_Options',
    SALES_CONTROL:  'Sales_Control'
  },

  ROLES:  { SALES: 'sales', MANAGER: 'manager', ADMIN: 'admin' },
  STATUS: { ACTIVE: 'active', INACTIVE: 'inactive', PENDING: 'pending',
            PROCESSING: 'processing', DONE: 'done' },

  // ★ 吉隆天曜專屬：職業選項比天地多了物流業/運輸業/上班族/農林漁牧業/
  // 技術設備類，重新同步時記得保留
  INDUSTRIES: ['公教','軍人','警察','醫療生技','科技資訊','金融保險','服務業',
               '製造業','自由業','營建業','房仲業','物流業','運輸業',
               '上班族','農林漁牧業','技術設備類','自營商','餐飲業',
               '退休','家管','其他'],

  // ★ 吉隆天曜專屬：購屋動機比天地多了「新婚準備」，重新同步時記得保留
  PURCHASE_MOTIVES: ['首購','投資置產','換屋升級','自住改善','子女購置','新婚準備','退休養老','其他'],

  INITIAL_PROJECTS: [
    { name: '吉隆天曜', code: 'JLTX' }
  ],

  PROJECT_NAME:   '吉隆天曜',
  SPREADSHEET_ID: '1id0qeNApu_NNOoQ1H3sA0jws7NGuWo-UMwsFEhI73Gg'
};

// ==================== Helpers ====================
// 純日期欄位（yyyy-MM-dd）／時間戳欄位（yyyy-MM-dd HH:mm:ss）／強制文字欄位
// 統一在這裡維護，讀取與寫入共用，避免各處各自維護一份漏掉欄位
var DATE_ONLY_FIELDS  = ['visit_date','leave_date','report_date','due_date','note_date',
                          'expected_sign_date','signed_date','refund_date',
                          'contact_date','next_followup_date','week_start','week_end',
                          'reserved_until'];
var DATETIME_FIELDS   = ['created_at','updated_at','last_login_at','completed_at','changed_at','timestamp','submitted_at'];
var TEXT_FORCE_FIELDS = ['phone'];

function getCrmSS()     { return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); }
function getSheet(name) { return getCrmSS().getSheetByName(name); }
function nowTW()   { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'); }
function todayTW() { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd'); }
function ok(data)  { return { ok: true,  data: (data == null ? null : data) }; }
function fail(msg) { return { ok: false, error: String(msg) }; }
function genId(prefix) {
  return prefix + '_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
}
function getProp(key)       { return PropertiesService.getScriptProperties().getProperty(key); }
function setProp(key, val)  { PropertiesService.getScriptProperties().setProperty(key, val); }

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function readSheetAsObjects(sheetName) {
  var sh = getSheet(sheetName);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var v = row[i];
      // 保險：不管是哪個欄位，只要 Sheets 把它存成了 Date 型別（沒被文字保護擋下來，
      // 或是舊資料在保護機制上線前就已經被自動轉掉），一律換算回台北時間文字再輸出。
      // 這裡如果直接把 Date 物件丟給 JSON.stringify，會被轉成 UTC 字串，
      // 造成前端看到的時間跟實際輸入時間差 8 小時（凌晨輸入的資料甚至會整個跳成前一天）。
      if (v instanceof Date) {
        var fmt = DATE_ONLY_FIELDS.indexOf(h) >= 0 ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss';
        v = Utilities.formatDate(v, CONFIG.TIMEZONE, fmt);
      }
      obj[h] = v;
    });
    return obj;
  });
}

function appendObjectToSheet(sheetName, obj) {
  var sh = getSheet(sheetName);
  if (!sh) throw new Error('Sheet not found: ' + sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var row = headers.map(function(h) { return obj[h] != null ? obj[h] : ''; });
  var lastRow = sh.getLastRow() + 1;
  sh.appendRow(row);
  // 修正日期／時間戳／電話號碼格式，防止 Sheets 自動轉換造成時區位移或開頭 0 遺失
  headers.forEach(function(h, i) {
    var isDateField = DATE_ONLY_FIELDS.indexOf(h) >= 0 && obj[h] && /^\d{4}-\d{2}-\d{2}$/.test(String(obj[h]));
    var isDatetimeField = DATETIME_FIELDS.indexOf(h) >= 0 && obj[h] && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(obj[h]));
    var isTextField = TEXT_FORCE_FIELDS.indexOf(h) >= 0 && obj[h] != null && obj[h] !== '';
    if (isDateField || isDatetimeField || isTextField) {
      var cell = sh.getRange(lastRow, i + 1);
      cell.setNumberFormat('@STRING@');
      cell.setValue(String(obj[h]));
    }
  });
}

function updateRowById(sheetName, idField, idValue, updates) {
  var sh = getSheet(sheetName);
  if (!sh) return false;
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf(idField);
  if (idCol < 0) return false;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idValue)) {
      Object.keys(updates).forEach(function(k) {
        var c = headers.indexOf(k);
        if (c < 0) return;
        var val = updates[k];
        var isDateField = DATE_ONLY_FIELDS.indexOf(k) >= 0 && val && /^\d{4}-\d{2}-\d{2}$/.test(String(val));
        var isDatetimeField = DATETIME_FIELDS.indexOf(k) >= 0 && val && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(val));
        var isTextField = TEXT_FORCE_FIELDS.indexOf(k) >= 0 && val != null && val !== '';
        if (isDateField || isDatetimeField || isTextField) {
          // 用 setNumberFormat('@') 強制文字格式再寫入，防止日期／時間位移
          var cell = sh.getRange(i + 1, c + 1);
          cell.setNumberFormat('@STRING@');
          cell.setValue(String(val));
        } else {
          sh.getRange(i + 1, c + 1).setValue(val);
        }
      });
      return true;
    }
  }
  return false;
}

// 找到 idField=idValue 的那一列，選擇性跑 opts.checkFn 做權限/業務規則檢查
// （回傳非 null 字串代表擋下、不刪除），檢查通過才真的刪除該列。
// 回傳 { notFound: true } / { error: '...' } / { row: {欄位:值...} }
function deleteRowById(sheetName, idField, idValue, opts) {
  var sh = getSheet(sheetName);
  if (!sh) return { error: '找不到分頁 ' + sheetName };
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf(idField);
  if (idCol < 0) return { error: '欄位設定錯誤：' + idField };
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) !== String(idValue)) continue;
    var rowObj = {};
    headers.forEach(function(h, c) { rowObj[h] = data[i][c]; });
    if (opts && opts.checkFn) {
      var err = opts.checkFn(rowObj);
      if (err) return { error: err };
    }
    sh.deleteRow(i + 1);
    return { row: rowObj };
  }
  return { notFound: true };
}

// ==================== User Context ====================
// ★ 效能優化：getUserContext 在整份程式碼裡被呼叫了超過 50 次，幾乎
// 每一支 API 進來都會先呼叫一次，原本每次都重新完整讀一遍
// User_Role_Table 整張表——光是首頁一次載入就會平行發出 7、8 個
// API 請求，等於同一張表在一兩秒內被整張重複讀了 7、8 次，這是
// 目前系統「感覺很慢」最大的單一原因。
// 改用 CacheService 快取 60 秒：同一個使用者在 60 秒內的後續請求
// 直接吃快取，不用再讀表；60 秒後自動過期重新讀一次。另外在所有
// 會改到 User_Role_Table 的地方（登入、審核、修改角色）主動清快取，
// 讓「核准使用者」「調整角色」這種操作可以馬上生效，不用等 60 秒。
// 找不到使用者（best 為 null）的結果不快取，避免使用者剛送出審核
// 申請、資料才剛寫入表格，卻因為前一次查詢的「查無此人」被快取住。
function getUserContext(lineUserId) {
  if (!lineUserId) return null;
  var cache = CacheService.getScriptCache();
  var cacheKey = 'userctx_' + lineUserId;
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var rows = readSheetAsObjects(CONFIG.SHEETS.USER_ROLE);
  var ROLE_PRIORITY = { admin: 3, manager: 2, sales: 1 };
  var best = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].line_user_id) !== String(lineUserId)) continue;
    if (!best) { best = rows[i]; continue; }
    // 優先取 active 狀態
    if (rows[i].status === 'active' && best.status !== 'active') { best = rows[i]; continue; }
    if (best.status === 'active' && rows[i].status !== 'active') continue;
    // 同樣狀態取最高權限
    var rp = ROLE_PRIORITY[rows[i].role] || 0;
    var bp = ROLE_PRIORITY[best.role]    || 0;
    if (rp > bp) best = rows[i];
  }
  if (!best) return null;
  var result = {
    lineUserId:  best.line_user_id,
    displayName: best.display_name,
    role:        best.role,
    projectName: best.project_name,
    jobTitle:    best.job_title,
    status:      best.status
  };
  cache.put(cacheKey, JSON.stringify(result), 60);
  return result;
}

function invalidateUserContextCache(lineUserId) {
  if (!lineUserId) return;
  try { CacheService.getScriptCache().remove('userctx_' + lineUserId); } catch (e) {}
}

// ==================== HTTP Router ====================
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (!action) return jsonResponse({ ok: false, error: 'action 必填' });

  var payload = {};
  try {
    if (e.parameter.payload) payload = JSON.parse(e.parameter.payload);
  } catch(pe) { Logger.log('payload parse error: ' + pe); }

  try {
    switch (action) {
      case 'getProjectList':
        return jsonResponse(getProjectList());
      case 'getSalesByProject':
        return jsonResponse(getSalesByProject(payload.project || e.parameter.project, payload.lineUserId || e.parameter.lineUserId));
      case 'getIndustryList':
        return jsonResponse(getIndustryList());
      case 'getPurchaseMotiveList':
        return jsonResponse(getPurchaseMotiveList());
      case 'getConfigOptions':
        return jsonResponse(getConfigOptions());
      case 'getTasks':
        return jsonResponse(getTasks(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, status: e.parameter.status
        }));
      case 'getCustomerList':
        return jsonResponse(getCustomerList(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'getMyCustomers':
        return jsonResponse(getMyCustomers(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'searchMyCustomers':
        return jsonResponse(searchMyCustomers(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, keyword: e.parameter.keyword }));
      case 'getMyCustomerOverview':
        return jsonResponse(getMyCustomerOverview(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'getMyCustomerStats':
        return jsonResponse(getMyCustomerStats(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'searchCustomer360':
        return jsonResponse(searchCustomer360(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, query: e.parameter.query }));
      case 'getCustomer360Detail':
        return jsonResponse(getCustomer360Detail(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, person_id: e.parameter.person_id }));
      case 'getRecentCustomers':
        return jsonResponse(getRecentCustomers(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'getCustomerChangeLogs':
        return jsonResponse(getCustomerChangeLogs(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, customer_id: e.parameter.customer_id }));
      case 'updateCustomerData':
        return jsonResponse(updateCustomerData(payload));
      case 'deleteCustomerData':
        return jsonResponse(deleteCustomerData(payload));
      case 'getDailyReportSummary':
        return jsonResponse(getDailyReportSummary(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, date: e.parameter.date
        }));
      case 'getDailyVisitorBreakdown':
        return jsonResponse(getDailyVisitorBreakdown(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, date: e.parameter.date
        }));
      case 'getWeeklyVisitorBreakdown':
        return jsonResponse(getWeeklyVisitorBreakdown(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, startDate: e.parameter.startDate, endDate: e.parameter.endDate
        }));
      case 'getWeeklyReceptionList':
        return jsonResponse(getWeeklyReceptionList(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, startDate: e.parameter.startDate, endDate: e.parameter.endDate
        }));
      case 'getMyWeekCustomersForPick':
        return jsonResponse(getMyWeekCustomersForPick(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, startDate: e.parameter.startDate, endDate: e.parameter.endDate
        }));
      case 'submitWeeklyHotPicks':
        return jsonResponse(submitWeeklyHotPicks(payload));
      case 'getWeeklyHotPicks':
        return jsonResponse(getWeeklyHotPicks(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, startDate: e.parameter.startDate, endDate: e.parameter.endDate
        }));
      case 'getGeoPoints':
        return jsonResponse(getGeoPoints(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, startDate: e.parameter.startDate, endDate: e.parameter.endDate
        }));
      case 'getSalesControlList':
        return jsonResponse(getSalesControlList(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'getMonthlyVisitorBreakdown':
        return jsonResponse(getMonthlyVisitorBreakdown(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, month: e.parameter.month
        }));
      case 'getDailyReportRange':
        return jsonResponse(getDailyReportRange(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, months: e.parameter.months
        }));
      case 'getMaintenanceList':
        return jsonResponse(getMaintenanceList(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'getUserList':
        return jsonResponse(getUserList(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'checkAutoLogin':
        return jsonResponse(checkAutoLogin(payload.lineUserId || e.parameter.lineUserId));
      case 'verifyAccess':
        return jsonResponse(verifyAccess(payload));
      case 'appendCustomerData':
        return jsonResponse(appendCustomerData(payload));
      case 'submitPublicLead':
        return jsonResponse(submitPublicLead(payload));
      case 'updateCustomerDeal':
        return jsonResponse(updateCustomerDeal(payload));
      case 'saveDealDetail':
        return jsonResponse(saveDealDetail(payload));
      case 'getDealDetailByCustomer':
        return jsonResponse(getDealDetailByCustomer(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, customer_id: e.parameter.customer_id }));
      case 'markDealDetailRefund':
        return jsonResponse(markDealDetailRefund(payload));
      case 'getPendingSignatures':
        return jsonResponse(getPendingSignatures(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'getDealDetailsForDate':
        return jsonResponse(getDealDetailsForDate(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, date: e.parameter.date }));
      case 'appendContactLog':
        return jsonResponse(appendContactLog(payload));
      case 'getContactLogsByCustomer':
        return jsonResponse(getContactLogsByCustomer(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, customer_id: e.parameter.customer_id }));
      case 'deleteContactLog':
        return jsonResponse(deleteContactLog(payload));
      case 'getPendingFollowups':
        return jsonResponse(getPendingFollowups(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'appendTask':
        return jsonResponse(appendTask(payload));
      case 'updateTaskStatus':
        return jsonResponse(updateTaskStatus(payload));
      case 'updateTask':
        return jsonResponse(updateTask(payload));
      case 'deleteTask':
        return jsonResponse(deleteTask(payload));
      case 'appendDailyReport':
        return jsonResponse(appendDailyReport(payload));
      case 'deleteDailyReport':
        return jsonResponse(deleteDailyReport(payload));
      case 'updateDailyReport':
        return jsonResponse(updateDailyReport(payload));
      case 'appendMaintenance':
        return jsonResponse(appendMaintenance(payload));
      case 'updateMaintenanceStatus':
        return jsonResponse(updateMaintenanceStatus(payload));
      case 'updateMaintenance':
        return jsonResponse(updateMaintenance(payload));
      case 'deleteMaintenance':
        return jsonResponse(deleteMaintenance(payload));
      case 'updateUserRole':
        return jsonResponse(updateUserRole(payload));
      case 'approveUser':
        return jsonResponse(approveUser(payload));
      case 'rejectUser':
        return jsonResponse(rejectUser(payload));
      case 'getLeaveSchedule':
        return jsonResponse(getLeaveSchedule(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId,
          startDate:  e.parameter.startDate,
          endDate:    e.parameter.endDate
        }));
      case 'getTodayLeave':
        return jsonResponse(getTodayLeave(payload.lineUserId || e.parameter.lineUserId));
      case 'appendLeave':
        return jsonResponse(appendLeave(payload));
      case 'deleteLeave':
        return jsonResponse(deleteLeave(payload));
      case 'getCalendarNotes':
        return jsonResponse(getCalendarNotes(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId,
          startDate:  e.parameter.startDate,
          endDate:    e.parameter.endDate
        }));
      case 'addCalendarNote':
        return jsonResponse(addCalendarNote(payload));
      case 'deleteCalendarNote':
        return jsonResponse(deleteCalendarNote(payload));
      case 'generateWeeklyLeaveReport':
        return jsonResponse(generateWeeklyLeaveReport(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      default:
        return jsonResponse({ ok: false, error: '未知 action: ' + action });
    }
  } catch (err) {
    Logger.log('doGet error: ' + err);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    // LINE Webhook Verify 會發空 body，直接回 OK
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    var body = JSON.parse(e.postData.contents);

    if (body.events && Array.isArray(body.events)) {
      body.events.forEach(handleWebhookEvent);
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    var action  = body.action;
    var payload = body.payload || {};

    if (!action) return jsonResponse({ ok: false, error: 'action 必填' });

    switch (action) {
      case 'verifyAccess':            return jsonResponse(verifyAccess(payload));
      case 'appendCustomerData':      return jsonResponse(appendCustomerData(payload));
      case 'submitPublicLead':        return jsonResponse(submitPublicLead(payload));
      case 'submitWeeklyHotPicks':    return jsonResponse(submitWeeklyHotPicks(payload));
      case 'appendSalesControlUnit':  return jsonResponse(appendSalesControlUnit(payload));
      case 'updateSalesControlUnit':  return jsonResponse(updateSalesControlUnit(payload));
      case 'deleteSalesControlUnit':  return jsonResponse(deleteSalesControlUnit(payload));
      case 'updateCustomerData':      return jsonResponse(updateCustomerData(payload));
      case 'updateCustomerDealStage': return jsonResponse(updateCustomerDealStage(payload));
      case 'deleteCustomerData':      return jsonResponse(deleteCustomerData(payload));
      case 'updateCustomerDeal':      return jsonResponse(updateCustomerDeal(payload));
      case 'saveDealDetail':          return jsonResponse(saveDealDetail(payload));
      case 'getDealDetailByCustomer': return jsonResponse(getDealDetailByCustomer(payload));
      case 'markDealDetailRefund':    return jsonResponse(markDealDetailRefund(payload));
      case 'getPendingSignatures':    return jsonResponse(getPendingSignatures(payload));
      case 'getDealDetailsForDate':   return jsonResponse(getDealDetailsForDate(payload));
      case 'appendContactLog':        return jsonResponse(appendContactLog(payload));
      case 'getContactLogsByCustomer': return jsonResponse(getContactLogsByCustomer(payload));
      case 'deleteContactLog':        return jsonResponse(deleteContactLog(payload));
      case 'getPendingFollowups':     return jsonResponse(getPendingFollowups(payload));
      case 'appendTask':              return jsonResponse(appendTask(payload));
      case 'updateTaskStatus':        return jsonResponse(updateTaskStatus(payload));
      case 'updateTask':              return jsonResponse(updateTask(payload));
      case 'deleteTask':              return jsonResponse(deleteTask(payload));
      case 'appendDailyReport':       return jsonResponse(appendDailyReport(payload));
      case 'deleteDailyReport':       return jsonResponse(deleteDailyReport(payload));
      case 'updateDailyReport':       return jsonResponse(updateDailyReport(payload));
      case 'appendMaintenance':       return jsonResponse(appendMaintenance(payload));
      case 'uploadMaintenancePhoto':  return jsonResponse(uploadMaintenancePhoto(payload));
      case 'updateMaintenanceStatus': return jsonResponse(updateMaintenanceStatus(payload));
      case 'updateMaintenance':       return jsonResponse(updateMaintenance(payload));
      case 'deleteMaintenance':       return jsonResponse(deleteMaintenance(payload));
      case 'getUserList':             return jsonResponse(getUserList(payload));
      case 'updateUserRole':          return jsonResponse(updateUserRole(payload));
      case 'approveUser':             return jsonResponse(approveUser(payload));
      case 'rejectUser':              return jsonResponse(rejectUser(payload));
      case 'appendLeave':             return jsonResponse(appendLeave(payload));
      case 'deleteLeave':             return jsonResponse(deleteLeave(payload));
      default:
        return jsonResponse({ ok: false, error: '未知 action: ' + action });
    }
  } catch (err) {
    Logger.log('doPost error: ' + err);
    // 錯誤時也回 OK，避免 LINE Verify 失敗
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  }
}

// ==================== Auth API ====================
function verifyAccess(payload) {
  try {
    var lineUserId      = String(payload.lineUserId  || '').trim();
    var displayName     = String(payload.displayName || '').trim();
    var password        = String(payload.password    || '');
    var selectedProject = String(payload.selectedProject || '').trim();

    if (!password) return fail('請輸入密碼');

    var expected = getProp(CONFIG.PROP_KEYS.COMPANY_PASSWORD);
    if (!expected) return fail('系統尚未設定密碼，請管理員執行 firstTimeSetup()');
    if (password !== expected) {
      if (lineUserId) writeAuditLog(lineUserId, 'LOGIN_FAIL', CONFIG.SHEETS.USER_ROLE, lineUserId, 'wrong password');
      return fail('密碼錯誤');
    }

    if (!lineUserId) {
      return fail('無法取得 LINE 使用者身份，請確認從 LINE 開啟本頁面');
    }

    var ctx = getUserContext(lineUserId);

    if (!ctx) {
      appendObjectToSheet(CONFIG.SHEETS.USER_ROLE, {
        line_user_id: lineUserId,
        display_name: displayName || lineUserId,
        role: CONFIG.ROLES.SALES,
        status: CONFIG.STATUS.PENDING,
        project_name: selectedProject || '',
        job_title: '',
        last_login_at: '',
        created_at: nowTW(),
        updated_at: nowTW()
      });
      writeAuditLog(lineUserId, 'LOGIN', CONFIG.SHEETS.USER_ROLE, lineUserId, '新使用者待審核: ' + displayName);
      return ok({ status: 'pending' });
    }

    if (ctx.status === CONFIG.STATUS.INACTIVE) {
      return fail('您的帳號已停用，請聯絡管理員');
    }

    if (ctx.status === CONFIG.STATUS.PENDING) {
      if (selectedProject && !ctx.projectName) {
        updateRowById(CONFIG.SHEETS.USER_ROLE, 'line_user_id', lineUserId, {
          project_name: selectedProject, updated_at: nowTW()
        });
        invalidateUserContextCache(lineUserId);
      }
      return ok({ status: 'pending' });
    }

    updateRowById(CONFIG.SHEETS.USER_ROLE, 'line_user_id', lineUserId, {
      last_login_at: nowTW(),
      display_name: displayName || ctx.displayName,
      updated_at: nowTW()
    });
    invalidateUserContextCache(lineUserId);
    writeAuditLog(lineUserId, 'LOGIN', CONFIG.SHEETS.USER_ROLE, lineUserId, 'login success: ' + (displayName || ctx.displayName));

    return ok({
      status: 'active',
      lineUserId: lineUserId,
      displayName: displayName || ctx.displayName,
      role: ctx.role,
      projectName: ctx.projectName,
      jobTitle: ctx.jobTitle
    });

  } catch (err) {
    Logger.log('verifyAccess error: ' + err);
    return fail('驗證失敗: ' + err.message);
  }
}

// ★ 修正：每次都重新從試算表抓 role，不使用快取
function checkAutoLogin(lineUserId) {
  try {
    if (!lineUserId) return fail('lineUserId 為空');
    var ctx = getUserContext(String(lineUserId).trim());
    if (!ctx)                                      return fail('使用者不在名單');
    if (ctx.status === CONFIG.STATUS.INACTIVE)     return fail('帳號已停用');
    if (ctx.status === CONFIG.STATUS.PENDING)      return ok({ status: 'pending' });

    updateRowById(CONFIG.SHEETS.USER_ROLE, 'line_user_id', lineUserId, { last_login_at: nowTW() });

    return ok({
      status: 'active',
      lineUserId: lineUserId,
      displayName: ctx.displayName,
      role: ctx.role,
      projectName: ctx.projectName,
      jobTitle: ctx.jobTitle
    });
  } catch (err) { return fail('自動登入失敗: ' + err.message); }
}

// ==================== User Management ====================
function getUserList(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var rows = readSheetAsObjects(CONFIG.SHEETS.USER_ROLE);
    if (ctx.role !== CONFIG.ROLES.ADMIN) {
      rows = rows.filter(function(r) {
        return r.project_name === ctx.projectName || r.status === CONFIG.STATUS.PENDING;
      });
    }
    rows.sort(function(a, b) {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return String(b.created_at).localeCompare(String(a.created_at));
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function updateUserRole(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var targetId = payload.targetUserId;
    if (!targetId) return fail('targetUserId 必填');

    if (ctx.role === CONFIG.ROLES.MANAGER) {
      var target = getUserContext(targetId);
      if (!target) return fail('找不到使用者');
      if (payload.role === 'admin') return fail('Manager 無法指派 Admin 角色');
    }

    var updates = { updated_at: nowTW() };
    if (payload.role        !== undefined) updates.role         = payload.role;
    if (payload.projectName !== undefined) updates.project_name = payload.projectName;
    if (payload.status      !== undefined) updates.status       = payload.status;
    if (payload.displayName !== undefined) updates.display_name = payload.displayName;
    if (payload.jobTitle    !== undefined) updates.job_title    = payload.jobTitle;

    var success = updateRowById(CONFIG.SHEETS.USER_ROLE, 'line_user_id', targetId, updates);
    if (!success) return fail('使用者不存在');
    invalidateUserContextCache(targetId);

    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.USER_ROLE, targetId,
      ctx.displayName + ' 修改 ' + targetId);
    return ok({ targetUserId: targetId });
  } catch (err) { return fail(err.message); }
}

function approveUser(payload) {
  payload.status = CONFIG.STATUS.ACTIVE;
  return updateUserRole(payload);
}

function rejectUser(payload) {
  payload.status = CONFIG.STATUS.INACTIVE;
  return updateUserRole(payload);
}

// ==================== Lookup APIs ====================
function getProjectList() {
  try {
    var rows = readSheetAsObjects(CONFIG.SHEETS.PROJECT)
      .filter(function(r) { return r.status === CONFIG.STATUS.ACTIVE; })
      .map(function(r) { return r.project_name; });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function getSalesByProject(projectName, lineUserId) {
  try {
    var ctx = getUserContext(lineUserId);
    if (!ctx) return fail('未授權');
    var seen = {};
    var rows = readSheetAsObjects(CONFIG.SHEETS.USER_ROLE)
      .filter(function(r) {
        if (r.status !== CONFIG.STATUS.ACTIVE) return false;
        if (r.role !== CONFIG.ROLES.SALES && r.role !== CONFIG.ROLES.MANAGER) return false;
        if (r.project_name !== projectName) return false;
        // User_Role_Table 可能對同一個人有多筆重複的有效紀錄（例如
        // 重新授權 LINE、重新審核過，導致同一個人對到不同的 line_user_id）
        // ——光依 line_user_id 去重抓不到這種情況，改成依姓名去重
        var key = String(r.display_name || '').trim();
        if (!key || seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .map(function(r) { return { name: r.display_name, lineUserId: r.line_user_id, jobTitle: r.job_title || '' }; });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// ==================== Config_Options（可自行編排的選項清單）====================
// ★ 吉隆天曜專屬：居住行政區／來源管道／年齡區間／職業／購屋動機這五種
// 客戶登記表單選項，原本分別寫死在 jltx.html 的 HTML/JS 裡跟這份程式碼
// 的 CONFIG.INDUSTRIES／CONFIG.PURCHASE_MOTIVES 裡，改選項要工程師改
// 程式碼重新部署。現在改成存在 Config_Options 這張表，之後要增刪/排序
// 選項，直接在 Google 試算表編輯這張表就好，跟編輯 Project_List／
// User_Role_Table 一樣的操作方式，不用再改程式碼、不用重新部署，最多
// 60 秒快取過期後就會反映在系統上。
//
// 注意：來源管道的「其他」「親友介紹」、居住行政區的「外縣市」這三個
// 選項的「值」有特殊行為（跳出額外的自由輸入欄位），前端是用文字內容
// 判斷，如果把這幾個選項的文字改掉或刪除，對應的欄位就不會再跳出來，
// 這是預期中的行為，不是 bug。
var CONFIG_OPTIONS_HEADERS = ['option_type','value','sort_order','active'];

// 第一次建表時拿目前的預設值當種子資料，之後管理者要調整就直接在表上改，
// 不會再被這裡的預設值覆蓋（只有全新建表那一次才會寫入這些種子資料）
var CONFIG_OPTIONS_SEED = {
  district: ['大寮區','鳳山區','林園區','小港區','鳥松區','大樹區','前鎮區','三民區',
             '苓雅區','新興區','前金區','鹽埕區','仁武區','楠梓區','左營區','鼓山區','橋頭區','外縣市'],
  source: ['Facebook','網路媒體','591','戶外看板','親友介紹','路過','其他'],
  age_range: ['30歲以下','30-39歲','40-49歲','50-59歲','60歲以上'],
  industry: CONFIG.INDUSTRIES,
  purchase_motive: CONFIG.PURCHASE_MOTIVES
};

function ensureConfigOptionsSheet() {
  var ss = getCrmSS();
  var name = CONFIG.SHEETS.CONFIG_OPTIONS;
  var sh = ss.getSheetByName(name);
  if (sh) {
    var existing = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    var missing = CONFIG_OPTIONS_HEADERS.filter(function(h){ return existing.indexOf(h) < 0; });
    if (missing.length) {
      sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
      sh.getRange(1, existing.length + 1, 1, missing.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    }
    return sh;
  }
  sh = ss.insertSheet(name);
  sh.getRange(1,1,1,CONFIG_OPTIONS_HEADERS.length).setValues([CONFIG_OPTIONS_HEADERS]);
  sh.getRange(1,1,1,CONFIG_OPTIONS_HEADERS.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  Object.keys(CONFIG_OPTIONS_SEED).forEach(function(type) {
    CONFIG_OPTIONS_SEED[type].forEach(function(value, i) {
      sh.appendRow([type, value, i + 1, true]);
    });
  });
  Logger.log('✓ Config_Options 分頁已建立並帶入預設選項');
  return sh;
}

// 依 option_type 分組、依 sort_order 排序、只留 active（空白視為啟用，
// 只有明確填 FALSE／false 才算停用，避免管理者漏填 active 欄位時選項
// 整批消失），快取 60 秒（客戶登記表單每次打開都會呼叫，跟
// getUserContext 同一套快取邏輯，避免每次都整張表重讀）
function getAllConfigOptions_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('configOptions');
  if (cached) return JSON.parse(cached);

  ensureConfigOptionsSheet();
  var rows = readSheetAsObjects(CONFIG.SHEETS.CONFIG_OPTIONS).filter(function(r) {
    return r.value && String(r.active).toLowerCase() !== 'false';
  });
  rows.sort(function(a, b) { return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0); });

  var grouped = {};
  rows.forEach(function(r) {
    if (!grouped[r.option_type]) grouped[r.option_type] = [];
    grouped[r.option_type].push(r.value);
  });
  cache.put('configOptions', JSON.stringify(grouped), 60);
  return grouped;
}

// 改完 Config_Options 表最多等 60 秒快取自然過期就會生效；不想等的話
// 直接在 Apps Script 編輯器選這支函式執行一次，馬上清快取立即生效
function invalidateConfigOptionsCache() {
  try { CacheService.getScriptCache().remove('configOptions'); } catch (e) {}
  Logger.log('✓ 選項清單快取已清除，下一次讀取會直接抓最新的 Config_Options');
}

// 客戶登記表單一次抓齊五種選項，取代原本前端寫死的 DISTRICTS 陣列跟
// 來源管道／年齡區間的固定 HTML
function getConfigOptions() {
  try {
    var grouped = getAllConfigOptions_();
    return ok({
      district: grouped.district || [],
      source: grouped.source || [],
      age_range: grouped.age_range || [],
      industry: grouped.industry || [],
      purchase_motive: grouped.purchase_motive || []
    });
  } catch (err) { return fail(err.message); }
}

// 保留原本的 action 名稱／回傳格式（純陣列，不是 {district:...} 包一層），
// 避免動到既有呼叫端；內部資料來源改成 Config_Options，行為上就是「可
// 以自行編排」了
function getIndustryList()       { try { return ok(getAllConfigOptions_().industry || []); } catch (err) { return fail(err.message); } }
function getPurchaseMotiveList() { try { return ok(getAllConfigOptions_().purchase_motive || []); } catch (err) { return fail(err.message); } }

// ==================== Customer Module ====================
function submitPublicLead(payload) {
  try {
    if (!payload.customer_name) return fail('姓名必填');
    if (String(payload.customer_name).length > 50) return fail('姓名過長');
    if (!payload.phone)         return fail('電話必填');
    if (!/^[0-9+#\-\s]{6,20}$/.test(String(payload.phone))) return fail('電話格式錯誤');
    if (payload.message && String(payload.message).length > 500) return fail('訊息過長');
    if (payload.hp)              return fail('提交失敗，請重新整理後再試'); // honeypot：正常訪客看不到這個欄位，機器人才會填

    var customerId = genId('CUST');
    appendObjectToSheet(CONFIG.SHEETS.CUSTOMER, {
      customer_id: customerId,
      created_at: nowTW(),
      updated_at: nowTW(),
      created_by_line_user_id: '',
      created_by_name: '官網EDM表單',
      sales_line_user_id: '',
      sales_name: '',
      project_name: CONFIG.PROJECT_NAME,
      visit_date: todayTW(),
      visit_type: '官網詢問',
      customer_name: payload.customer_name,
      phone: payload.phone,
      age_range: '',
      district: '',
      occupation_industry: '',
      purchase_motive: payload.purchase_motive || '',
      source: '官網EDM',
      room_types: payload.room_types || '',
      budget: '',
      issues: payload.message || '',
      revisit_plan: payload.contact_time ? ('方便聯絡時間：' + payload.contact_time) : '',
      deal_status: '未成交',
      deal_unit: '',
      status_note: '官網表單詢問，尚未接待',
      note: payload.email ? ('Email：' + payload.email) : ''
    });
    writeAuditLog('', 'CREATE', CONFIG.SHEETS.CUSTOMER, customerId, '官網EDM表單新增客戶: ' + payload.customer_name);
    return ok({ customer_id: customerId });
  } catch (err) { Logger.log('submitPublicLead error: ' + err); return fail(err.message); }
}

// ★ 吉隆天曜專屬：客戶資料表額外欄位（對照紙本「訪客服務表」補齊的
// 欄位，天地版本沒有這些）。之後如果要用天地的版本重新同步吉隆
// 天曜，記得保留這整段跟 appendCustomerData/updateCustomerData 裡
// 用到這些欄位的部分，不要被覆蓋掉。
var CUSTOMER_EXTRA_FIELDS = ['gender','marital_status','visit_time_slot',
  'sqft_requirement','room_requirement_note','introduced_units','referrer_name',
  'linked_customer_id','linked_customer_name','linked_visit_date','detailed_address',
  'geo_lat','geo_lng','age',
  'sales_deal_stage','sales_deal_unit_id','sales_deal_unit_label',
  'reserved_until','expected_sign_date'];

// ★ 業務端成交階段（跟主管的正式成交標記 deal_status 是兩套並行、互相
// 對照用的機制，不是同一個欄位）：業務自己在客戶資料上填，不用等主管
// 操作，方便業務隨時記錄「這位客戶談到哪個階段了」：
//   未成交　→ 預設值，不用填其他資料
//   已下訂　→ 業務收了訂金，要選戶別＋填預計簽約時間
//   已保留　→ 業務先幫客戶保留戶別，要選戶別＋填保留至日期
// 選了已下訂/已保留會同步把 Sales_Control 對應戶別的狀態改成已收訂/
// 已保留，並記下是哪位客戶（linked_customer_id/name），主管在銷售控制
// 表就看得到這戶目前談到哪個客戶。如果業務端顯示已下訂/已保留、但
// 主管的正式成交標記還是未成交，代表主管還沒處理（可能忘記了），前端
// 客戶卡片會顯示提醒
var SALES_DEAL_STAGES = ['未成交','已下訂','已保留'];

// 年齡登記方式改成直接打實際歲數（例：38），不再讓業務手動挑「30-39歲」
// 這種區間——業務常常懶得算客戶實際年齡屬於哪一區間，隨便選一個，資料
// 反而不準。但既有的來客統計（getDailyVisitorBreakdown 等）都是用
// age_range 分組，這裡不想連動改一堆報表程式碼，所以改成：age_range
// 不再讓使用者填，改成後端存檔時自動用實際年齡換算，兩個欄位都會存，
// age 給客戶名片/接待明細表顯示實際歲數，age_range 純粹餵給既有的
// 統計報表用，业务/主管都不會看到、也不用管這個欄位
function ageToRange_(age) {
  var n = Number(age);
  if (!n || n <= 0) return '';
  if (n < 30) return '30歲以下';
  if (n < 40) return '30-39歲';
  if (n < 50) return '40-49歲';
  if (n < 60) return '50-59歲';
  return '60歲以上';
}

function ensureCustomerExtraColumns() {
  var sh = getSheet(CONFIG.SHEETS.CUSTOMER);
  if (!sh) return;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var missing = CUSTOMER_EXTRA_FIELDS.filter(function(h){ return headers.indexOf(h) < 0; });
  if (!missing.length) return;
  sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
}

function appendCustomerData(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_name) return fail('客戶姓名必填');
    if (!payload.phone)         return fail('電話必填');
    if (!payload.status_note)   return fail('接待狀況必填');

    // 防止重複建檔：這支 API 要讀整張表查重複電話 + 寫 Sheets + 同步
    // Supabase，耗時常常超過前端 gasFetch 的 10 秒逾時，逾時後前端會
    // 自動重試一次（同一個 client_request_id）。但 GAS 執行不會因為
    // 前端放棄等待就中止，如果重試送達時第一次執行還沒跑完，光靠
    // 「查快取有沒有結果」會兩邊都查到空的、照樣建立兩筆。所以在真正
    // 開始建檔前先「認領」這個 key（存 PROCESSING），重試那邊如果看到
    // PROCESSING，就輪詢等第一次執行寫入最終結果，而不是自己重新跑一次
    var idemKey = payload.client_request_id ? 'appendcust_' + payload.client_request_id : null;
    var idemCache = idemKey ? CacheService.getScriptCache() : null;
    if (idemKey) {
      var existing = idemCache.get(idemKey);
      if (existing && existing !== 'PROCESSING') return JSON.parse(existing);
      if (existing === 'PROCESSING') {
        for (var waitMs = 0; waitMs < 15000; waitMs += 500) {
          Utilities.sleep(500);
          var polled = idemCache.get(idemKey);
          if (polled && polled !== 'PROCESSING') return JSON.parse(polled);
        }
        return fail('前一筆送出仍處理中，請稍後查看客戶名單確認是否已建立，避免重複建檔');
      }
      idemCache.put(idemKey, 'PROCESSING', 120);
    }

    var projectName = ctx.role === CONFIG.ROLES.ADMIN
      ? (payload.project_name || ctx.projectName || '') : ctx.projectName;
    if (!projectName) return fail('案場未指定');

    // 接待業務：一般只能是自己；只有 admin 可以指派給別的業務員
    // （幫業務員代填客戶資料），避免業務自己亂填別人名字
    var salesLineUserId = ctx.lineUserId;
    var salesName = ctx.displayName;
    if (ctx.role === CONFIG.ROLES.ADMIN && payload.sales_line_user_id) {
      salesLineUserId = payload.sales_line_user_id;
      salesName = payload.sales_name || salesLineUserId;
    }

    // 同電話號碼已有客戶資料時不擋建檔（可能是換業務接手、客戶回訪等
    // 正常情況），但回傳提示讓前端跳訊息告知，避免業務不知道已經有人
    // 接過這位客戶
    var phone = String(payload.phone).trim();
    var dupRecords = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER)
      .filter(function(r) { return String(r.phone || '').trim() === phone; })
      .map(function(r) { return { customer_name: r.customer_name, visit_date: String(r.visit_date || '').substring(0, 10), sales_name: r.sales_name }; });

    ensureCustomerExtraColumns();
    var customerId = genId('CUST');
    var customerRow = {
      customer_id: customerId,
      created_at: nowTW(),
      updated_at: nowTW(),
      created_by_line_user_id: ctx.lineUserId,
      created_by_name: ctx.displayName,
      sales_line_user_id: salesLineUserId,
      sales_name: salesName,
      project_name: projectName,
      visit_date: payload.visit_date || todayTW(),
      visit_type: payload.visit_type || '',
      customer_name: payload.customer_name,
      phone: payload.phone,
      age: payload.age || '',
      age_range: ageToRange_(payload.age),
      district: payload.district || '',
      detailed_address: payload.detailed_address || '',
      occupation_industry: payload.occupation_industry || '',
      purchase_motive: payload.purchase_motive || '',
      source: payload.source || '',
      room_types: payload.room_types || '',
      budget: payload.budget || '',
      issues: payload.issues || '',
      revisit_plan: payload.revisit_plan || '',
      deal_status: '未成交',
      deal_unit: '',
      status_note: payload.status_note,
      note: payload.note || '',
      gender: payload.gender || '',
      marital_status: payload.marital_status || '',
      visit_time_slot: payload.visit_time_slot || '',
      sqft_requirement: payload.sqft_requirement || '',
      room_requirement_note: payload.room_requirement_note || '',
      introduced_units: payload.introduced_units || '',
      referrer_name: payload.referrer_name || '',
      linked_customer_id: payload.linked_customer_id || '',
      linked_customer_name: payload.linked_customer_name || '',
      linked_visit_date: payload.linked_visit_date || ''
    };
    appendObjectToSheet(CONFIG.SHEETS.CUSTOMER, customerRow);
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.CUSTOMER, customerId,
      ctx.displayName + ' 新增客戶: ' + payload.customer_name);
    dwSyncVisitCreate_(customerRow); // Supabase 雙寫（失敗不影響上面的 Sheets 寫入結果）
    var result = ok({ customer_id: customerId, duplicate_phone: dupRecords.length > 0, duplicate_records: dupRecords });
    if (idemKey) {
      // 存 2 分鐘：遠超過前端「10 秒逾時 + 700ms 後重試一次」的時間窗，
      // 重試那次一定拿得到快取；2 分鐘後自動過期，不會佔用快取空間
      try { CacheService.getScriptCache().put(idemKey, JSON.stringify(result), 120); } catch (e) {}
    }
    return result;
  } catch (err) {
    Logger.log('appendCustomerData error: ' + err);
    var failResult = fail(err.message);
    // 建檔失敗要釋放 PROCESSING 認領，不然真的重試時會被誤判成
    // 「前一次還在處理中」，白白卡 15 秒又拿到假的處理中訊息
    if (idemKey) { try { CacheService.getScriptCache().put(idemKey, JSON.stringify(failResult), 120); } catch (e2) {} }
    return failResult;
  }
}

// 主管標記成交
// 標記成交／退戶。退戶時（deal_status='退戶'）保留原本的 deal_unit（除非另外傳新值），
// 並把狀態變化寫進 Customer_Change_Log，讓「修改紀錄」看得到是誰、何時、為何改的
function updateCustomerDeal(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限，需主管以上');
    if (!payload.customer_id) return fail('customer_id 必填');

    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER);
    var original = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].customer_id) === String(payload.customer_id)) { original = rows[i]; break; }
    }
    if (!original) return fail('找不到客戶資料');

    var newStatus = payload.deal_status || '已成交';
    var updates = {
      deal_status: newStatus,
      deal_unit:   payload.deal_unit != null && payload.deal_unit !== '' ? payload.deal_unit : (original.deal_unit || ''),
      updated_at:  nowTW()
    };
    updateRowById(CONFIG.SHEETS.CUSTOMER, 'customer_id', payload.customer_id, updates);

    var logId = genId('CLOG');
    appendObjectToSheet(CONFIG.SHEETS.CHANGE_LOG, {
      log_id:                  logId,
      customer_id:             payload.customer_id,
      customer_name:           original.customer_name,
      changed_by_line_user_id: ctx.lineUserId,
      changed_by_name:         ctx.displayName,
      changed_at:              nowTW(),
      changes_json:            JSON.stringify([{
        field: 'deal_status', before: original.deal_status || '', after: newStatus,
        note: payload.reason || ''
      }])
    });

    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.CUSTOMER, payload.customer_id,
      ctx.displayName + ' 變更成交狀態為「' + newStatus + '」: ' + payload.customer_id +
      (payload.reason ? '（原因：' + payload.reason + '）' : ''));
    return ok({ customer_id: payload.customer_id });
  } catch (err) { return fail(err.message); }
}

// ==================== 成交明細模組（Deal_Detail） ====================
// 存放每一筆成交/退戶的詳細資料：戶別、房屋底價、車位底價、溢價、成交價、
// 訂金、簽約狀態（待簽約/已簽約）、預定簽約日期。跟 Customer_Data 的
// deal_status/deal_unit（客戶卡片上的小標籤）是互補關係：Customer_Data
// 存快速狀態，這裡存完整交易細節，兩者用 customer_id 對起來。
var DEAL_DETAIL_HEADERS = ['deal_id','customer_id','customer_name','project_name','unit','unit_id',
  'house_base_price','parking_base_price','premium','deal_price','deposit_amount',
  'contract_status','expected_sign_date','signed_date','salesperson','sales_line_user_id',
  'created_by_line_user_id','status','refund_reason','refund_date','created_at','created_by','updated_at'];

// 會自動補齊缺少的欄位（例如之後版本新增欄位時，既有的 Deal_Detail 分頁
// 不用手動改表頭），不會動到既有資料列
function ensureDealDetailSheet() {
  var ss = getCrmSS();
  var name = CONFIG.SHEETS.DEAL_DETAIL;
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,DEAL_DETAIL_HEADERS.length).setValues([DEAL_DETAIL_HEADERS]);
    sh.getRange(1,1,1,DEAL_DETAIL_HEADERS.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    Logger.log('✓ Deal_Detail 分頁已建立');
    return sh;
  }
  var existing = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var missing = DEAL_DETAIL_HEADERS.filter(function(h){ return existing.indexOf(h) < 0; });
  if (missing.length) {
    sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    sh.getRange(1, existing.length + 1, 1, missing.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  }
  return sh;
}

// 主管標記成交／編輯成交明細時，把選到的戶別同步連結回 Sales_Control：
// 待簽約 → 銷控狀態改「已收訂」；已簽約 → 銷控狀態改「已簽約」。銷控表
// 那邊才是價格/坪數這些進階數字唯一該填的地方，這裡只負責連結跟狀態
function syncSalesControlFromDeal_(unitId, contractStatus, customerId, customerName) {
  if (!unitId) return;
  ensureSalesControlSheet();
  var unit = readSheetAsObjects(CONFIG.SHEETS.SALES_CONTROL).filter(function(u){ return u.unit_id === unitId; })[0];
  if (!unit) return;
  var scStatus = contractStatus === '已簽約' ? '已簽約' : '已收訂';
  updateRowById(CONFIG.SHEETS.SALES_CONTROL, 'unit_id', unitId, {
    status: scStatus,
    linked_customer_id: customerId || '',
    linked_customer_name: customerName || '',
    reserved_until: '',
    updated_at: nowTW()
  });
}

// 新增或更新一筆成交明細。有帶 deal_id 就是更新（會先讀出原本的資料當底，
// payload 沒帶到的欄位不會被清空，例如「首頁提醒點一下標記已簽約」這種
// 只想改簽約狀態、不想被迫重打一次房價的情境），沒帶就是新增一筆。
function saveDealDetail(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限，需主管以上');

    ensureDealDetailSheet();

    var existing = null;
    if (payload.deal_id) {
      existing = readSheetAsObjects(CONFIG.SHEETS.DEAL_DETAIL).filter(function(r) {
        return String(r.deal_id) === String(payload.deal_id);
      })[0];
      if (!existing) return fail('找不到成交明細');
    }
    var base = existing || {};

    function pick(key, fallback) {
      return (payload[key] != null && payload[key] !== '') ? payload[key]
        : (base[key] != null && base[key] !== '' ? base[key] : fallback);
    }

    var housePrice = +pick('house_base_price', 0) || 0;
    var parkPrice  = +pick('parking_base_price', 0) || 0;
    var premium    = +pick('premium', 0) || 0;
    var dealPrice  = (payload.deal_price != null && payload.deal_price !== '')
      ? (+payload.deal_price || 0) : (housePrice + parkPrice + premium);
    var contractStatus = pick('contract_status', '待簽約') === '已簽約' ? '已簽約' : '待簽約';

    // 戶別改成從銷售控制表選（unit_id），不再讓使用者手打文字——手打
    // 每個人格式都不一樣（A3/8F、A棟3型8樓…），選的話戶別文字統一由
    // Sales_Control 的 unit_label 帶出來，兩邊資料才連得起來
    var unitId = pick('unit_id', '');
    var unitLabel = pick('unit', '');
    if (unitId) {
      var scUnit = readSheetAsObjects(CONFIG.SHEETS.SALES_CONTROL).filter(function(u){ return u.unit_id === unitId; })[0];
      if (scUnit) unitLabel = scUnit.unit_label;
    }

    var row = {
      deal_id:              existing ? existing.deal_id : genId('DEAL'),
      customer_id:          pick('customer_id', ''),
      customer_name:        pick('customer_name', ''),
      project_name:         base.project_name || ctx.projectName || '',
      unit:                 unitLabel,
      unit_id:              unitId,
      house_base_price:     housePrice,
      parking_base_price:   parkPrice,
      premium:              premium,
      deal_price:           dealPrice,
      deposit_amount:       +pick('deposit_amount', 0) || 0,
      contract_status:      contractStatus,
      expected_sign_date:   contractStatus === '待簽約' ? pick('expected_sign_date', '') : '',
      signed_date:          contractStatus === '已簽約' ? (base.signed_date || todayTW()) : '',
      salesperson:          pick('salesperson', ctx.displayName || ''),
      sales_line_user_id:   pick('sales_line_user_id', ctx.lineUserId),
      created_by_line_user_id: base.created_by_line_user_id || ctx.lineUserId,
      status:               base.status || 'active',
      refund_reason:        base.refund_reason || '',
      refund_date:          base.refund_date || '',
      created_at:           base.created_at || nowTW(),
      created_by:           base.created_by || ctx.displayName || ctx.lineUserId,
      updated_at:           nowTW()
    };

    if (existing) {
      updateRowById(CONFIG.SHEETS.DEAL_DETAIL, 'deal_id', row.deal_id, row);
    } else {
      appendObjectToSheet(CONFIG.SHEETS.DEAL_DETAIL, row);
    }

    writeAuditLog(ctx.lineUserId, existing ? 'UPDATE' : 'CREATE', CONFIG.SHEETS.DEAL_DETAIL, row.deal_id,
      ctx.displayName + ' 記錄成交明細：' + row.unit + ' / ' + row.customer_name);
    dwSyncDeal_(row); // Supabase 雙寫（失敗不影響上面的 Sheets 寫入結果）
    syncSalesControlFromDeal_(row.unit_id, row.contract_status, row.customer_id, row.customer_name);
    return ok(row);
  } catch (err) { return fail(err.message); }
}

// 依 customer_id 找最新一筆有效成交明細（標記退戶時，先帶出原本填過的
// 戶別/價格資料讓使用者確認/調整，不用整筆重打）
function getDealDetailByCustomer(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id) return fail('customer_id 必填');
    var rows = readSheetAsObjects(CONFIG.SHEETS.DEAL_DETAIL).filter(function(r) {
      return String(r.customer_id) === String(payload.customer_id) && r.status === 'active';
    });
    rows.sort(function(a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    return ok(rows[0] || null);
  } catch (err) { return fail(err.message); }
}

// 標記一筆成交明細為退戶（跟 updateCustomerDeal 一起呼叫，一個改
// Customer_Data 的快速狀態，一個改這裡的完整交易紀錄）
function markDealDetailRefund(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限，需主管以上');
    if (!payload.deal_id) return fail('deal_id 必填');

    var deal = readSheetAsObjects(CONFIG.SHEETS.DEAL_DETAIL).filter(function(r){ return String(r.deal_id) === String(payload.deal_id); })[0];
    if (!deal) return fail('找不到成交明細');

    updateRowById(CONFIG.SHEETS.DEAL_DETAIL, 'deal_id', payload.deal_id, {
      status: '退戶',
      refund_reason: payload.reason || '',
      refund_date: todayTW(),
      updated_at: nowTW()
    });
    // 退戶後把連結的戶別也一起改回「退戶」，讓銷控表看得出這戶又空出來了
    if (deal.unit_id) {
      updateRowById(CONFIG.SHEETS.SALES_CONTROL, 'unit_id', deal.unit_id, {
        status: '退戶', updated_at: nowTW()
      });
    }
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.DEAL_DETAIL, payload.deal_id,
      ctx.displayName + ' 標記成交明細退戶：' + payload.deal_id);
    return ok({ deal_id: payload.deal_id });
  } catch (err) { return fail(err.message); }
}

// 待簽約提醒（首頁用）：業務只看自己的，主管看同案場全部業務的，
// admin 看全部案場。已逾期（predicted_sign_date 已過但還沒簽約）
// 前端會用紅字標示、持續顯示，不會因為日期過了就悄悄消失——
// 只有真的改成「已簽約」或被標記退戶，才會從清單中消失。
function getPendingSignatures(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    var rows = readSheetAsObjects(CONFIG.SHEETS.DEAL_DETAIL).filter(function(r) {
      if (r.status !== 'active' || r.contract_status !== '待簽約') return false;
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
      return String(r.sales_line_user_id) === String(ctx.lineUserId);
    });
    rows.sort(function(a, b) { return String(a.expected_sign_date).localeCompare(String(b.expected_sign_date)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// 查某一天「這個人自己已經記錄過」的成交明細筆數（用 created_by_line_user_id
// 判斷，也就是誰實際操作表單記錄的，不是 salesperson 掛名欄位）。
// 提交日報表時用來判斷：已經在「近期客戶」用「標記成交」填過的，
// 交日報就不用再跳窗重填一次，避免同一筆成交被記錄兩次。
function getDealDetailsForDate(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    var date = String(payload.date || todayTW()).substring(0, 10);
    var rows = readSheetAsObjects(CONFIG.SHEETS.DEAL_DETAIL).filter(function(r) {
      if (r.status !== 'active') return false;
      if (String(r.created_at).substring(0, 10) !== date) return false;
      return String(r.created_by_line_user_id) === String(ctx.lineUserId);
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// ==================== Contact Log Module（客戶追蹤記錄） ====================
var CONTACT_LOG_HEADERS = ['contact_id','customer_id','customer_name','phone','project_name',
  'sales_line_user_id','sales_name','contact_date','contact_method','note',
  'next_followup_date','created_at','created_by_line_user_id'];

function ensureContactLogSheet() {
  var ss = getCrmSS();
  var name = CONFIG.SHEETS.CONTACT_LOG;
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,CONTACT_LOG_HEADERS.length).setValues([CONTACT_LOG_HEADERS]);
    sh.getRange(1,1,1,CONTACT_LOG_HEADERS.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    Logger.log('✓ Contact_Log 分頁已建立');
    return sh;
  }
  var existing = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var missing = CONTACT_LOG_HEADERS.filter(function(h){ return existing.indexOf(h) < 0; });
  if (missing.length) {
    sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    sh.getRange(1, existing.length + 1, 1, missing.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  }
  return sh;
}

// 新增一筆追蹤記錄。業務只能記自己的客戶（sales_line_user_id 或
// created_by_line_user_id 是自己），主管/admin 在自己權限範圍內的
// 客戶都能記。填了 next_followup_date 就會在首頁提醒，下一筆記錄
// （不管有沒有再填 next_followup_date）送出後就會取代掉上一筆的提醒。
function appendContactLog(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id)    return fail('customer_id 必填');
    if (!payload.contact_method) return fail('聯絡方式必填');

    var cust = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      return String(r.customer_id) === String(payload.customer_id);
    })[0];
    if (!cust) return fail('找不到客戶資料');
    if (ctx.role === CONFIG.ROLES.SALES &&
        String(cust.sales_line_user_id) !== String(ctx.lineUserId) &&
        String(cust.created_by_line_user_id) !== String(ctx.lineUserId)) {
      return fail('只能記錄自己的客戶');
    }

    ensureContactLogSheet();
    var row = {
      contact_id:          genId('CONTACT'),
      customer_id:         cust.customer_id,
      customer_name:       cust.customer_name,
      phone:               cust.phone || '',
      project_name:        cust.project_name || ctx.projectName || '',
      sales_line_user_id:  cust.sales_line_user_id || ctx.lineUserId,
      sales_name:          cust.sales_name || ctx.displayName,
      contact_date:        payload.contact_date || todayTW(),
      contact_method:      payload.contact_method,
      note:                payload.note || '',
      next_followup_date:  payload.next_followup_date || '',
      created_at:          nowTW(),
      created_by_line_user_id: ctx.lineUserId
    };
    appendObjectToSheet(CONFIG.SHEETS.CONTACT_LOG, row);
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.CONTACT_LOG, row.contact_id,
      ctx.displayName + ' 新增客戶追蹤記錄：' + row.customer_name + ' / ' + row.contact_method);
    dwSyncContact_(row); // Supabase 雙寫（失敗不影響上面的 Sheets 寫入結果）
    return ok(row);
  } catch (err) { return fail(err.message); }
}

// 某客戶的追蹤記錄（新到舊）
function getContactLogsByCustomer(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id) return fail('customer_id 必填');
    var rows = readSheetAsObjects(CONFIG.SHEETS.CONTACT_LOG).filter(function(r) {
      return String(r.customer_id) === String(payload.customer_id);
    });
    rows.sort(function(a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// 業務只能刪自己記錄的追蹤；主管/admin 可以刪任何一筆
function deleteContactLog(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.contact_id) return fail('contact_id 必填');

    var result = deleteRowById(CONFIG.SHEETS.CONTACT_LOG, 'contact_id', payload.contact_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.SALES &&
            String(row.created_by_line_user_id) !== String(ctx.lineUserId)) {
          return '只能刪除自己記錄的追蹤';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到該筆追蹤記錄');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.CONTACT_LOG, payload.contact_id,
      ctx.displayName + ' 刪除客戶追蹤記錄');
    return ok({ contact_id: payload.contact_id });
  } catch (err) { return fail(err.message); }
}

// 待追蹤提醒（首頁用）：業務只看自己的，主管看同案場全部業務的，
// admin 看全部案場。同一位客戶只看「最新一筆」記錄的 next_followup_date
// ——只要業務再記一筆新的（不管有沒有再填下次日期），舊的提醒就會
// 自然被取代，不用另外手動清除
function getPendingFollowups(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    var rows = readSheetAsObjects(CONFIG.SHEETS.CONTACT_LOG);

    var latestByCustomer = {};
    rows.forEach(function(r) {
      var existing = latestByCustomer[r.customer_id];
      if (!existing || String(r.created_at).localeCompare(String(existing.created_at)) > 0) {
        latestByCustomer[r.customer_id] = r;
      }
    });

    var today = todayTW();
    var pending = Object.keys(latestByCustomer)
      .map(function(cid) { return latestByCustomer[cid]; })
      .filter(function(r) { return r.next_followup_date && String(r.next_followup_date) <= today; });

    pending = filterByCtx(pending, ctx, 'sales_line_user_id');
    pending.sort(function(a, b) { return String(a.next_followup_date).localeCompare(String(b.next_followup_date)); });
    return ok(pending);
  } catch (err) { return fail(err.message); }
}

function getCustomerList(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    // 業務的客戶不能只看 created_by_line_user_id：admin 代填客戶資料時，
    // 建檔人是 admin，實際接待業務是 sales_line_user_id，只比對
    // created_by 會漏掉這些代填的客戶，導致業務自己的統計數字偏低
    // （跟 getMyCustomers 的規則保持一致）
    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
      return String(r.sales_line_user_id) === String(ctx.lineUserId) ||
             String(r.created_by_line_user_id) === String(ctx.lineUserId);
    });
    rows.sort(function(a,b){ return String(b.created_at).localeCompare(String(a.created_at)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// 近14天客戶資料（主管用）
function getRecentCustomers(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 14);
    var cutoff = Utilities.formatDate(daysAgo, CONFIG.TIMEZONE, 'yyyy-MM-dd');

    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      var vd = String(r.visit_date || r.created_at || '').substring(0,10);
      if (vd < cutoff) return false;
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      return r.project_name === ctx.projectName;
    });

    rows.sort(function(a,b){
      var da = String(a.visit_date || a.created_at || '').substring(0,10);
      var db = String(b.visit_date || b.created_at || '').substring(0,10);
      return db.localeCompare(da);
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// 業務查看自己所有客戶
function getMyCustomers(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');

    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
      return String(r.sales_line_user_id) === String(ctx.lineUserId) ||
             String(r.created_by_line_user_id) === String(ctx.lineUserId);
    });

    rows.sort(function(a,b){
      var da = String(a.visit_date || a.created_at || '').substring(0,10);
      var db = String(b.visit_date || b.created_at || '').substring(0,10);
      return db.localeCompare(da);
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// ★ 回訪客人關聯：業務登記回籠客人時，可以用姓名／電話搜尋自己權限
// 範圍內的歷史客戶資料，把這筆新的回訪紀錄跟原本初訪的那筆連結
// 起來（存 linked_customer_id/name/visit_date 在新的那筆客戶資料
// 上）。搜尋範圍跟 getMyCustomers 用同一套角色權限規則：業務只搜得到
// 自己的客戶、主管限案場、admin 不限。姓名用模糊比對、電話也用模糊
// 比對（方便只記得後幾碼的情況），最多回傳 15 筆、依訪客日期新到舊
function searchMyCustomers(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    var keyword = String((payload && payload.keyword) || '').trim();
    if (!keyword) return ok([]);

    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
      return String(r.sales_line_user_id) === String(ctx.lineUserId) ||
             String(r.created_by_line_user_id) === String(ctx.lineUserId);
    }).filter(function(r) {
      var name  = String(r.customer_name || '');
      var phone = String(r.phone || '');
      return name.indexOf(keyword) >= 0 || phone.indexOf(keyword) >= 0;
    });

    rows.sort(function(a,b){ return String(b.visit_date||'').localeCompare(String(a.visit_date||'')); });

    var results = rows.slice(0, 15).map(function(r) {
      return {
        customer_id:   r.customer_id,
        customer_name: r.customer_name,
        phone:         r.phone,
        visit_date:    String(r.visit_date || '').substring(0, 10),
        visit_type:    r.visit_type,
        project_name:  r.project_name
      };
    });
    return ok(results);
  } catch (err) { return fail(err.message); }
}

// 查詢客戶修改紀錄
function getCustomerChangeLogs(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id) return fail('customer_id 必填');

    var rows = readSheetAsObjects(CONFIG.SHEETS.CHANGE_LOG).filter(function(r) {
      return String(r.customer_id) === String(payload.customer_id);
    });
    rows.sort(function(a,b){ return String(b.changed_at).localeCompare(String(a.changed_at)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// 業務修改客戶資料（14天內）
function updateCustomerData(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id) return fail('customer_id 必填');

    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER);
    var original = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].customer_id) === String(payload.customer_id)) { original = rows[i]; break; }
    }
    if (!original) return fail('找不到客戶資料');

    if (ctx.role === CONFIG.ROLES.SALES) {
      if (String(original.sales_line_user_id) !== String(ctx.lineUserId) &&
          String(original.created_by_line_user_id) !== String(ctx.lineUserId)) {
        return fail('只能修改自己的客戶資料');
      }
      var createdAt = new Date(original.created_at);
      var diffDays = (new Date() - createdAt) / (1000 * 60 * 60 * 24);
      if (diffDays > 14) return fail('超過14天，無法修改');
    }

    ensureCustomerExtraColumns();
    // sales_deal_stage／sales_deal_unit_id／sales_deal_unit_label／
    // reserved_until／expected_sign_date 不放進這裡的一般欄位編輯——
    // 這幾個要連動同步 Sales_Control 對應戶別的狀態，而且不同階段有
    // 不同的必填檢查，改走專用的 updateCustomerDealStage，這裡直接改
    // 會繞過同步跟檢查
    var SALES_DEAL_FIELDS_ = ['sales_deal_stage','sales_deal_unit_id','sales_deal_unit_label','reserved_until','expected_sign_date'];
    var editableFields = [
      'visit_date','visit_type','customer_name','phone','district',
      'occupation_industry','purchase_motive','source','room_types',
      'budget','issues','revisit_plan','status_note','note'
    ].concat(CUSTOMER_EXTRA_FIELDS.filter(function(f) {
      return SALES_DEAL_FIELDS_.indexOf(f) < 0;
    }));
    if (ctx.role !== CONFIG.ROLES.SALES) {
      editableFields = editableFields.concat(['sales_name','sales_line_user_id']);
    }

    var changes = [];
    var updates = { updated_at: nowTW() };
    editableFields.forEach(function(field) {
      if (payload[field] !== undefined && String(payload[field]) !== String(original[field] || '')) {
        changes.push({
          field: field,
          before: String(original[field] || ''),
          after:  String(payload[field])
        });
        updates[field] = payload[field];
      }
    });
    // age_range 不讓使用者直接改，改年齡（age）的話這裡自動連動換算，
    // 純粹餵給既有的年齡區間統計報表用
    if (updates.age !== undefined) {
      var newRange = ageToRange_(updates.age);
      if (newRange !== String(original.age_range || '')) updates.age_range = newRange;
    }

    if (!changes.length) return ok({ customer_id: payload.customer_id, message: '無變更' });

    updateRowById(CONFIG.SHEETS.CUSTOMER, 'customer_id', payload.customer_id, updates);
    dwSyncVisitUpdate_(payload.customer_id, updates); // Supabase 雙寫（失敗不影響上面的 Sheets 寫入結果）

    var logId = genId('CLOG');
    appendObjectToSheet(CONFIG.SHEETS.CHANGE_LOG, {
      log_id:                  logId,
      customer_id:             payload.customer_id,
      customer_name:           original.customer_name,
      changed_by_line_user_id: ctx.lineUserId,
      changed_by_name:         ctx.displayName,
      changed_at:              nowTW(),
      changes_json:            JSON.stringify(changes)
    });

    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.CUSTOMER, payload.customer_id,
      ctx.displayName + ' 修改客戶 ' + original.customer_name + '，共 ' + changes.length + ' 個欄位');

    return ok({ customer_id: payload.customer_id, changes_count: changes.length });
  } catch (err) { Logger.log('updateCustomerData error: ' + err); return fail(err.message); }
}

// 業務端成交階段：業務自己在客戶資料上填「這位客戶談到哪個階段了」，
// 不用等主管操作。選已下訂/已保留時要指定戶別，並同步把 Sales_Control
// 對應戶別的狀態、保留至/預計簽約時間、連結的客戶姓名都一起更新，
// 主管在銷售控制表就能直接看到這戶目前談到哪個客戶。跟主管的正式
// 成交標記（deal_status，updateCustomerDeal 那支）是兩套並行機制，
// 不會互相覆蓋——如果業務端已經是已下訂/已保留、但主管的正式成交
// 標記還是未成交，代表主管還沒處理，這個落差前端會顯示提醒
function updateCustomerDealStage(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id) return fail('customer_id 必填');

    var stage = payload.sales_deal_stage;
    if (SALES_DEAL_STAGES.indexOf(stage) < 0) return fail('成交階段不正確');
    if (stage === '已下訂' && (!payload.unit_id || !payload.expected_sign_date)) return fail('狀態選「已下訂」時，戶別跟預計簽約時間必填');
    if (stage === '已保留' && (!payload.unit_id || !payload.reserved_until)) return fail('狀態選「已保留」時，戶別跟保留至日期必填');

    var customers = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER);
    var original = null;
    for (var i = 0; i < customers.length; i++) {
      if (String(customers[i].customer_id) === String(payload.customer_id)) { original = customers[i]; break; }
    }
    if (!original) return fail('找不到客戶資料');

    if (ctx.role === CONFIG.ROLES.SALES) {
      if (String(original.sales_line_user_id) !== String(ctx.lineUserId) &&
          String(original.created_by_line_user_id) !== String(ctx.lineUserId)) {
        return fail('只能修改自己的客戶資料');
      }
    }

    ensureSalesControlSheet();
    var units = readSheetAsObjects(CONFIG.SHEETS.SALES_CONTROL);
    var unitById = {};
    units.forEach(function(u) { unitById[u.unit_id] = u; });

    var newUnit = payload.unit_id ? unitById[payload.unit_id] : null;
    if (payload.unit_id && !newUnit) return fail('找不到選擇的戶別');
    // 這戶已經被別的客戶談走了（已保留/已收訂/已簽約），不能再指給
    // 另一個客戶，避免同一戶同時被兩個客戶占用
    if (newUnit && String(newUnit.linked_customer_id || '') && String(newUnit.linked_customer_id) !== String(payload.customer_id) &&
        ['已保留','已收訂','已簽約'].indexOf(newUnit.status) >= 0) {
      return fail('這戶目前已經連結到別的客戶（' + newUnit.linked_customer_name + '），無法重複指定');
    }

    // 舊戶別如果是這個客戶自己談的、且還在業務端可以取消的狀態（已保留/
    // 已收訂），先退回待售並清空連結——換戶別或改回未成交都會走到這裡
    var oldUnitId = original.sales_deal_unit_id;
    if (oldUnitId && oldUnitId !== payload.unit_id) {
      var oldUnit = unitById[oldUnitId];
      if (oldUnit && String(oldUnit.linked_customer_id) === String(payload.customer_id) &&
          ['已保留','已收訂'].indexOf(oldUnit.status) >= 0) {
        updateRowById(CONFIG.SHEETS.SALES_CONTROL, 'unit_id', oldUnitId, {
          status: '待售', reserved_until: '', expected_sign_date: '',
          linked_customer_id: '', linked_customer_name: '', updated_at: nowTW()
        });
      }
    }

    var reservedUntil = stage === '已保留' ? payload.reserved_until : '';
    var expectedSignDate = stage === '已下訂' ? payload.expected_sign_date : '';

    updateRowById(CONFIG.SHEETS.CUSTOMER, 'customer_id', payload.customer_id, {
      sales_deal_stage: stage,
      sales_deal_unit_id: stage === '未成交' ? '' : (payload.unit_id || ''),
      sales_deal_unit_label: stage === '未成交' ? '' : (newUnit ? newUnit.unit_label : ''),
      reserved_until: reservedUntil,
      expected_sign_date: expectedSignDate,
      updated_at: nowTW()
    });

    if (newUnit && stage !== '未成交') {
      updateRowById(CONFIG.SHEETS.SALES_CONTROL, 'unit_id', newUnit.unit_id, {
        status: stage === '已下訂' ? '已收訂' : '已保留',
        reserved_until: reservedUntil,
        expected_sign_date: expectedSignDate,
        linked_customer_id: payload.customer_id,
        linked_customer_name: original.customer_name,
        updated_at: nowTW()
      });
    }

    appendObjectToSheet(CONFIG.SHEETS.CHANGE_LOG, {
      log_id: genId('CLOG'),
      customer_id: payload.customer_id,
      customer_name: original.customer_name,
      changed_by_line_user_id: ctx.lineUserId,
      changed_by_name: ctx.displayName,
      changed_at: nowTW(),
      changes_json: JSON.stringify([{
        field: 'sales_deal_stage', before: original.sales_deal_stage || '未成交', after: stage,
        note: newUnit ? '戶別：' + newUnit.unit_label : ''
      }])
    });

    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.CUSTOMER, payload.customer_id,
      ctx.displayName + ' 更新客戶 ' + original.customer_name + ' 的成交階段為「' + stage + '」' +
      (newUnit ? '，戶別：' + newUnit.unit_label : ''));

    return ok({ customer_id: payload.customer_id });
  } catch (err) { Logger.log('updateCustomerDealStage error: ' + err); return fail(err.message); }
}

// 業務刪除自己建立的客戶資料（14天內，跟修改資料同一個時間限制）
function deleteCustomerData(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id) return fail('customer_id 必填');

    var result = deleteRowById(CONFIG.SHEETS.CUSTOMER, 'customer_id', payload.customer_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.SALES) {
          if (String(row.sales_line_user_id) !== String(ctx.lineUserId) &&
              String(row.created_by_line_user_id) !== String(ctx.lineUserId)) {
            return '只能刪除自己的客戶資料';
          }
          var diffDays = (new Date() - new Date(row.created_at)) / (1000 * 60 * 60 * 24);
          if (diffDays > 14) return '超過14天，無法刪除';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到客戶資料');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.CUSTOMER, payload.customer_id,
      ctx.displayName + ' 刪除客戶 ' + result.row.customer_name);
    return ok({ customer_id: payload.customer_id });
  } catch (err) { return fail(err.message); }
}

function filterByCtx(rows, ctx, ownerField) {
  if (!ctx) return [];
  if (ctx.role === CONFIG.ROLES.ADMIN) return rows;
  return rows.filter(function(r) {
    if (r.project_name !== ctx.projectName) return false;
    if (ctx.role === CONFIG.ROLES.MANAGER) return true;
    return String(r[ownerField]) === String(ctx.lineUserId);
  });
}

// ==================== Task Module ====================
function appendTask(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.title) return fail('任務標題必填');

    var projectName = ctx.role === CONFIG.ROLES.ADMIN
      ? (payload.project_name || ctx.projectName || '') : ctx.projectName;
    if (!projectName) return fail('案場未指定');

    var taskId = genId('TASK');
    appendObjectToSheet(CONFIG.SHEETS.TASK, {
      task_id:                 taskId,
      project_name:            projectName,
      type:                    payload.type || 'sales_task',
      title:                   payload.title,
      description:             payload.description || '',
      priority:                payload.priority || 'normal',
      status:                  CONFIG.STATUS.PENDING,
      assigned_to:             payload.assigned_to || ctx.displayName,
      assigned_to_line_user_id: payload.assigned_to_line_user_id || '',
      created_by:              ctx.displayName,
      created_by_line_user_id: ctx.lineUserId,
      due_date:                payload.due_date || '',
      created_at:              nowTW(),
      updated_at:              nowTW()
    });

    // 指派給別人才推播，指派給自己不用通知自己；沒有 assigned_to_line_user_id
    // （例如指派給的人還沒串上 LINE 帳號）就沒辦法推，靜默略過不擋主流程
    var assigneeId = payload.assigned_to_line_user_id;
    if (assigneeId && assigneeId !== ctx.lineUserId && getProp(CONFIG.PROP_KEYS.LINE_TOKEN)) {
      sendLinePush(assigneeId,
        '案場：' + CONFIG.PROJECT_NAME + '\n📋 新任務指派\n標題：' + payload.title +
        (payload.due_date ? '\n期限：' + payload.due_date : '') +
        (payload.description ? '\n說明：' + payload.description : '') +
        '\n指派人：' + ctx.displayName);
    }

    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.TASK, taskId, ctx.displayName + ' 建立任務: ' + payload.title);
    return ok({ task_id: taskId });
  } catch (err) { return fail(err.message); }
}

function getTasks(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    var rows = readSheetAsObjects(CONFIG.SHEETS.TASK);

    if (ctx.role === CONFIG.ROLES.ADMIN) {
      // 全部
    } else if (ctx.role === CONFIG.ROLES.MANAGER) {
      rows = rows.filter(function(r){ return r.project_name === ctx.projectName; });
    } else {
      rows = rows.filter(function(r){
        return r.project_name === ctx.projectName &&
          (String(r.created_by_line_user_id) === String(ctx.lineUserId) ||
           String(r.assigned_to_line_user_id) === String(ctx.lineUserId));
      });
    }
    if (payload.status) rows = rows.filter(function(r){ return r.status === payload.status; });
    rows.sort(function(a,b){
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return String(a.due_date).localeCompare(String(b.due_date));
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function updateTaskStatus(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.task_id) return fail('task_id 必填');

    updateRowById(CONFIG.SHEETS.TASK, 'task_id', payload.task_id, {
      status: payload.status || CONFIG.STATUS.DONE, updated_at: nowTW()
    });
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.TASK, payload.task_id,
      ctx.displayName + ' 變更狀態: ' + (payload.status || 'done'));
    return ok({ task_id: payload.task_id });
  } catch (err) { return fail(err.message); }
}

// 修改任務內容（標題／說明／優先度／截止日期／指派對象等），跟
// updateTaskStatus 分開，那支只改狀態。業務只能改自己建立的任務，
// 主管/admin 可以改任何一筆。
function updateTask(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.task_id) return fail('task_id 必填');

    var sh = getSheet(CONFIG.SHEETS.TASK);
    if (!sh) return fail('找不到 Task_List 分頁');
    var data = sh.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('task_id');
    var createdByCol = headers.indexOf('created_by_line_user_id');

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(payload.task_id)) { rowIndex = i; break; }
    }
    if (rowIndex < 0) return fail('找不到該筆任務');
    if (ctx.role === CONFIG.ROLES.SALES && String(data[rowIndex][createdByCol]) !== String(ctx.lineUserId)) {
      return fail('只能修改自己建立的任務');
    }

    var updates = { updated_at: nowTW() };
    if (payload.title != null)        updates.title = payload.title;
    if (payload.description != null)  updates.description = payload.description;
    if (payload.priority != null)     updates.priority = payload.priority;
    if (payload.due_date != null)     updates.due_date = payload.due_date;
    if (payload.type != null)         updates.type = payload.type;
    if (payload.assigned_to != null)  updates.assigned_to = payload.assigned_to;
    if (payload.assigned_to_line_user_id != null) updates.assigned_to_line_user_id = payload.assigned_to_line_user_id;

    updateRowById(CONFIG.SHEETS.TASK, 'task_id', payload.task_id, updates);
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.TASK, payload.task_id,
      ctx.displayName + ' 修改任務: ' + (payload.title || ''));
    return ok({ task_id: payload.task_id });
  } catch (err) { return fail(err.message); }
}

function deleteTask(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.task_id) return fail('task_id 必填');

    // 業務只能刪自己建立的任務；主管/admin 可以刪任何任務
    var result = deleteRowById(CONFIG.SHEETS.TASK, 'task_id', payload.task_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.SALES &&
            String(row.created_by_line_user_id) !== String(ctx.lineUserId)) {
          return '只能刪除自己建立的任務';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到該筆任務');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.TASK, payload.task_id,
      ctx.displayName + ' 刪除任務: ' + result.row.title);
    return ok({ task_id: payload.task_id });
  } catch (err) { return fail(err.message); }
}

// ==================== Daily Report Module ====================
function appendDailyReport(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('業務無權限提交日報');

    var projectName = ctx.role === CONFIG.ROLES.ADMIN
      ? (payload.project_name || ctx.projectName || '') : ctx.projectName;
    if (!projectName) return fail('案場未指定');

    var reportDate      = payload.report_date || todayTW();
    var salesLineUserId = payload.sales_line_user_id || ctx.lineUserId;

    // 防重複：同一人同一天只能有一筆日報，避免不小心重複建立又刪不掉
    var dup = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT).some(function(r) {
      return String(r.sales_line_user_id) === String(salesLineUserId) &&
             String(r.report_date).substring(0, 10) === reportDate;
    });
    if (dup) return fail('這天已經提交過日報了，如需修改請先刪除舊的再重新提交');

    var reportId = genId('RPT');
    appendObjectToSheet(CONFIG.SHEETS.DAILY_REPORT, {
      report_id:           reportId,
      report_date:         reportDate,
      project_name:        projectName,
      salesperson:         payload.salesperson || ctx.displayName,
      sales_line_user_id:  salesLineUserId,
      visitor_count:       Number(payload.visitor_count || 0),
      first_visit_count:   Number(payload.first_visit_count || 0),
      revisit_count:       Number(payload.revisit_count || 0),
      call_count:          Number(payload.call_count || 0),
      deal_count:          Number(payload.deal_count || 0),
      transaction_units:   payload.transaction_units || '',
      viewed_units:        payload.viewed_units || '',
      notes:               payload.notes || '',
      created_by:          ctx.displayName,
      created_at:          nowTW()
    });
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.DAILY_REPORT, reportId, ctx.displayName + ' 提交日報');
    return ok({ report_id: reportId });
  } catch (err) { return fail(err.message); }
}

function deleteDailyReport(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('業務無權限');
    if (!payload.report_id) return fail('report_id 必填');

    // 主管只能刪自己提交的日報；admin 可以刪任何人的
    var result = deleteRowById(CONFIG.SHEETS.DAILY_REPORT, 'report_id', payload.report_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.MANAGER &&
            String(row.sales_line_user_id) !== String(ctx.lineUserId)) {
          return '只能刪除自己提交的日報';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到該筆日報');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.DAILY_REPORT,
      payload.report_id, ctx.displayName + ' 刪除日報');
    return ok({ report_id: payload.report_id });
  } catch (err) { return fail(err.message); }
}

// 修改已提交的日報（業績數字、成交戶別、備註），僅限提交後3天內。
// 主管只能改自己提交的日報；admin 可以改任何一筆。用 report_id 精準
// 比對（不是日期+姓名），避免同一人同一天多筆或姓名打法不一致對錯列
function updateDailyReport(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('業務無權限');
    if (!payload.report_id) return fail('report_id 必填');

    var rows = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT);
    var original = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].report_id) === String(payload.report_id)) { original = rows[i]; break; }
    }
    if (!original) return fail('找不到該筆日報');
    if (ctx.role === CONFIG.ROLES.MANAGER && String(original.sales_line_user_id) !== String(ctx.lineUserId)) {
      return fail('只能修改自己提交的日報');
    }

    var reportDate = String(original.report_date).substring(0, 10);
    var diffDays = Math.round((new Date(todayTW() + 'T00:00:00Z') - new Date(reportDate + 'T00:00:00Z')) / 86400000);
    if (diffDays > 3) return fail('此日報已超過3天，無法修改');

    updateRowById(CONFIG.SHEETS.DAILY_REPORT, 'report_id', payload.report_id, {
      visitor_count:     Number(payload.visitor_count || 0),
      first_visit_count: Number(payload.first_visit_count || 0),
      revisit_count:     Number(payload.revisit_count || 0),
      deal_count:        Number(payload.deal_count || 0),
      transaction_units: payload.transaction_units || '',
      notes:             payload.notes || ''
    });
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.DAILY_REPORT, payload.report_id,
      ctx.displayName + ' 修改日報: ' + reportDate);
    return ok({ report_id: payload.report_id });
  } catch (err) { return fail(err.message); }
}

function getDailyReportSummary(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var date = (payload && payload.date) || todayTW();
    var rows = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT).filter(function(r){
      try {
        var rd = Utilities.formatDate(new Date(r.report_date), CONFIG.TIMEZONE, 'yyyy-MM-dd');
        return rd === date && (ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName);
      } catch(e){ return false; }
    });

    var s = { report_date: date, total_visitors: 0, total_first_visit: 0, total_revisit: 0, total_calls: 0, total_deals: 0, reports: rows };
    rows.forEach(function(r){
      s.total_visitors    += Number(r.visitor_count    || 0);
      s.total_first_visit += Number(r.first_visit_count || 0);
      s.total_revisit     += Number(r.revisit_count    || 0);
      s.total_calls       += Number(r.call_count       || 0);
      s.total_deals       += Number(r.deal_count       || 0);
    });
    return ok(s);
  } catch (err) { return fail(err.message); }
}

// ★ 吉隆天曜專屬：日報／月報頁面的來客分布統計，直接統計 Customer_Data
// （居住行政區／來源管道／戶別反應），跟 getDailyReportSummary 同一個
// 權限規則（業務不能看，只有主管/admin 看得到），不用另外手動填寫，
// 直接連動客戶資料表。重新同步時記得保留這兩個函式跟 doGet/doPost
// 裡對應的 case
function countByField(rows, field) {
  var counts = {};
  rows.forEach(function(r) {
    var v = String(r[field] || '').trim();
    if (!v) return;
    counts[v] = (counts[v] || 0) + 1;
  });
  return Object.keys(counts).map(function(k) { return { label: k, count: counts[k] }; })
    .sort(function(a, b) { return b.count - a.count; });
}

// 已介紹產品裡直接掃出「棟別＋戶型」，不管樓層、分隔符號、舊資料的
// 各種寫法（新版下拉選單存的是「A棟1型5樓」，舊資料手動輸入過
// 「A3/13」「A3.B3」「A1-10/5」「A5含車位，B5含車位」等各種格式），
// 統一只看棟別＋戶型分類，樓層/車位/分隔符號一律忽略，這樣新舊資料
// 才能統合成同一種分類（例如 A3/13、A3.B3 的 A3、A2/6 都會歸類成
// 「A棟3型」「A棟2型」）
function countByUnitField(rows) {
  var counts = {};
  var re = /([AB])\s*棟?\s*(\d)/gi;
  rows.forEach(function(r) {
    var raw = String(r.introduced_units || '');
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(raw)) !== null) {
      var key = m[1].toUpperCase() + '棟' + m[2] + '型';
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  return Object.keys(counts).map(function(k) { return { label: k, count: counts[k] }; })
    .sort(function(a, b) { return b.count - a.count; });
}

function getDailyVisitorBreakdown(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var date = String((payload && payload.date) || todayTW()).substring(0, 10);
    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      if (String(r.visit_date).substring(0, 10) !== date) return false;
      return ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName;
    });

    return ok({ total: rows.length, by_district: countByField(rows, 'district'), by_source: countByField(rows, 'source'), by_unit: countByUnitField(rows) });
  } catch (err) { return fail(err.message); }
}

// ★ 吉隆天曜專屬：月報表頁面，統計整個月（YYYY-MM）的接待/初訪/回籠/
// 成交總數，加上跟日報一樣的居住行政區／來源管道／戶別反應分布，
// 直接連動客戶資料表，不用另外手動彙整。權限規則同 getDailyVisitorBreakdown
function getMonthlyVisitorBreakdown(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var month = String((payload && payload.month) || todayTW()).substring(0, 7);
    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      if (String(r.visit_date).substring(0, 7) !== month) return false;
      return ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName;
    });

    return ok({
      month: month,
      total: rows.length,
      first_visit: rows.filter(function(r) { return r.visit_type === '初訪'; }).length,
      revisit: rows.filter(function(r) { return r.visit_type === '回籠'; }).length,
      deal: rows.filter(function(r) { return r.deal_status === '已成交'; }).length,
      by_district: countByField(rows, 'district'),
      by_source: countByField(rows, 'source'),
      by_unit: countByUnitField(rows)
    });
  } catch (err) { return fail(err.message); }
}

// ★ 吉隆天曜專屬：週報表頁面，統計指定週次（startDate~endDate，
// 前端用 ISO 週次換算週一~週日）的接待/初訪/回籠/成交總數，加上跟
// 日報/月報一樣的居住行政區／來源管道／戶別反應分布，權限規則同
// getDailyVisitorBreakdown
function getWeeklyVisitorBreakdown(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var startDate = String((payload && payload.startDate) || todayTW()).substring(0, 10);
    var endDate   = String((payload && payload.endDate)   || todayTW()).substring(0, 10);
    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      var vd = String(r.visit_date).substring(0, 10);
      if (vd < startDate || vd > endDate) return false;
      return ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName;
    });

    return ok({
      start_date: startDate,
      end_date: endDate,
      total: rows.length,
      first_visit: rows.filter(function(r) { return r.visit_type === '初訪'; }).length,
      revisit: rows.filter(function(r) { return r.visit_type === '回籠'; }).length,
      deal: rows.filter(function(r) { return r.deal_status === '已成交'; }).length,
      by_district: countByField(rows, 'district'),
      by_source: countByField(rows, 'source'),
      by_unit: countByUnitField(rows)
    });
  } catch (err) { return fail(err.message); }
}

// ==================== 週報表：客戶接待明細表／本週有望客 ====================
// ★ 吉隆天曜專屬：經理習慣用紙本表格看業務的客戶接待狀況（編號／日期／
// 姓名／電話／區域／媒體／職業／年齡／棟別／回籠／介紹反應／業務），
// 這裡把 Customer_Data 依週次整理成同樣的欄位，讓經理在系統上一眼看到
// 整週接待狀況，不用再翻業務個別的客戶卡片。另外業務每週要挑 1~2 個
// 有望客戶回報，原本靠手寫，這裡改成勾選＋送出，存到 Weekly_Hot_Picks，
// 經理端直接在同一頁看得到誰被標記、備註寫什麼，不用等業務手寫彙整。

var WEEKLY_HOT_PICKS_HEADERS = ['pick_id','week_start','week_end','customer_id','customer_name',
  'phone','project_name','sales_line_user_id','sales_name','note','submitted_at'];

// 會自動補齊缺少的欄位，不會動到既有資料列，跟 ensureDealDetailSheet／
// ensureContactLogSheet 同一套模式
function ensureWeeklyHotPicksSheet() {
  var ss = getCrmSS();
  var name = CONFIG.SHEETS.WEEKLY_HOT_PICKS;
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,WEEKLY_HOT_PICKS_HEADERS.length).setValues([WEEKLY_HOT_PICKS_HEADERS]);
    sh.getRange(1,1,1,WEEKLY_HOT_PICKS_HEADERS.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    Logger.log('✓ Weekly_Hot_Picks 分頁已建立');
    return sh;
  }
  var existing = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var missing = WEEKLY_HOT_PICKS_HEADERS.filter(function(h){ return existing.indexOf(h) < 0; });
  if (missing.length) {
    sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    sh.getRange(1, existing.length + 1, 1, missing.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  }
  return sh;
}

// 經理視角：整理成跟紙本表格一樣的欄位，依日期排序，並標出這筆客戶
// 這週有沒有被業務標記為「有望」。權限規則同 getWeeklyVisitorBreakdown
// （業務不能看，只有主管/admin 看得到整個案場的接待明細）
function getWeeklyReceptionList(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var startDate = String((payload && payload.startDate) || todayTW()).substring(0, 10);
    var endDate   = String((payload && payload.endDate)   || todayTW()).substring(0, 10);
    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      var vd = String(r.visit_date).substring(0, 10);
      if (vd < startDate || vd > endDate) return false;
      return ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName;
    });
    rows.sort(function(a, b) {
      var da = String(a.visit_date).substring(0, 10), db = String(b.visit_date).substring(0, 10);
      return da < db ? -1 : (da > db ? 1 : 0);
    });

    ensureWeeklyHotPicksSheet();
    var picks = readSheetAsObjects(CONFIG.SHEETS.WEEKLY_HOT_PICKS).filter(function(p) {
      return p.week_start === startDate && p.week_end === endDate;
    });
    var pickByCustomerId = {};
    picks.forEach(function(p) { pickByCustomerId[p.customer_id] = p; });

    var results = rows.map(function(r, i) {
      var pick = pickByCustomerId[r.customer_id];
      return {
        seq: i + 1,
        customer_id: r.customer_id,
        visit_date: String(r.visit_date).substring(0, 10),
        customer_name: r.customer_name,
        phone: r.phone,
        district: r.district,
        source: r.source,
        occupation_industry: r.occupation_industry,
        age: r.age,
        introduced_units: r.introduced_units,
        visit_type: r.visit_type,
        linked_customer_name: r.linked_customer_name || '',
        linked_visit_date: r.linked_visit_date ? String(r.linked_visit_date).substring(0, 10) : '',
        status_note: r.status_note,
        sales_name: r.sales_name,
        is_hot_pick: !!pick,
        hot_pick_note: pick ? pick.note : ''
      };
    });

    return ok({ start_date: startDate, end_date: endDate, results: results });
  } catch (err) { return fail(err.message); }
}

// 業務視角：列出自己這週接待過的客戶，供勾選「本週有望客」用，附上
// 目前已經選過的狀態（重新打開頁面時預選回原本勾的那幾筆，方便修改）
function getMyWeekCustomersForPick(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');

    var startDate = String((payload && payload.startDate) || todayTW()).substring(0, 10);
    var endDate   = String((payload && payload.endDate)   || todayTW()).substring(0, 10);
    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      var vd = String(r.visit_date).substring(0, 10);
      if (vd < startDate || vd > endDate) return false;
      return String(r.sales_line_user_id) === String(ctx.lineUserId);
    });
    rows.sort(function(a, b) {
      var da = String(a.visit_date).substring(0, 10), db = String(b.visit_date).substring(0, 10);
      return da < db ? -1 : (da > db ? 1 : 0);
    });

    ensureWeeklyHotPicksSheet();
    var picks = readSheetAsObjects(CONFIG.SHEETS.WEEKLY_HOT_PICKS).filter(function(p) {
      return p.week_start === startDate && p.week_end === endDate &&
        String(p.sales_line_user_id) === String(ctx.lineUserId);
    });
    var pickByCustomerId = {};
    picks.forEach(function(p) { pickByCustomerId[p.customer_id] = p; });

    var results = rows.map(function(r) {
      var pick = pickByCustomerId[r.customer_id];
      return {
        customer_id: r.customer_id,
        visit_date: String(r.visit_date).substring(0, 10),
        customer_name: r.customer_name,
        phone: r.phone,
        status_note: r.status_note,
        picked: !!pick,
        note: pick ? pick.note : ''
      };
    });

    return ok({ start_date: startDate, end_date: endDate, results: results });
  } catch (err) { return fail(err.message); }
}

// 業務送出本週有望客（1~2 位）。同一週重複送出視為「修改這週的選擇」，
// 先清掉這個業務這週原本選的，再存新的一批，不會愈存愈多筆垃圾資料
function submitWeeklyHotPicks(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');

    var startDate = String((payload && payload.startDate) || '').substring(0, 10);
    var endDate   = String((payload && payload.endDate)   || '').substring(0, 10);
    if (!startDate || !endDate) return fail('週次區間必填');

    var customerIds = Array.isArray(payload.customer_ids) ? payload.customer_ids : [];
    customerIds = customerIds.filter(function(id) { return id; });
    if (!customerIds.length) return fail('至少要選 1 位客戶');
    if (customerIds.length > 2) return fail('本週有望客最多選 2 位');

    // 只能選自己這週接待過的客戶，避免有人竄改 payload 選到別人的客戶
    var myRows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      var vd = String(r.visit_date).substring(0, 10);
      return vd >= startDate && vd <= endDate && String(r.sales_line_user_id) === String(ctx.lineUserId);
    });
    var myRowById = {};
    myRows.forEach(function(r) { myRowById[r.customer_id] = r; });
    var invalid = customerIds.filter(function(id) { return !myRowById[id]; });
    if (invalid.length) return fail('選到不是這週自己接待的客戶，請重新整理頁面再選一次');

    ensureWeeklyHotPicksSheet();
    var notes = (payload && payload.notes) || {};

    // 清掉這個業務這週原本選過的舊紀錄
    var existing = readSheetAsObjects(CONFIG.SHEETS.WEEKLY_HOT_PICKS).filter(function(p) {
      return p.week_start === startDate && p.week_end === endDate &&
        String(p.sales_line_user_id) === String(ctx.lineUserId);
    });
    existing.forEach(function(p) { deleteRowById(CONFIG.SHEETS.WEEKLY_HOT_PICKS, 'pick_id', p.pick_id); });

    customerIds.forEach(function(id) {
      var row = myRowById[id];
      appendObjectToSheet(CONFIG.SHEETS.WEEKLY_HOT_PICKS, {
        pick_id: genId('WHP'),
        week_start: startDate,
        week_end: endDate,
        customer_id: id,
        customer_name: row.customer_name,
        phone: row.phone,
        project_name: row.project_name,
        sales_line_user_id: ctx.lineUserId,
        sales_name: ctx.displayName,
        note: notes[id] || '',
        submitted_at: nowTW()
      });
    });

    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.WEEKLY_HOT_PICKS, startDate + '~' + endDate,
      ctx.displayName + ' 送出本週有望客 ' + customerIds.length + ' 位');

    return ok({ submitted: customerIds.length });
  } catch (err) { return fail(err.message); }
}

// 經理視角：本週有望客清單（跨業務彙整），權限規則同 getWeeklyReceptionList
function getWeeklyHotPicks(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var startDate = String((payload && payload.startDate) || todayTW()).substring(0, 10);
    var endDate   = String((payload && payload.endDate)   || todayTW()).substring(0, 10);

    ensureWeeklyHotPicksSheet();
    var picks = readSheetAsObjects(CONFIG.SHEETS.WEEKLY_HOT_PICKS).filter(function(p) {
      if (p.week_start !== startDate || p.week_end !== endDate) return false;
      return ctx.role === CONFIG.ROLES.ADMIN || p.project_name === ctx.projectName;
    });
    picks.sort(function(a, b) { return String(a.sales_name).localeCompare(String(b.sales_name), 'zh-Hant'); });

    return ok({ start_date: startDate, end_date: endDate, results: picks });
  } catch (err) { return fail(err.message); }
}

// ==================== 銷售控制表（戶別銷控） ====================
// ★ 吉隆天曜專屬：全案 105 戶的成交/銷控狀態總表，取代原本用紙本或
// Excel 另外維護的銷控表。狀態只有 5 種：
//   待售　→ 還沒開始談的戶別（預設值）
//   已保留　→ 業務幫客戶留著，需要填「保留至」日期，通常過期要改回待售
//   已收訂　→ 已收訂金，需要填「預計簽約時間」
//   已簽約　→ 正式簽約成交，之後原則上不會再變，除非退戶
//   退戶　→ 已簽約後解約，戶別要重新開放銷售
// 房屋/車位的售價、坪數是業務/主管手動填的，但「銷售總價」「銷售總
// 坪數」「平均單價」一律由後端計算，不接受前端直接改，避免手動加總
// 算錯、也避免前端算完傳上來跟後端資料兜不起來
var SALES_CONTROL_HEADERS = ['unit_id','building','unit_type','floor','unit_label','category','parking_id',
  'status','reserved_until','expected_sign_date','linked_customer_id','linked_customer_name',
  'house_sqft','house_sale_price','parking_sale_price','parking_sqft',
  'total_sale_price','total_sqft','avg_unit_price',
  'created_at','created_by_line_user_id','created_by_name','updated_at'];

var SALES_CONTROL_STATUSES = ['待售','已保留','已收訂','已簽約','退戶'];

// 依 2026/7/6 版銷售講義「戶別規劃表」整理的全案 105 戶清單（住家 104
// 戶＋店面 1 戶），floors 是 [起始樓層, 結束樓層]，seedSalesControlUnits()
// 會展開成一戶一列。sqft 是講義上的「單戶銷售面積」，只用來預填
// house_sqft 方便使用者少打一步，價格/狀態不在這份清單裡、留給使用者
// 之後自己填
var SALES_CONTROL_UNIT_MASTER = [
  { building: 'B', unit_type: '1', floors: [1, 1],  sqft: 68.14, category: '店面' },
  { building: 'A', unit_type: '1', floors: [2, 15], sqft: 34.46, category: '住家' },
  { building: 'A', unit_type: '2', floors: [2, 15], sqft: 36.19, category: '住家' },
  { building: 'A', unit_type: '3', floors: [2, 15], sqft: 26.20, category: '住家' },
  { building: 'A', unit_type: '5', floors: [1, 1],  sqft: 34.06, category: '住家' },
  { building: 'A', unit_type: '5', floors: [2, 15], sqft: 37.83, category: '住家' },
  { building: 'A', unit_type: '6', floors: [1, 1],  sqft: 32.19, category: '住家' },
  { building: 'A', unit_type: '6', floors: [2, 15], sqft: 38.35, category: '住家' },
  { building: 'B', unit_type: '1', floors: [2, 9],  sqft: 24.79, category: '住家' },
  { building: 'B', unit_type: '2', floors: [2, 9],  sqft: 33.26, category: '住家' },
  { building: 'B', unit_type: '3', floors: [2, 2],  sqft: 23.52, category: '住家' },
  { building: 'B', unit_type: '3', floors: [3, 9],  sqft: 26.77, category: '住家' },
  { building: 'B', unit_type: '5', floors: [2, 9],  sqft: 39.13, category: '住家' }
];

// 手動在 Apps Script 編輯器執行一次即可，把上面 105 戶的清單建進
// Sales_Control。用 unit_label 判斷是否已經存在，已經有的戶別不會
// 重複建立，可以放心重複執行（例如清單有補漏再跑一次）
function seedSalesControlUnits() {
  ensureSalesControlSheet();
  var existingLabels = {};
  readSheetAsObjects(CONFIG.SHEETS.SALES_CONTROL).forEach(function(r) { existingLabels[r.unit_label] = true; });

  var added = 0;
  SALES_CONTROL_UNIT_MASTER.forEach(function(group) {
    for (var floor = group.floors[0]; floor <= group.floors[1]; floor++) {
      var unitLabel = group.building + group.unit_type + '/' + floor + 'F';
      if (existingLabels[unitLabel]) continue;
      appendObjectToSheet(CONFIG.SHEETS.SALES_CONTROL, {
        unit_id: genId('UNIT'),
        building: group.building,
        unit_type: group.unit_type,
        floor: floor,
        unit_label: unitLabel,
        category: group.category,
        status: '待售',
        house_sqft: group.sqft,
        created_at: nowTW(),
        created_by_name: '系統匯入（銷售講義）',
        updated_at: nowTW()
      });
      existingLabels[unitLabel] = true;
      added++;
    }
  });
  Logger.log('✓ 完成：新增 ' + added + ' 戶，已存在略過');
}

function ensureSalesControlSheet() {
  var ss = getCrmSS();
  var name = CONFIG.SHEETS.SALES_CONTROL;
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,SALES_CONTROL_HEADERS.length).setValues([SALES_CONTROL_HEADERS]);
    sh.getRange(1,1,1,SALES_CONTROL_HEADERS.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    Logger.log('✓ Sales_Control 分頁已建立');
    return sh;
  }
  var existing = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var missing = SALES_CONTROL_HEADERS.filter(function(h){ return existing.indexOf(h) < 0; });
  if (missing.length) {
    sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    sh.getRange(1, existing.length + 1, 1, missing.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  }
  return sh;
}

// 銷售總價／銷售總坪數／平均單價一律後端算，不含車的算法是「房屋售價
// ÷房屋坪數」；有車位的話銷售總價／總坪數會把車位一起併進去，平均
// 單價也改成「銷售總價÷（房屋坪數+車位坪數）」——這是主管指定的算法
function computeSalesControlDerived_(row) {
  var houseSalePrice = Number(row.house_sale_price) || 0;
  var houseSqft = Number(row.house_sqft) || 0;
  var parkingSalePrice = Number(row.parking_sale_price) || 0;
  var parkingSqft = Number(row.parking_sqft) || 0;
  // 銷售總價／總坪數不用判斷有沒有車位，直接房屋+車位相加就好——沒
  // 填車位的話車位售價/坪數本來就是 0，加了也不影響結果
  var totalSalePrice = houseSalePrice + parkingSalePrice;
  var totalSqft = houseSqft + parkingSqft;
  // 平均單價才需要分「有沒有車位」兩種算法：沒車位就是房屋售價/房屋
  // 坪數；有車位（車位售價或坪數任一有填）就改成銷售總價/銷售總坪數
  var hasParking = parkingSalePrice > 0 || parkingSqft > 0;
  var avgBase = hasParking ? totalSalePrice : houseSalePrice;
  var avgDivisor = hasParking ? totalSqft : houseSqft;
  var avgUnitPrice = avgDivisor ? Math.round((avgBase / avgDivisor) * 100) / 100 : 0;

  return { total_sale_price: totalSalePrice, total_sqft: totalSqft, avg_unit_price: avgUnitPrice };
}

// 狀態關聯的必填欄位檢查：已保留要填保留至、已收訂要填預計簽約時間，
// 避免選了狀態卻忘記填對應的日期，畫面上看不出「保留到什麼時候」
function validateSalesControlStatus_(status, reservedUntil, expectedSignDate) {
  if (SALES_CONTROL_STATUSES.indexOf(status) < 0) return '狀態不正確';
  if (status === '已保留' && !reservedUntil) return '狀態選「已保留」時，保留至日期必填';
  if (status === '已收訂' && !expectedSignDate) return '狀態選「已收訂」時，預計簽約時間必填';
  return null;
}

// 銷控表全案共用，任何角色（含業務）都看得到，方便業務跟客戶談的時候
// 直接查戶別狀態跟價格；只有 manager/admin 才能新增/編輯/刪除
function getSalesControlList(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');

    ensureSalesControlSheet();
    var rows = readSheetAsObjects(CONFIG.SHEETS.SALES_CONTROL);
    rows.sort(function(a, b) {
      if (a.building !== b.building) return String(a.building).localeCompare(String(b.building));
      if (Number(a.floor) !== Number(b.floor)) return Number(a.floor) - Number(b.floor);
      return String(a.unit_type).localeCompare(String(b.unit_type));
    });

    return ok({ results: rows });
  } catch (err) { return fail(err.message); }
}

function appendSalesControlUnit(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限，需主管以上');
    if (!payload.building || !payload.unit_type || !payload.floor) return fail('棟別/型別/樓層必填');

    var status = payload.status || '待售';
    var validateErr = validateSalesControlStatus_(status, payload.reserved_until, payload.expected_sign_date);
    if (validateErr) return fail(validateErr);

    ensureSalesControlSheet();
    var unitId = genId('UNIT');
    var row = {
      unit_id: unitId,
      building: payload.building,
      unit_type: payload.unit_type,
      floor: payload.floor,
      unit_label: payload.building + payload.unit_type + '/' + payload.floor + 'F',
      parking_id: payload.parking_id || '',
      status: status,
      reserved_until: status === '已保留' ? payload.reserved_until : '',
      expected_sign_date: status === '已收訂' ? payload.expected_sign_date : '',
      house_sqft: payload.house_sqft || '',
      house_sale_price: payload.house_sale_price || '',
      parking_sale_price: payload.parking_sale_price || '',
      parking_sqft: payload.parking_sqft || '',
      created_at: nowTW(),
      created_by_line_user_id: ctx.lineUserId,
      created_by_name: ctx.displayName,
      updated_at: nowTW()
    };
    var derived = computeSalesControlDerived_(row);
    row.total_sale_price = derived.total_sale_price;
    row.total_sqft = derived.total_sqft;
    row.avg_unit_price = derived.avg_unit_price;

    appendObjectToSheet(CONFIG.SHEETS.SALES_CONTROL, row);
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.SALES_CONTROL, unitId,
      ctx.displayName + ' 新增銷控戶別: ' + row.unit_label);
    return ok({ unit_id: unitId });
  } catch (err) { return fail(err.message); }
}

function updateSalesControlUnit(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限，需主管以上');
    if (!payload.unit_id) return fail('unit_id 必填');

    ensureSalesControlSheet();
    var rows = readSheetAsObjects(CONFIG.SHEETS.SALES_CONTROL);
    var original = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].unit_id) === String(payload.unit_id)) { original = rows[i]; break; }
    }
    if (!original) return fail('找不到這個戶別');

    var status = payload.status || original.status;
    var reservedUntil = status === '已保留' ? payload.reserved_until : '';
    var expectedSignDate = status === '已收訂' ? payload.expected_sign_date : '';
    var validateErr = validateSalesControlStatus_(status, reservedUntil, expectedSignDate);
    if (validateErr) return fail(validateErr);

    var merged = {
      house_sale_price:   payload.house_sale_price   !== undefined ? payload.house_sale_price   : original.house_sale_price,
      house_sqft:          payload.house_sqft          !== undefined ? payload.house_sqft          : original.house_sqft,
      parking_sale_price: payload.parking_sale_price !== undefined ? payload.parking_sale_price : original.parking_sale_price,
      parking_sqft:        payload.parking_sqft        !== undefined ? payload.parking_sqft        : original.parking_sqft,
      parking_id:          payload.parking_id          !== undefined ? payload.parking_id          : original.parking_id
    };
    var derived = computeSalesControlDerived_(merged);

    var updates = {
      status: status,
      reserved_until: reservedUntil,
      expected_sign_date: expectedSignDate,
      parking_id: merged.parking_id,
      house_sqft: merged.house_sqft,
      house_sale_price: merged.house_sale_price,
      parking_sale_price: merged.parking_sale_price,
      parking_sqft: merged.parking_sqft,
      total_sale_price: derived.total_sale_price,
      total_sqft: derived.total_sqft,
      avg_unit_price: derived.avg_unit_price,
      updated_at: nowTW()
    };
    updateRowById(CONFIG.SHEETS.SALES_CONTROL, 'unit_id', payload.unit_id, updates);
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.SALES_CONTROL, payload.unit_id,
      ctx.displayName + ' 修改銷控戶別 ' + original.unit_label + '，狀態：' + status);
    return ok({ unit_id: payload.unit_id });
  } catch (err) { return fail(err.message); }
}

function deleteSalesControlUnit(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限，需主管以上');
    if (!payload.unit_id) return fail('unit_id 必填');

    var result = deleteRowById(CONFIG.SHEETS.SALES_CONTROL, 'unit_id', payload.unit_id);
    if (result.notFound) return fail('找不到這個戶別');

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.SALES_CONTROL, payload.unit_id,
      ctx.displayName + ' 刪除銷控戶別 ' + (result.row ? result.row.unit_label : payload.unit_id));
    return ok({ unit_id: payload.unit_id });
  } catch (err) { return fail(err.message); }
}

// ==================== 精確定位熱點地圖：地址轉座標 ====================
// ★ 吉隆天曜專屬：業務把客戶的「詳細地址」填得夠完整後，這裡把地址
// 轉成經緯度座標存回 Customer_Data（geo_lat／geo_lng 兩欄，屬於
// CUSTOMER_EXTRA_FIELDS，ensureCustomerExtraColumns 會自動補欄位）。
//
// 用 Nominatim（OpenStreetMap 的免費地址查詢服務）做地址轉座標，不用
// 申請 API 金鑰、不用綁信用卡，跟熱點地圖的地圖底圖（Leaflet+OSM）
// 同一個生態系。但 Nominatim 的免費用量政策規定「每秒最多 1 次查詢」，
// 所以刻意不放在 appendCustomerData／updateCustomerData 裡即時轉換
// （那樣會拖慢建檔速度，甚至可能重新踩到 v9.11 修過的「逾時重試造成
// 重複建檔」那個坑）。改成用批次函式 geocodeMissingAddresses，搭配
// 排程觸發器（見 setupTriggers）固定時間自動跑，新填的地址最多等到
// 下次觸發器執行就會補上座標，不影響客戶登記/編輯的即時操作。

// 呼叫 Nominatim 把地址轉成 { lat, lng }，查不到回傳 null。加上
// 「高雄市」當作查詢上下文，提高命中率（大部分地址只寫到路名門牌，
// 沒特別註明縣市）
// 真正打 Nominatim 查詢的部分，query 是完整要查的文字（已經包含「高雄市」）
// 回傳 { geo, reason }：geo 查到就有值，reason 只在查不到時填，用來
// 分辨「Nominatim 真的查無資料（HTTP 200，空陣列）」還是「請求被擋掉
// 了（非 200，例如 403/429）」。GAS 送出的請求都是從 Google 共用雲端
// IP 發出，Nominatim 這個免費公用服務對這種來源比較容易限流／拒絕，
// 之前沒有分開記錄這兩種情況，沒辦法判斷「查不到」到底是地址真的有
// 問題、還是被服務端擋掉，這次補上
// ★ 實測發現絕大多數「查不到座標」其實是 HTTP 429（太多請求），不是
// 地址問題——GAS 送出的請求都是從 Google 共用雲端 IP 發出，Nominatim
// 這個免費公用服務對這種來源的限流比想像中嚴格，原本每筆之間 sleep
// 1.1 秒（官方政策寫的「每秒最多 1 次」）顯然不夠。改成收到 429 的話
// 用漸增等待時間（3秒／6秒）原地重試最多 3 次，撐過短暫的限流狀態
function geocodeQuery_(query) {
  var maxAttempts = 3;
  for (var attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tw&q=' + encodeURIComponent(query);
      var resp = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: { 'User-Agent': 'LongdomCRM-jltx/1.0 (internal use)' },
        muteHttpExceptions: true
      });
      var code = resp.getResponseCode();
      if (code === 429 && attempt < maxAttempts) {
        Utilities.sleep(attempt * 3000); // 3秒、6秒漸增等待
        continue;
      }
      if (code !== 200) {
        var reason = 'HTTP ' + code + '（可能被 Nominatim 限流/擋掉，不是地址問題）';
        Logger.log('geocodeQuery_ 非 200（' + query + '）：' + reason + '　回應：' + resp.getContentText().substring(0, 200));
        return { geo: null, reason: reason };
      }
      var data = JSON.parse(resp.getContentText());
      if (!data || !data.length) return { geo: null, reason: 'Nominatim 查無結果' };
      return { geo: { lat: Number(data[0].lat), lng: Number(data[0].lon) }, reason: null };
    } catch (err) {
      Logger.log('geocodeQuery_ 例外（' + query + '）：' + err);
      return { geo: null, reason: '例外：' + err };
    }
  }
}

// 從地址裡截出「到路名/街名為止」的部分，門牌號碼、巷弄、樓層都拿掉。
// 例：「博愛路100號5樓」「博愛二路100巷5號」都會截成「博愛路」/「博愛二路」
function extractRoadName_(address) {
  var m = String(address).match(/^.*?(路|街|大道)/);
  return m ? m[0] : null;
}

// 拿掉門牌後面的樓層/室號（例：「琉球路168號3樓-5」→「琉球路168號」，
// 「大豐二路225號10樓」→「大豐二路225號」），Nominatim 通常不認得
// 樓層資訊，留著反而可能讓查詢失敗
function stripFloorSuffix_(address) {
  return String(address).replace(/\d+\s*[樓Ff].*$/, '').trim();
}

// 組合真正要拿去查詢的地址字串。業務登記時常常直接把「完整地址（含
// 市/區）」打進「詳細地址」欄位，如果這裡再把「行政區」欄位疊上去，
// 會變成「大寮區大寮區開封街…」這種重複，甚至「大寮區高雄市三民區…」
// 這種行政區互相矛盾的怪字串，導致 Nominatim 完全查不到——這是目前
// 「查不到座標」最大宗的原因，不是地址本身有問題，是重複疊加造成的。
// 判斷規則：
//   - 詳細地址裡已經有「市」「區」「縣」「鄉」「鎮」任一個字 → 代表
//     打了完整地址（含高雄市之外的縣市，如「屏東縣萬丹鄉」），直接
//     用，不疊加。之前只檢查「市」「區」兩個字，漏了「縣」「鄉」
//     「鎮」，導致外縣市地址被誤判成「純路名門牌」，疊加上（錯誤的）
//     高雄市行政區，變成「高雄市大寮區屏東縣萬丹鄉…」這種矛盾字串
//   - 完全沒有上述任何字（純路名門牌）→ 用「行政區」欄位組（外縣市的
//     話取「外縣市：」後面實際打的縣市名，不是高雄市底下的行政區）
function buildGeocodeAddress_(district, detailedAddress) {
  var addr = String(detailedAddress || '').trim();
  if (!addr) return '';
  if (/[市區縣鄉鎮]/.test(addr)) return addr;
  var dist = String(district || '').replace(/^外縣市[：:]\s*/, '');
  if (!dist) return addr;
  var cityPrefix = (dist.indexOf('市') >= 0 || dist.indexOf('縣') >= 0) ? '' : '高雄市';
  return cityPrefix + dist + addr;
}

// 先查完整地址；查不到的話依序退兩步再試：
//   1. 拿掉樓層/室號後再查一次（常見門牌本身查得到，樓層資訊反而
//      讓 Nominatim 判斷失敗）
//   2. 只查到路名為止，抓這條路的概略中心點當精確位置用（常見是只
//      寫了路名沒門牌號碼，或門牌太新 OSM 資料庫還沒收錄），比完全
//      查不到、整筆掉回行政區層級好
function geocodeAddress_(address) {
  if (!address) return { geo: null, reason: '地址空白' };
  var r1 = geocodeQuery_(address);
  if (r1.geo) return r1;
  var lastReason = r1.reason;

  var noFloor = stripFloorSuffix_(address);
  if (noFloor && noFloor !== address) {
    Utilities.sleep(2000); // 拉長到 2 秒，降低整體請求頻率，減少被限流的機率
    var r2 = geocodeQuery_(noFloor);
    if (r2.geo) return r2;
    lastReason = r2.reason;
  }

  var roadName = extractRoadName_(address);
  if (roadName && roadName !== address) {
    Utilities.sleep(2000);
    var r3 = geocodeQuery_(roadName);
    if (r3.geo) return r3;
    lastReason = r3.reason;
  }
  return { geo: null, reason: lastReason };
}

// 批次幫「有填詳細地址、但還沒有座標」的客戶資料轉座標，寫回
// geo_lat／geo_lng。手動在 Apps Script 編輯器執行，或掛在
// setupTriggers 的排程觸發器上自動跑。每筆之間 sleep 2 秒（比 Nominatim
// 官方政策「每秒最多 1 次查詢」更保守，實測 1.1 秒常常還是被 429 限流），
// 一次執行最多處理 maxCount 筆（預設 200），避免單次執行時間超過 GAS
// 6 分鐘上限；因為每筆間隔變長，實際能處理的筆數會比之前少，但會靠
// 每小時的排程觸發器持續補上，不用擔心處理不完
function geocodeMissingAddresses(maxCount) {
  maxCount = maxCount || 200;
  ensureCustomerExtraColumns();
  var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
    return r.detailed_address && (!r.geo_lat || !r.geo_lng);
  });
  Logger.log('待轉座標：' + rows.length + ' 筆，這次最多處理 ' + maxCount + ' 筆');

  var done = 0, failed = 0, failedList = [];
  for (var i = 0; i < rows.length && done + failed < maxCount; i++) {
    var r = rows[i];
    var fullAddress = buildGeocodeAddress_(r.district, r.detailed_address);
    var result = geocodeAddress_(fullAddress);
    if (result.geo) {
      updateRowById(CONFIG.SHEETS.CUSTOMER, 'customer_id', r.customer_id, {
        geo_lat: result.geo.lat, geo_lng: result.geo.lng
      });
      done++;
    } else {
      failed++;
      // 只記總數看不出是哪幾筆、為什麼查不到，之前這樣 log 完全沒辦法
      // 排查，改成把每一筆查不到的客戶姓名＋實際拿去查詢的地址＋失敗
      // 原因都印出來。原因如果是「HTTP 403/429」代表被 Nominatim 限流
      // 擋掉，不是地址本身的問題，換個時間重跑通常就會好；如果是
      // 「查無結果」才是地址本身要修正（巷弄沒門牌號碼／新建案 OSM
      // 還沒收錄／地址打錯字）
      failedList.push(r.customer_name + '（' + r.customer_id + '）：' + fullAddress + '　[' + (result.reason || '未知原因') + ']');
    }
    Utilities.sleep(2000);
  }
  Logger.log('✓ 完成：成功 ' + done + ' 筆，查不到座標 ' + failed + ' 筆');
  if (failedList.length) {
    Logger.log('查不到座標的清單（方括號是失敗原因；如果是 HTTP 403/429 代表被\n' +
      'Nominatim 限流擋掉不是地址問題，換個時間重跑通常會好；如果是「查無\n' +
      '結果」才需要去 Customer_Data 修正 detailed_address 後重跑一次）：\n' +
      failedList.join('\n'));
  }
}

// 週報表「來人熱點地圖」用：撈出這個日期區間內、已經有精確座標的
// 客戶清單，疊在行政區泡泡地圖上當作精確定位點。權限規則同
// getWeeklyReceptionList（主管/admin 才看得到）
// 除了已經轉出座標的精確點，這裡也一併回傳「有填詳細地址、但還沒轉出
// 座標」的統計（pending，依行政區分組）。之前地圖只分「有精確座標」
// 跟「其他」兩種，「其他」裡其實混了兩種完全不同的狀況：真的沒填
// 詳細地址、跟填了地址但還在排隊等轉換（或轉換失敗）。使用者反應
// 「明明有填地址，點數卻對不起來」，就是被這個混在一起的分類誤導，
// 這裡拆開讓前端可以分開標示
function getGeoPoints(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var startDate = String((payload && payload.startDate) || todayTW()).substring(0, 10);
    var endDate   = String((payload && payload.endDate)   || todayTW()).substring(0, 10);
    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      var vd = String(r.visit_date).substring(0, 10);
      if (vd < startDate || vd > endDate) return false;
      return ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName;
    });

    var results = rows.filter(function(r) { return r.geo_lat && r.geo_lng; }).map(function(r) {
      return {
        customer_name: r.customer_name,
        district: r.district,
        lat: Number(r.geo_lat),
        lng: Number(r.geo_lng)
      };
    });

    var pendingByDistrict = {};
    rows.forEach(function(r) {
      if (r.detailed_address && (!r.geo_lat || !r.geo_lng)) {
        pendingByDistrict[r.district] = (pendingByDistrict[r.district] || 0) + 1;
      }
    });
    var pending = Object.keys(pendingByDistrict).map(function(k) { return { label: k, count: pendingByDistrict[k] }; });

    return ok({ start_date: startDate, end_date: endDate, results: results, pending: pending });
  } catch (err) { return fail(err.message); }
}

// 銷售日報歷史區間查詢（近3~6個月歷史清單／週比較／月比較 用）
function getDailyReportRange(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var months = Math.max(1, Math.min(12, Number(payload && payload.months) || 3));
    var cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    var cutoff = Utilities.formatDate(cutoffDate, CONFIG.TIMEZONE, 'yyyy-MM-dd');

    var rows = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT).filter(function(r) {
      var rd = String(r.report_date || '').substring(0, 10);
      if (!rd || rd < cutoff) return false;
      return ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName;
    });

    rows.sort(function(a, b) { return String(a.report_date).localeCompare(String(b.report_date)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// ==================== Maintenance Module ====================
// 確保 Maintenance_Report 分頁有 photo_url 這個欄位（既有分頁可能是
// 更早之前建立的，沒有這個欄位），沒有的話自動補上，不會動到既有資料
// 確保 Maintenance_Report 分頁有 photo_url／priority 這兩個欄位（既有
// 分頁可能是更早之前建立的，沒有這兩個欄位），沒有的話自動補上，
// 不會動到既有資料。priority 欄位補上是因為之前 appendMaintenance
// 漏掉沒寫，前端表單選的優先度其實一直沒有被存進去，這次一併修正。
function ensureMaintenancePhotoColumn() {
  var sh = getSheet(CONFIG.SHEETS.MAINTENANCE);
  if (!sh) return;
  var need = ['photo_url', 'priority'];
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var missing = need.filter(function(h){ return headers.indexOf(h) < 0; });
  if (!missing.length) return;
  sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
}

// 上傳維修通報的現場照片：base64 圖片資料先存進 Google Drive，
// 回傳可公開檢視的網址，前端再把這個網址帶進 appendMaintenance 的
// photo_url 欄位。因為圖片資料量大，這支一定要透過真正的 POST
// （gasPostJson）呼叫，不能走原本 GET+payload 那一套（網址長度會爆掉）。
function uploadMaintenancePhoto(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.photo_base64) return fail('缺少照片資料');

    var mimeType = payload.mime_type || 'image/jpeg';
    var ext = mimeType.indexOf('png') >= 0 ? 'png' : 'jpg';
    var bytes = Utilities.base64Decode(payload.photo_base64);
    var blob = Utilities.newBlob(bytes, mimeType, 'maint_' + Date.now() + '.' + ext);

    var folderName = '維修通報照片';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.MAINTENANCE, file.getId(), ctx.displayName + ' 上傳維修照片');
    return ok({ photo_url: url });
  } catch (err) { return fail('照片上傳失敗：' + err.message); }
}

function appendMaintenance(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.issue_type)  return fail('問題類型必填');
    if (!payload.description) return fail('問題描述必填');

    var projectName = ctx.role === CONFIG.ROLES.ADMIN
      ? (payload.project_name || ctx.projectName || '') : ctx.projectName;
    if (!projectName) return fail('案場未指定');

    ensureMaintenancePhotoColumn();

    var maintId = genId('MAINT');
    appendObjectToSheet(CONFIG.SHEETS.MAINTENANCE, {
      maintenance_id:          maintId,
      project_name:            projectName,
      location:                payload.location || '',
      issue_type:              payload.issue_type,
      description:             payload.description,
      priority:                payload.priority || 'normal',
      photo_url:               payload.photo_url || '',
      reported_by:             ctx.displayName,
      reported_by_line_user_id: ctx.lineUserId,
      assigned_to:             payload.assigned_to || '',
      status:                  CONFIG.STATUS.PENDING,
      created_at:              nowTW(),
      updated_at:              nowTW(),
      completed_at:            ''
    });

    var token      = getProp(CONFIG.PROP_KEYS.LINE_TOKEN);
    var pushTarget = getProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET);
    if (token && pushTarget) {
      sendLinePushToAll(
        '案場：' + CONFIG.PROJECT_NAME + '\n🔧 維修通報\n位置：' + (payload.location || '未指定') +
        (projectName !== CONFIG.PROJECT_NAME ? '\n子案場：' + projectName : '') +
        '\n類型：' + payload.issue_type +
        '\n描述：' + payload.description +
        '\n通報人：' + ctx.displayName);
    }
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.MAINTENANCE, maintId, ctx.displayName + ' 通報: ' + payload.issue_type);
    return ok({ maintenance_id: maintId });
  } catch (err) { return fail(err.message); }
}

function getMaintenanceList(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    var rows = readSheetAsObjects(CONFIG.SHEETS.MAINTENANCE);
    if (ctx.role === CONFIG.ROLES.SALES) {
      rows = rows.filter(function(r){ return r.project_name === ctx.projectName && String(r.reported_by_line_user_id) === String(ctx.lineUserId); });
    } else if (ctx.role === CONFIG.ROLES.MANAGER) {
      rows = rows.filter(function(r){ return r.project_name === ctx.projectName; });
    }
    rows.sort(function(a,b){ return String(b.created_at).localeCompare(String(a.created_at)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function updateMaintenanceStatus(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.maintenance_id) return fail('maintenance_id 必填');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var updates = { status: payload.status || CONFIG.STATUS.DONE, updated_at: nowTW() };
    if (payload.status === CONFIG.STATUS.DONE) updates.completed_at = nowTW();

    updateRowById(CONFIG.SHEETS.MAINTENANCE, 'maintenance_id', payload.maintenance_id, updates);
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.MAINTENANCE, payload.maintenance_id,
      ctx.displayName + ' 變更維修狀態: ' + (payload.status || 'done'));
    return ok({ maintenance_id: payload.maintenance_id });
  } catch (err) { return fail(err.message); }
}

// 修改維修通報內容（問題類型／位置／描述／優先度／照片），跟
// updateMaintenanceStatus 分開，那支只改處理狀態。業務只能改自己
// 通報的，主管/admin 可以改任何一筆。
function updateMaintenance(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.maintenance_id) return fail('maintenance_id 必填');

    var sh = getSheet(CONFIG.SHEETS.MAINTENANCE);
    if (!sh) return fail('找不到 Maintenance_Report 分頁');
    var data = sh.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('maintenance_id');
    var reportedByCol = headers.indexOf('reported_by_line_user_id');

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(payload.maintenance_id)) { rowIndex = i; break; }
    }
    if (rowIndex < 0) return fail('找不到該筆維修通報');
    if (ctx.role === CONFIG.ROLES.SALES && String(data[rowIndex][reportedByCol]) !== String(ctx.lineUserId)) {
      return fail('只能修改自己通報的維修');
    }

    ensureMaintenancePhotoColumn();
    var updates = { updated_at: nowTW() };
    if (payload.issue_type != null)  updates.issue_type = payload.issue_type;
    if (payload.location != null)    updates.location = payload.location;
    if (payload.description != null) updates.description = payload.description;
    if (payload.priority != null)    updates.priority = payload.priority;
    if (payload.photo_url)           updates.photo_url = payload.photo_url;

    updateRowById(CONFIG.SHEETS.MAINTENANCE, 'maintenance_id', payload.maintenance_id, updates);
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.MAINTENANCE, payload.maintenance_id,
      ctx.displayName + ' 修改維修通報');
    return ok({ maintenance_id: payload.maintenance_id });
  } catch (err) { return fail(err.message); }
}

function deleteMaintenance(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.maintenance_id) return fail('maintenance_id 必填');

    // 業務只能刪自己通報的維修；主管/admin 可以刪任何一筆
    var result = deleteRowById(CONFIG.SHEETS.MAINTENANCE, 'maintenance_id', payload.maintenance_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.SALES &&
            String(row.reported_by_line_user_id) !== String(ctx.lineUserId)) {
          return '只能刪除自己通報的維修';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到該筆維修通報');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.MAINTENANCE, payload.maintenance_id,
      ctx.displayName + ' 刪除維修通報: ' + result.row.issue_type);
    return ok({ maintenance_id: payload.maintenance_id });
  } catch (err) { return fail(err.message); }
}

// ==================== Leave Schedule Module ====================
function getLeaveSchedule(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');

    var startDate = String(payload.startDate || '').substring(0, 10);
    var endDate   = String(payload.endDate   || '').substring(0, 10);

    var rows = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE).filter(function(r) {
      var d = String(r.leave_date).substring(0, 10);
      if (startDate && d < startDate) return false;
      if (endDate   && d > endDate)   return false;
      return true;
    });

    rows.sort(function(a, b) {
      return String(a.leave_date).localeCompare(String(b.leave_date));
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function getTodayLeave(lineUserId) {
  try {
    var ctx = getUserContext(lineUserId);
    if (!ctx) return fail('未授權');
    var today = todayTW().substring(0, 10);
    var rows  = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE).filter(function(r) {
      return String(r.leave_date).substring(0, 10) === today;
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function appendLeave(payload) {
  // ★ 吉隆天曜專屬排假限制：平日（一~五）單日最多 2 人休假，六日禁休
  // （除非由主管/admin 排假）。用 LockService 鎖住，避免同時送出時
  // 兩筆request 都讀到「還沒滿」而一起超額。
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');

    var targetUid  = payload.targetLineUserId  || ctx.lineUserId;
    var targetName = payload.targetDisplayName || ctx.displayName;
    var dates      = Array.isArray(payload.dates) ? payload.dates : [payload.dates];
    if (!dates.length) return fail('dates 必填');

    // 權限：業務只能排自己；主管/admin 可排任何人
    if (ctx.role === CONFIG.ROLES.SALES && targetUid !== ctx.lineUserId) {
      return fail('業務只能排自己的假');
    }

    // 案場一律以「被排假的人」自己的案場為準，不要用操作者（可能是不綁案場的
    // admin）自己的案場，否則寫進去的紀錄會因為案場對不上而在當事人自己的
    // 行事曆上完全不顯示
    var projectName = ctx.projectName;
    if (targetUid !== ctx.lineUserId) {
      var targetCtxForProject = getUserContext(targetUid);
      if (targetCtxForProject) projectName = targetCtxForProject.projectName || projectName;
    }
    projectName = projectName || payload.project_name || '';

    var allLeaves = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE);
    var existingDates = {};
    allLeaves.forEach(function(r) {
      if (String(r.line_user_id) === String(targetUid)) existingDates[String(r.leave_date).substring(0,10)] = true;
    });

    var added = 0;
    var blockedWeekend = [];
    var blockedFull = [];
    dates.forEach(function(d) {
      var ds = String(d).substring(0, 10);
      if (existingDates[ds]) return; // 已存在跳過

      var dow = new Date(ds + 'T00:00:00').getDay(); // 0=日 6=六
      if (dow === 0 || dow === 6) {
        // 六日禁休，除非是主管/admin 幫忙排假
        if (ctx.role === CONFIG.ROLES.SALES) { blockedWeekend.push(ds); return; }
      } else {
        // 平日單日最多 2 人（含這批次前面已經加進去的）
        var countThatDay = allLeaves.filter(function(r) {
          return String(r.leave_date).substring(0,10) === ds;
        }).length;
        if (countThatDay >= 2) { blockedFull.push(ds); return; }
      }

      appendObjectToSheet(CONFIG.SHEETS.LEAVE_SCHEDULE, {
        leave_id:              genId('LV'),
        line_user_id:          targetUid,
        display_name:          targetName,
        project_name:          projectName,
        leave_date:            ds,
        created_by_line_user_id: ctx.lineUserId,
        created_at:            nowTW()
      });
      allLeaves.push({ leave_date: ds, line_user_id: targetUid }); // 讓同批次後面的日期也算進當日人數
      added++;
    });

    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.LEAVE_SCHEDULE, targetUid,
      ctx.displayName + ' 排假 ' + targetName + ' x' + added + ' 天');

    var msgParts = [];
    if (blockedWeekend.length) msgParts.push('六日禁休（除非主管排假）：' + blockedWeekend.join('、'));
    if (blockedFull.length) msgParts.push('當日已達 2 人上限：' + blockedFull.join('、'));

    return ok({ added: added, blocked: blockedWeekend.concat(blockedFull), message: msgParts.join('；') });
  } catch (err) { return fail(err.message); } finally { lock.releaseLock(); }
}

function deleteLeave(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.leave_id) return fail('leave_id 必填');

    // 業務只能刪自己的
    var result = deleteRowById(CONFIG.SHEETS.LEAVE_SCHEDULE, 'leave_id', payload.leave_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.SALES &&
            String(row.line_user_id) !== String(ctx.lineUserId)) {
          return '只能取消自己的假';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到該筆假別');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.LEAVE_SCHEDULE,
      payload.leave_id, ctx.displayName + ' 取消排假');
    return ok({ leave_id: payload.leave_id });
  } catch (err) { return fail(err.message); }
}

// ==================== Calendar Notes（行事曆重要事項） ====================
// ★ 既有帳號升級用：只新增 Calendar_Notes 分頁，不會動到其他分頁的資料
function ensureCalendarNotesSheet() {
  var ss = getCrmSS();
  var name = CONFIG.SHEETS.CALENDAR_NOTES;
  var sh = ss.getSheetByName(name);
  if (sh) { Logger.log('Calendar_Notes 已存在，不需要重建'); return; }
  sh = ss.insertSheet(name);
  var headers = ['note_id','project_name','note_date','content','created_by_line_user_id','created_by_name','created_at'];
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  Logger.log('✓ Calendar_Notes 分頁已建立');
}

function getCalendarNotes(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');

    var startDate = String(payload.startDate || '').substring(0, 10);
    var endDate   = String(payload.endDate   || '').substring(0, 10);

    var rows = readSheetAsObjects(CONFIG.SHEETS.CALENDAR_NOTES).filter(function(r) {
      var d = String(r.note_date).substring(0, 10);
      if (startDate && d < startDate) return false;
      if (endDate   && d > endDate)   return false;
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      return r.project_name === ctx.projectName;
    });

    rows.sort(function(a, b) { return String(a.note_date).localeCompare(String(b.note_date)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function addCalendarNote(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限，需主管以上');
    if (!payload.note_date) return fail('note_date 必填');
    if (!payload.content)   return fail('內容必填');

    var projectName = ctx.role === CONFIG.ROLES.ADMIN
      ? (payload.project_name || ctx.projectName || '') : ctx.projectName;

    var noteId = genId('NOTE');
    appendObjectToSheet(CONFIG.SHEETS.CALENDAR_NOTES, {
      note_id: noteId,
      project_name: projectName,
      note_date: String(payload.note_date).substring(0, 10),
      content: payload.content,
      created_by_line_user_id: ctx.lineUserId,
      created_by_name: ctx.displayName,
      created_at: nowTW()
    });
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.CALENDAR_NOTES, noteId,
      ctx.displayName + ' 新增重要事項: ' + payload.content);
    return ok({ note_id: noteId });
  } catch (err) { return fail(err.message); }
}

function deleteCalendarNote(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');
    if (!payload.note_id) return fail('note_id 必填');

    var result = deleteRowById(CONFIG.SHEETS.CALENDAR_NOTES, 'note_id', payload.note_id);
    if (result.notFound) return fail('找不到該筆事項');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.CALENDAR_NOTES,
      payload.note_id, ctx.displayName + ' 刪除重要事項');
    return ok({ note_id: payload.note_id });
  } catch (err) { return fail(err.message); }
}

// ★ 吉隆天曜專屬：跟天地不一樣，這裡「不」排除 SKY 陳昭文（天地會
// 排除，吉隆天曜要把他的休假也一起算進通報裡）。重新同步時記得保留
// 這個差異，不要被天地的版本覆蓋掉
// ★ 產生下週休假通報，並推播給案場管理員
function generateWeeklyLeaveReport(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role !== CONFIG.ROLES.ADMIN) return fail('無權限，僅限管理員');

    // 計算下週一~下週日
    var now = new Date();
    var dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    var thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    var nextMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 7);

    var days = [];
    for (var i = 0; i < 7; i++) {
      days.push(new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate() + i));
    }

    var rows = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE);

    var wd = ['日','一','二','三','四','五','六'];
    var lines = [];
    days.forEach(function(d, idx) {
      var ds = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
      var isWeekend = idx >= 5;
      var names = rows.filter(function(r) {
        return String(r.leave_date).substring(0, 10) === ds;
      }).map(function(r) { return r.display_name; });

      if (isWeekend && !names.length) return;

      var label = d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate() + '(' + wd[d.getDay()] + ')';
      lines.push(label + '　休假人員　' + (names.length ? names.join(' ') : '無'));
    });

    var rangeLabel = Utilities.formatDate(days[0], CONFIG.TIMEZONE, 'yyyy/M/d') + '~' + Utilities.formatDate(days[6], CONFIG.TIMEZONE, 'yyyy/M/d');
    var msg = '案場：' + CONFIG.PROJECT_NAME + '\n📋 下週休假通報（' + rangeLabel + '）\n\n' + lines.join('\n');

    var pushed = sendLinePushToAll(msg);

    writeAuditLog(ctx.lineUserId, 'CREATE', 'WeeklyLeaveReport', rangeLabel, ctx.displayName + ' 產生下週休假通報');

    return ok({ message: msg, pushed: pushed });
  } catch (err) { return fail(err.message); }
}

// ==================== Audit Log ====================
function writeAuditLog(lineUserId, action, targetSheet, targetId, detail) {
  try {
    var sh = getSheet(CONFIG.SHEETS.AUDIT_LOG);
    if (!sh) return;
    appendObjectToSheet(CONFIG.SHEETS.AUDIT_LOG, {
      log_id:       genId('LOG'),
      timestamp:    nowTW(),
      line_user_id: lineUserId || '',
      display_name: lineUserId || '',
      action:       action,
      target_sheet: targetSheet,
      target_id:    targetId,
      detail:       String(detail || '').substring(0, 500)
    });
  } catch (err) { Logger.log('writeAuditLog error: ' + err); }
}

// ==================== LINE Messaging ====================
function sendLinePush(toId, text) {
  try {
    var token = getProp(CONFIG.PROP_KEYS.LINE_TOKEN);
    if (!token) { Logger.log('sendLinePush: LINE_CHANNEL_ACCESS_TOKEN 未設定，無法推播'); return; }
    var resp = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ to: toId, messages: [{ type: 'text', text: String(text) }] }),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    if (code !== 200) {
      Logger.log('sendLinePush 失敗，HTTP ' + code + '：' + resp.getContentText());
    } else {
      Logger.log('sendLinePush 成功送出給 ' + toId);
    }
  } catch (err) { Logger.log('sendLinePush error: ' + err); }
}

// ★ 手動測試推播功能是否正常：不用等 LINE 傳訊息進來，直接執行這個
// 函式，就會推播一則測試訊息給 LINE_PUSH_TARGET 設定的對象。執行完
// 看下面「執行記錄」：
//   ・如果寫「sendLinePush 成功送出給 ...」→ Token／頻道都正常，
//     去 LINE 看看是不是真的收到這則測試訊息（如果記錄說成功、但
//     LINE 上完全沒收到，代表 LINE_PUSH_TARGET 這個 userId 填錯，
//     或者你的 LINE 帳號沒有加這個官方帳號好友）
//   ・如果寫「sendLinePush 失敗，HTTP ...」→ 把完整錯誤內容截圖給我
function testLinePush() {
  var raw = getProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET);
  if (!raw) { Logger.log('❌ LINE_PUSH_TARGET 未設定，無法測試'); return; }
  var targets = String(raw).split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
  targets.forEach(function(id) {
    sendLinePush(id, '🔔 這是 testLinePush() 的測試訊息，如果你在 LINE 收到這則，代表推播 Token 正常運作。');
  });
}

// ★ 支援多個推播對象：LINE_PUSH_TARGET 可用逗號分隔多個 userId
function sendLinePushToAll(text) {
  var raw = getProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET);
  if (!raw) return false;
  var targets = String(raw).split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
  if (!targets.length) return false;
  targets.forEach(function(id) { sendLinePush(id, text); });
  return true;
}

function sendLineReply(replyToken, text) {
  try {
    var token = getProp(CONFIG.PROP_KEYS.LINE_TOKEN);
    if (!token) { Logger.log('sendLineReply: LINE_CHANNEL_ACCESS_TOKEN 未設定，無法回覆'); return; }
    var resp = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ replyToken: replyToken, messages: [{ type: 'text', text: String(text) }] }),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    if (code !== 200) {
      Logger.log('sendLineReply 失敗，HTTP ' + code + '：' + resp.getContentText());
    }
  } catch (err) { Logger.log('sendLineReply error: ' + err); }
}

// ==================== Webhook ====================
// ★★ 目前華雄天地跟吉隆天曜共用同一個 LINE 官方帳號，Webhook 網址
// 現況是指到「華雄天地」的 Apps Script，所以這份吉隆天曜程式碼裡的
// handleWebhookEvent／handleQaCommandRouted 目前實際上收不到任何
// LINE 訊息（LINE 平台根本不會呼叫到這裡）。保留並跟華雄天地那份
// 同步更新，是為了將來如果 Webhook 改指到這份吉隆天曜的網址、或是
// 申請了第二個官方帳號各自獨立時，這裡已經是可以直接運作的版本，
// 不用重新補寫。實際運作中的版本以 Webhook 網址目前指到的那份為準。
function handleWebhookEvent(event) {
  try {
    if (event.type !== 'message' || event.message.type !== 'text') return;
    // 只在跟官方帳號一對一私訊時回應。如果官方帳號被加進群組/多人
    // 聊天室，裡面任何人打指令都會讓「查詢 王小明」這種查詢連同回覆
    // 一起被全部組員看到（客戶資料、業績數字、誰請假…），群組/聊天室
    // 訊息一律忽略，避免這種資料外洩風險
    if (event.source.type !== 'user') return;

    var text       = String(event.message.text || '').trim();
    // 固定指令比對前先去掉所有空白、轉小寫，避免使用者打「我的ID」
    // 沒有空格，卻對不到程式碼裡寫的「我的 ID」(中間有空格) 這種
    // 純粹因為打字差異就完全不回應的情況
    var norm       = text.replace(/\s+/g, '').toLowerCase();
    var replyToken = event.replyToken;
    var userId     = event.source.userId;

    if (norm === '案場維修通報' || norm === '維修通報') {
      sendLineReply(replyToken, '🔧 維修通報入口\n請點擊圖文選單的「維修通報」開啟系統填寫。');
      return;
    }
    if (norm === '我的id' || norm === 'myid') {
      sendLineReply(replyToken, '您的 LINE userId：\n' + userId);
      return;
    }
    if (norm === '問答' || norm === '?' || norm === '幫助' || norm === 'help') {
      sendLineReply(replyToken, QA_HELP_TEXT);
      return;
    }

    var qaReply = handleQaCommandRouted(text, userId);
    if (qaReply != null) { sendLineReply(replyToken, qaReply); return; }
  } catch (err) { Logger.log('handleWebhookEvent error: ' + err); }
}

// ==================== 跨案場路由（v9.4 新增，同步華雄天地 v9.31） ====================
// 詳細背景說明見上面 handleWebhookEvent 的註解，以及華雄天地程式碼
// 裡同一段的說明。邏輯完全一致，只是這份是吉隆天曜視角。
var LINE_SITES = {
  '天地': { spreadsheetId: '16Rz6s_nj0BkP4dBDtoIUdgtvsFnlNQY8BvlZutDhoHM', label: '華雄天地' },
  '天曜': { spreadsheetId: '1id0qeNApu_NNOoQ1H3sA0jws7NGuWo-UMwsFEhI73Gg', label: '吉隆天曜' }
};

function readSheetAsObjectsFromSS(ss, sheetName) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var v = row[i];
      if (v instanceof Date) {
        var fmt = DATE_ONLY_FIELDS.indexOf(h) >= 0 ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss';
        v = Utilities.formatDate(v, CONFIG.TIMEZONE, fmt);
      }
      obj[h] = v;
    });
    return obj;
  });
}

function getUserContextFromSS(ss, lineUserId) {
  if (!lineUserId) return null;
  var rows = readSheetAsObjectsFromSS(ss, CONFIG.SHEETS.USER_ROLE);
  var ROLE_PRIORITY = { admin: 3, manager: 2, sales: 1 };
  var best = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].line_user_id) !== String(lineUserId)) continue;
    if (!best) { best = rows[i]; continue; }
    if (rows[i].status === 'active' && best.status !== 'active') { best = rows[i]; continue; }
    if (best.status === 'active' && rows[i].status !== 'active') continue;
    var rp = ROLE_PRIORITY[rows[i].role] || 0;
    var bp = ROLE_PRIORITY[best.role]    || 0;
    if (rp > bp) best = rows[i];
  }
  if (!best) return null;
  return {
    lineUserId: best.line_user_id, displayName: best.display_name, role: best.role,
    projectName: best.project_name, jobTitle: best.job_title, status: best.status
  };
}

function handleQaCommandRouted(rawText, userId) {
  var text = rawText.trim();
  var forcedSite = null;
  var prefixMatch = text.match(/^(天地|天曜|華雄天地|吉隆天曜)\s*(.*)$/);
  if (prefixMatch) {
    forcedSite = (prefixMatch[1] === '天地' || prefixMatch[1] === '華雄天地') ? '天地' : '天曜';
    text = prefixMatch[2].trim();
  }

  var matched = [];
  Object.keys(LINE_SITES).forEach(function(key) {
    if (forcedSite && key !== forcedSite) return;
    var ss = SpreadsheetApp.openById(LINE_SITES[key].spreadsheetId);
    if (getUserContextFromSS(ss, userId)) matched.push(key);
  });

  if (!matched.length) {
    Logger.log('handleQaCommandRouted: userId=' + userId +
      (forcedSite ? ' 在「' + LINE_SITES[forcedSite].label + '」' : '') + ' 查無使用者，不回應');
    return null;
  }
  if (matched.length > 1) {
    return '您在「華雄天地」跟「吉隆天曜」都有帳號，請在指令前加上案場名稱，例如：\n・天地 下週休假\n・天曜 下週休假';
  }
  if (!text) return QA_HELP_TEXT;

  var site = matched[0];
  var savedSpreadsheetId = CONFIG.SPREADSHEET_ID;
  var savedProjectName   = CONFIG.PROJECT_NAME;
  try {
    CONFIG.SPREADSHEET_ID = LINE_SITES[site].spreadsheetId;
    CONFIG.PROJECT_NAME   = LINE_SITES[site].label;
    return handleQaCommand(text, userId);
  } finally {
    CONFIG.SPREADSHEET_ID = savedSpreadsheetId;
    CONFIG.PROJECT_NAME   = savedProjectName;
  }
}

// ==================== 簡單問答（固定指令查資料庫，不是自由對話 AI） ====================
// 用法：使用者在 LINE 官方帳號輸入固定格式的文字，系統直接查 Google
// Sheets 現有資料回答，不需要串接任何外部 AI 服務、不用額外費用。
// 只回答查詢者「有權限看」的範圍：業務只看自己的，主管看同案場，
// admin 看全部案場，跟系統其他地方的權限邏輯一致。
var QA_HELP_TEXT =
  '📱 可以問我的問題（請照格式輸入）：\n\n' +
  '・查詢 王小明　→ 查客戶資料\n' +
  '・今日業績　→ 今天的接待/成交數字\n' +
  '・本月業績　→ 這個月累計數字\n' +
  '・待簽約　→ 待簽約清單\n' +
  '・今日休假　→ 今天誰休假\n' +
  '・下週休假　→ 下週一到週日誰休假\n' +
  '・我的待辦　→ 我的待處理任務\n\n' +
  '如果你在華雄天地跟吉隆天曜都有帳號，指令前面可以加案場名稱指定要查哪邊，例如「天地 今日業績」「天曜 今日業績」，只在單一案場有帳號的話不用加。\n\n' +
  '輸入「問答」隨時可以再看到這份說明。';

function handleQaCommand(text, userId) {
  var ctx = getUserContext(userId);
  if (!ctx) { Logger.log('handleQaCommand: 查無使用者 userId=' + userId + '，不回應'); return null; }

  var norm = text.replace(/\s+/g, '');
  if (norm === '今日業績' || norm === '今天業績') return qaPerformance(ctx, 'today');
  if (norm === '本月業績' || norm === '這個月業績') return qaPerformance(ctx, 'month');
  if (norm === '待簽約') return qaPendingSignatures(ctx);
  if (norm === '今日休假' || norm === '誰休假' || norm === '今天誰休假') return qaTodayLeave();
  if (norm === '下週休假' || norm === '下周休假' || norm === '下星期休假') return qaNextWeekLeave();
  if (norm === '我的待辦' || norm === '待辦' || norm === '我的任務') return qaMyTasks(ctx);

  var m = text.match(/^查詢?\s*(.+)$/);
  if (m && m[1]) return qaSearchCustomer(m[1].trim(), ctx);

  Logger.log('handleQaCommand: 文字「' + text + '」沒有對應到任何指令，不回應');
  return null;
}

function qaSumReportFields(rows) {
  var t = { visitor: 0, first: 0, revisit: 0, deal: 0 };
  rows.forEach(function(r) {
    t.visitor += (+r.visitor_count || 0);
    t.first   += (+r.first_visit_count || 0);
    t.revisit += (+r.revisit_count || 0);
    t.deal    += (+r.deal_count || 0);
  });
  return t;
}

function qaPerformance(ctx, range) {
  var label, matches;
  if (range === 'today') {
    var d = todayTW();
    label = '今日業績（' + d + '）';
    matches = function(r) { return String(r.report_date).substring(0,10) === d; };
  } else {
    var ym = todayTW().substring(0,7);
    label = '本月業績（' + ym + '）';
    matches = function(r) { return String(r.report_date).substring(0,7) === ym; };
  }
  var rows = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT).filter(function(r) {
    if (!matches(r)) return false;
    if (ctx.role === CONFIG.ROLES.ADMIN) return true;
    return r.project_name === ctx.projectName;
  });
  if (!rows.length) return '📊 ' + label + '\n目前還沒有日報資料。';
  var t = qaSumReportFields(rows);
  return '📊 ' + label + '\n接待：' + t.visitor + '　初訪：' + t.first + '　回籠：' + t.revisit + '　成交：' + t.deal;
}

function qaPendingSignatures(ctx) {
  var rows = readSheetAsObjects(CONFIG.SHEETS.DEAL_DETAIL).filter(function(r) {
    if (r.status !== 'active' || r.contract_status !== '待簽約') return false;
    if (ctx.role === CONFIG.ROLES.ADMIN) return true;
    if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
    return String(r.sales_line_user_id) === String(ctx.lineUserId);
  });
  if (!rows.length) return '📋 目前沒有待簽約的案件。';
  rows.sort(function(a,b){ return String(a.expected_sign_date).localeCompare(String(b.expected_sign_date)); });
  var lines = rows.slice(0, 10).map(function(d) {
    var overdue = d.expected_sign_date && d.expected_sign_date < todayTW();
    return (overdue ? '⚠️ ' : '・') + (d.unit || '（未填戶別）') + '　預定：' + (d.expected_sign_date || '未填') + '　' + (d.salesperson || '');
  });
  var extra = rows.length > 10 ? '\n…還有 ' + (rows.length - 10) + ' 筆' : '';
  return '📋 待簽約清單（共 ' + rows.length + ' 筆）\n\n' + lines.join('\n') + extra;
}

function qaTodayLeave() {
  var today = todayTW();
  var rows = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE).filter(function(r) {
    return String(r.leave_date).substring(0,10) === today;
  });
  if (!rows.length) return '📅 今日休假（' + today + '）\n今日全員出勤 ✓';
  var names = rows.map(function(r){ return r.display_name || r.line_user_id; });
  return '📅 今日休假（' + today + '）\n' + names.join('、');
}

// 下週一~週日（跟前端排班頁 getWeekDates(1) 定義的「下週」一致）
function qaNextWeekLeave() {
  var now = new Date();
  var dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  var mon = new Date(now);
  mon.setDate(now.getDate() - dow + 7);
  var sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  var monStr = Utilities.formatDate(mon, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  var sunStr = Utilities.formatDate(sun, CONFIG.TIMEZONE, 'yyyy-MM-dd');

  var rows = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE).filter(function(r) {
    var d = String(r.leave_date).substring(0,10);
    return d >= monStr && d <= sunStr;
  });
  if (!rows.length) return '📅 下週休假（' + monStr + ' ～ ' + sunStr + '）\n目前沒有人排休。';

  var byDate = {};
  rows.forEach(function(r) {
    var d = String(r.leave_date).substring(0,10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r.display_name || r.line_user_id);
  });
  var lines = Object.keys(byDate).sort().map(function(d) {
    return d + '：' + byDate[d].join('、');
  });
  return '📅 下週休假（' + monStr + ' ～ ' + sunStr + '）\n' + lines.join('\n');
}

function qaMyTasks(ctx) {
  var rows = readSheetAsObjects(CONFIG.SHEETS.TASK).filter(function(r) {
    return r.status === CONFIG.STATUS.PENDING && String(r.assigned_to_line_user_id) === String(ctx.lineUserId);
  });
  if (!rows.length) return '✅ 你目前沒有待處理的任務。';
  var lines = rows.slice(0, 10).map(function(t) {
    return '・' + t.title + (t.due_date ? '（期限：' + t.due_date + '）' : '');
  });
  var extra = rows.length > 10 ? '\n…還有 ' + (rows.length - 10) + ' 項' : '';
  return '📝 你的待辦（共 ' + rows.length + ' 項）\n\n' + lines.join('\n') + extra;
}

function qaSearchCustomer(keyword, ctx) {
  if (!keyword) return '請輸入要查詢的客戶姓名，例如：查詢 王小明';
  var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
    if (String(r.customer_name || '').indexOf(keyword) < 0) return false;
    if (ctx.role === CONFIG.ROLES.ADMIN) return true;
    if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
    return String(r.sales_line_user_id) === String(ctx.lineUserId);
  });
  if (!rows.length) return '🔍 查無「' + keyword + '」的客戶資料（只會查得到你有權限看的範圍）。';
  rows.sort(function(a,b){ return String(b.visit_date||'').localeCompare(String(a.visit_date||'')); });
  var top = rows.slice(0, 5);
  var lines = top.map(function(c) {
    var status = c.deal_status === '退戶' ? '🔙退戶' : (c.deal_status === '已成交' ? '✓已成交' : '未成交');
    return '・' + c.customer_name + '（' + (c.phone || '無電話') + '）\n  訪客日期：' + String(c.visit_date||'').substring(0,10) + '　狀態：' + status + '　業務：' + (c.sales_name || '');
  });
  var extra = rows.length > 5 ? '\n\n…還有 ' + (rows.length - 5) + ' 筆，請用更精確的姓名查詢' : '';
  return '🔍 查詢「' + keyword + '」找到 ' + rows.length + ' 筆：\n\n' + lines.join('\n\n') + extra;
}

// ==================== Daily Triggers ====================
function sendDailyTaskReminder() {
  try {
    var rows = readSheetAsObjects(CONFIG.SHEETS.TASK).filter(function(r){ return r.status === CONFIG.STATUS.PENDING; });
    if (!getProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET)) return;

    var msg = '案場：' + CONFIG.PROJECT_NAME + '\n🔔 今日任務提醒（' + todayTW() + '）\n\n';
    if (!rows.length) { msg += '✅ 目前沒有待辦任務'; }
    else {
      var byProject = {};
      rows.forEach(function(r){ var k = r.project_name || '未指定'; if(!byProject[k]) byProject[k]=[]; byProject[k].push(r); });
      Object.keys(byProject).forEach(function(proj){
        msg += '【' + proj + '】\n';
        byProject[proj].slice(0,5).forEach(function(t){ msg += '・' + t.title + (t.due_date ? '（'+t.due_date+'）' : '') + '\n'; });
        if (byProject[proj].length > 5) msg += '  …還有 ' + (byProject[proj].length-5) + ' 項\n';
        msg += '\n';
      });
    }
    sendLinePushToAll(msg);
  } catch (err) { Logger.log('sendDailyTaskReminder error: ' + err); }
}

// ★ 修正：晚上 9 點觸發時，只有「今天完全沒有人交日報」才推播提醒
// 管理員/主管，已經有交的話就不推播——原本不管有沒有交都會每天固定
// 推一則訊息（有交就顯示統計、沒交就顯示提醒），改成只在真的漏交
// 時才通知，避免每天固定跳出訊息讓人養成忽略推播的習慣
function sendDailySalesReport() {
  try {
    var date = todayTW();
    var rows = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT).filter(function(r){
      try { return Utilities.formatDate(new Date(r.report_date), CONFIG.TIMEZONE, 'yyyy-MM-dd') === date; }
      catch(e){ return false; }
    });
    if (rows.length) return; // 今天已經有人交過日報，不用推播
    if (!getProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET)) return;

    var msg = '案場：' + CONFIG.PROJECT_NAME + '\n⚠️ 銷售日報尚未提交提醒（' + date + '）\n\n' +
      '今天晚上9點了，還沒有任何業務提交今日銷售日報，麻煩提醒業務盡快補交。';
    sendLinePushToAll(msg);
  } catch (err) { Logger.log('sendDailySalesReport error: ' + err); }
}

// ==================== Initialization ====================
function initAllSheets() {
  var ss = getCrmSS();
  var schemas = {};
  schemas[CONFIG.SHEETS.USER_ROLE]    = ['line_user_id','display_name','role','status','project_name','job_title','last_login_at','created_at','updated_at'];
  schemas[CONFIG.SHEETS.PROJECT]      = ['project_name','project_code','status','manager_line_user_id','created_at','updated_at'];
  schemas[CONFIG.SHEETS.CUSTOMER]     = ['customer_id','created_at','updated_at','created_by_line_user_id','created_by_name','sales_line_user_id','sales_name','project_name','visit_date','visit_type','customer_name','phone','age_range','district','occupation_industry','purchase_motive','source','room_types','budget','issues','revisit_plan','deal_status','deal_unit','status_note','note'];
  schemas[CONFIG.SHEETS.TASK]         = ['task_id','project_name','type','title','description','priority','status','assigned_to','assigned_to_line_user_id','created_by','created_by_line_user_id','due_date','created_at','updated_at'];
  schemas[CONFIG.SHEETS.DAILY_REPORT] = ['report_id','report_date','project_name','salesperson','sales_line_user_id','visitor_count','first_visit_count','revisit_count','call_count','deal_count','transaction_units','viewed_units','notes','created_by','created_at'];
  schemas[CONFIG.SHEETS.MAINTENANCE]  = ['maintenance_id','project_name','location','issue_type','description','photo_url','reported_by','reported_by_line_user_id','assigned_to','status','created_at','updated_at','completed_at'];
  schemas[CONFIG.SHEETS.AUDIT_LOG]    = ['log_id','timestamp','line_user_id','display_name','action','target_sheet','target_id','detail'];
  schemas[CONFIG.SHEETS.CHANGE_LOG]   = ['log_id','customer_id','customer_name','changed_by_line_user_id','changed_by_name','changed_at','changes_json'];
  schemas[CONFIG.SHEETS.LEAVE_SCHEDULE] = ['leave_id','line_user_id','display_name','project_name','leave_date','created_by_line_user_id','created_at'];
  schemas[CONFIG.SHEETS.CALENDAR_NOTES]  = ['note_id','project_name','note_date','content','created_by_line_user_id','created_by_name','created_at'];

  Object.keys(schemas).forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clear();
    sh.getRange(1,1,1,schemas[name].length).setValues([schemas[name]]);
    sh.getRange(1,1,1,schemas[name].length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  });

  CONFIG.INITIAL_PROJECTS.forEach(function(p) {
    appendObjectToSheet(CONFIG.SHEETS.PROJECT, {
      project_name: p.name, project_code: p.code,
      status: CONFIG.STATUS.ACTIVE, manager_line_user_id: '',
      created_at: nowTW(), updated_at: nowTW()
    });
  });

  Logger.log('✓ 8 張工作表已建立');
}

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === 'sendDailyTaskReminder' || fn === 'sendDailySalesReport' || fn === 'geocodeMissingAddressesHourly') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDailyTaskReminder').timeBased().atHour(9).everyDays(1).inTimezone(CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('sendDailySalesReport').timeBased().atHour(21).everyDays(1).inTimezone(CONFIG.TIMEZONE).create();
  // 每小時自動幫新填的「詳細地址」轉座標，業務登記/編輯客戶資料時
  // 不用等地址轉換完成，最多一小時內熱點地圖就會補上精確定位點
  ScriptApp.newTrigger('geocodeMissingAddressesHourly').timeBased().everyHours(1).create();
  Logger.log('✓ 觸發器設定完成');
}

function geocodeMissingAddressesHourly() { geocodeMissingAddresses(200); }

// ★ 修正：防止重複新增，已存在就更新
function addUser(lineUserId, displayName, role, projectName) {
  if (!lineUserId || !displayName || !role) {
    Logger.log('用法：addUser("U...", "姓名", "admin/manager/sales", "案場")'); return;
  }
  var existing = getUserContext(lineUserId);
  if (existing) {
    updateRowById(CONFIG.SHEETS.USER_ROLE, 'line_user_id', lineUserId, {
      display_name: displayName,
      role: role,
      project_name: projectName || '',
      status: CONFIG.STATUS.ACTIVE,
      updated_at: nowTW()
    });
    Logger.log('✓ 已更新（非重複新增）：' + displayName + '（' + role + '）');
    return;
  }
  appendObjectToSheet(CONFIG.SHEETS.USER_ROLE, {
    line_user_id: lineUserId,
    display_name: displayName,
    role: role,
    status: CONFIG.STATUS.ACTIVE,
    project_name: projectName || '',
    job_title: '',
    last_login_at: '',
    created_at: nowTW(),
    updated_at: nowTW()
  });
  Logger.log('✓ 已新增：' + displayName + '（' + role + '）');
}

// ★ 一次性修復用：把已經被 Sheets 轉成數字、開頭 0 被吃掉的手機號碼補回來
// 只處理 9 碼、以 9 開頭的純數字（符合台灣手機號碼去掉開頭 0 後的樣子），
// 執行一次即可，不影響其他資料
function fixLeadingZeroPhones() {
  var sh = getSheet(CONFIG.SHEETS.CUSTOMER);
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var col = headers.indexOf('phone');
  if (col < 0) { Logger.log('找不到 phone 欄位'); return; }
  var fixed = 0;
  for (var i = 1; i < data.length; i++) {
    var val = data[i][col];
    if (typeof val === 'number' && /^9\d{8}$/.test(String(val))) {
      var cell = sh.getRange(i + 1, col + 1);
      cell.setNumberFormat('@STRING@');
      cell.setValue('0' + val);
      fixed++;
    }
  }
  Logger.log('✓ 已修復 ' + fixed + ' 筆手機號碼（補回開頭的 0）');
}

// ★ 一次性修復用：掃描所有分頁的日期／時間戳欄位，把已經被 Sheets 自動轉成
// Date 型別的儲存格（在文字保護機制上線前寫入的舊資料）換算回台北時間文字後
// 重新寫回去，避免舊資料在試算表裡打開來看時跟 API 讀出來的時間對不上。
// 不影響其他資料，執行一次即可。
function fixDateTimeFormats() {
  var fixed = 0;
  Object.keys(CONFIG.SHEETS).forEach(function(key) {
    var sh = getSheet(CONFIG.SHEETS[key]);
    if (!sh) return;
    var data = sh.getDataRange().getValues();
    if (data.length < 2) return;
    var headers = data[0];
    headers.forEach(function(h, col) {
      var isDateField = DATE_ONLY_FIELDS.indexOf(h) >= 0;
      var isDatetimeField = DATETIME_FIELDS.indexOf(h) >= 0;
      if (!isDateField && !isDatetimeField) return;
      var fmt = isDateField ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss';
      for (var i = 1; i < data.length; i++) {
        var val = data[i][col];
        if (val instanceof Date) {
          var cell = sh.getRange(i + 1, col + 1);
          cell.setNumberFormat('@STRING@');
          cell.setValue(Utilities.formatDate(val, CONFIG.TIMEZONE, fmt));
          fixed++;
        }
      }
    });
  });
  Logger.log('✓ 已修復 ' + fixed + ' 個日期／時間欄位（換算回台北時間文字）');
}

function setCompanyPassword(pwd) { setProp(CONFIG.PROP_KEYS.COMPANY_PASSWORD, pwd); Logger.log('✓ 密碼已設定'); }
function setLineToken(token)     { setProp(CONFIG.PROP_KEYS.LINE_TOKEN, token);     Logger.log('✓ LINE Token 設定完成'); }
function setLinePushTarget(id)   { setProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET, id);  Logger.log('✓ 推播目標設定完成（多人請用逗號分隔，例如 U111,U222）'); }
function setLineChannelSecret(s) { setProp(CONFIG.PROP_KEYS.LINE_CHANNEL_SECRET, s); Logger.log('✓ Channel Secret 設定完成'); }

// ★ 第一次設定執行這個就好
function firstTimeSetup() {
  setCompanyPassword('075500888');
  initAllSheets();
  Logger.log('✓ 完成！吉隆天曜專用版已初始化。');
  Logger.log('下一步：');
  Logger.log('1. 部署 Web App，把 exec 網址貼到 jltx.html 的 GAS_URL');
  Logger.log('2. 執行 setLineToken(你的Token) 設定推播');
  Logger.log('3. 執行 setLinePushTarget(你的userId) 設定推播目標');
  Logger.log('4. 執行 addUser(你的userId,你的名字,admin,吉隆天曜) 加入第一位管理員');
}

function testCheckProps() {
  Object.values(CONFIG.PROP_KEYS).forEach(function(k) {
    var v = getProp(k);
    Logger.log(k + ' = ' + (v ? '已設定（' + v.substring(0,4) + '…）' : '❌ 未設定'));
  });
}

// ★ LINE 問答除錯用：不用透過 LINE 傳訊息，直接在編輯器裡執行這個函式
// 就能立刻看到結果。把下面 YOUR_LINE_USER_ID 換成你自己的 LINE userId
// （對 LINE 官方帳號輸入「我的ID」就會回傳，或是查 User_Role_Table
// 分頁裡你自己那一列的 line_user_id 欄位），儲存後執行，看下面
// 「執行記錄」跳出來的內容
function testQaCommand() {
  var myLineUserId = 'YOUR_LINE_USER_ID';
  var ctx = getUserContext(myLineUserId);
  if (!ctx) {
    Logger.log('❌ 查無使用者。可能原因：myLineUserId 還是預設的 YOUR_LINE_USER_ID 沒換掉，' +
      '或是這個 userId 在 User_Role_Table 裡沒有 active 狀態的紀錄。');
    return;
  }
  Logger.log('✓ 查到使用者：' + ctx.displayName + '（' + ctx.role + '／' + ctx.projectName + '）');
  var reply = handleQaCommand('今日休假', myLineUserId);
  Logger.log('handleQaCommand 回傳結果：\n' + reply);
}

// ★ 以下執行完後建議從程式碼中刪除，避免 Token 外洩
function setupLine() {
  setLineToken('QcAjXh7Yu8jtbHUcgcii9+bCBE0ZbfTrxLXSDJ0W7KQydHtAfthh7uISDAoxA1yPTZby4GQMlbb701rDnLzCPAI+mlurWeOogR3cf7YKEfq0Ew+9jOKtMXJw9pPxJEX26rRFc24CKuAriwQcIZTLwdB04t891Ow1cDnyilFU=');
  setLinePushTarget('U4bf4bf6035e402e4d5a17a01915812bc');
}
function setupSecret() { setLineChannelSecret('9456425e307c7419f2f0571e1f0199ec'); }
function addMyself() {
  addUser('U4bf4bf6035e402e4d5a17a01915812bc', 'SKY 陳昭文', 'admin', '吉隆天曜');
}
