# 凱撒衛浴選品試算工具 MVP v27

## 本版修正
本版針對使用者回報「一樣沒有收合、一樣都還有舊資料」進行實際檢查後修正。

## 查到的問題
1. index.html 仍有固定舊值：
   - discountInput value="35"
   - toiletQty value="2"
   - basinFaucetQty value="1"
   - showerFaucetQty value="1"

2. app.js 內 forceInitialDefaults 抓錯 ID：
   - 原本抓 document.getElementById("discount")
   - 實際欄位是 discountInput

3. app.js 內查詢 .qty-input，但 HTML 的數量 input 沒有 qty-input class。

4. app.js 仍固定新增浴櫃 / 鏡櫃：
   - qty: 1
   - width: 800

## 本版修正內容
- 折數 HTML 固定值改為 45。
- 所有基本品項 HTML 固定數量改為 0。
- forceInitialDefaults 改抓正確 ID：discountInput。
- forceInitialDefaults 逐一重設所有數量欄位。
- 浴櫃 / 鏡櫃預設新增列改為 qty 0、width 空白。
- addDemandRow 預設 qty 改為 0。
- renderEstimate 折數 fallback 從 35 改為 45。
- 額外選項依數量 0 / 大於 0 收合。
- 左側字級再加大。

## 檔名規則
維持固定四檔：
- index.html
- style.css
- app.js
- README.md

快取用 query string：
- style.css?v=202607301029
- app.js?v=202607301029
