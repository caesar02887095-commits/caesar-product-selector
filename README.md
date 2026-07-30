# 凱撒衛浴選品試算工具 MVP v31

## 本版修正
只修正「產生選品試算」按鈕沒有動作。

## 修正範圍
- 新增一個最小 click handler。
- 只攔截文字包含「產生選品試算」或「產生選品」的按鈕。
- 點擊後呼叫既有 renderEstimate()。
- 不改 renderEstimate 內容。
- 不改 buildDemands。
- 不改選品規則。
- 不改 UI。
- 不改 Google Sheet。

## 檔名規則
固定四檔：
- index.html
- style.css
- app.js
- README.md

快取用 query string：
- style.css?v=202607301136
- app.js?v=202607301136
