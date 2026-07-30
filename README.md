# 凱撒衛浴選品試算工具 v38-hotfix-alt-thumbnail

## 本版修正
只恢復「展開其他可選型號」裡的縮圖。

## 修改範圍
允許修改：
- app.js 的 buildAltSection 顯示結構
- style.css 的替代品小卡排版

禁止修改並已遵守：
- 未改推薦邏輯
- 未改預算邏輯
- 未改 Google Sheet
- 未改 PRODUCT_MASTER
- 未改適裝表
- 未改左側 UI
- 未改資料讀取

## 基礎版本
本版以 v36 為基礎。
原因：v36 已修正「改選後候選清單消失」的邏輯；v37 的文字列版型不沿用。

## 替代品小卡結構
展開後每一筆替代品固定為：
- 左側 64×64 縮圖
- 中間 型號 / 品名
- 右側 折後單價 / 差額 / 改選此品項

手機寬度下：
- 縮圖與文字在第一列
- 金額與按鈕移到下一列

## 檔名規則
固定四檔：
- index.html
- style.css
- app.js
- README.md

快取用 query string：
- style.css?v=202607301438
- app.js?v=202607301438
