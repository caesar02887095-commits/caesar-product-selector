# 凱撒衛浴選品試算工具 MVP v37

## 本版修正
只修正「展開其他可選型號後版型跑掉」。

## 修正範圍
- 不改選品邏輯。
- 不改預算演算法。
- 不改 Google Sheet。
- 不改 PRODUCT_MASTER。
- 不改適裝表。
- 不改左側排序。

## 修正內容
- 替代型號區加上 alt-section wrapper。
- alt-list 展開後改為單欄 grid。
- alt-item 固定為「左側型號資訊 / 右側金額與按鈕」。
- 型號與品名過長時自動換行，不撐破卡片。
- 右側按鈕區固定最小寬度。
- 手機寬度時改成上下排列。
- 手動改選提示改成穩定的區塊樣式。

## 檔名規則
固定四檔：
- index.html
- style.css
- app.js
- README.md

快取用 query string：
- style.css?v=202607301420
- app.js?v=202607301420
