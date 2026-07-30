# 凱撒衛浴選品試算工具 MVP v30

## 本版修正
只修正 v29 加減按鈕不能按的問題。

## 修正範圍
- 新增一個穩定的 stepper click handler。
- 依照 button 的 data-target 找到對應 input。
- 依照 data-step 做 +1 / -1。
- 數量最低為 0。
- 觸發 input / change 事件。
- 呼叫 markDirty。

## 未改動
- 未改版面。
- 未改選品邏輯。
- 未改資料分類。
- 未改 PRODUCT_MASTER。
- 未新增功能。

## 檔名規則
固定四檔：
- index.html
- style.css
- app.js
- README.md

快取用 query string：
- style.css?v=202607301125
- app.js?v=202607301125
