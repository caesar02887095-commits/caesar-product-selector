# 凱撒衛浴選品試算工具 MVP v36

## 本版修正
只修正「改選品項後，改選按鈕 / 替代清單消失」問題。

## 查到原因
v33 / v34 為了讓預算模式尊重手動改選，把該需求的 candidates 縮成只剩手動選擇的那一個品項。

因此重新 render 後：
- product.candidates 只剩目前選中的品項
- buildAltSection 再排除目前品項
- alternatives 變成 0
- 整個「展開其他可選型號 / 改選此品項」區塊消失

## 本版修正
- 手動改選時，只固定主選品。
- 原始完整候選清單保留在 allCandidates。
- 最終傳給產品卡片的 candidates 使用完整候選清單。
- 因此改選後仍會顯示「展開其他可選型號」。
- 也會顯示提示：「目前為手動改選，仍可再改其他型號。」

## 未改動
- 未改 Google Sheet。
- 未改 PRODUCT_MASTER。
- 未改適裝表。
- 未改推薦類別。
- 未改左側排序。
- 未改預算演算法方向。
- 未改 UI 主版面。

## 檔名規則
固定四檔：
- index.html
- style.css
- app.js
- README.md

快取用 query string：
- style.css?v=202607301405
- app.js?v=202607301405
