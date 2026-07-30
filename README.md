# 凱撒衛浴選品試算工具 MVP v34

## 本版修正
本版只修正使用者明確指出的前端問題：

1. 改選品項後，替代品按鈕不應消失或失效。
2. 改選品項後，總價、折後總價、預算差額必須同步更新。
3. 預算模式下，手動改選不應被演算法覆蓋。

## 修正方式
- 新增穩定的替代品按鈕事件委派。
- 支援新舊兩種替代品按鈕資料格式：
  - data-alt-demand-id / data-alt-key
  - data-demand-id / data-model
- 點擊改選後：
  - 寫入 selectedModelByDemandId
  - 直接呼叫 renderEstimate()
  - 不透過 runButton，避免 selectedModelByDemandId 被清空。
- 若 renderEstimate 內部有清空 selectedModelByDemandId，已移除該行。

## 本版沒有做
- 未拆 PRODUCT_MASTER 組合型號。
- 未建立適裝表。
- 未修改扶手條件。
- 未修改 Google Sheet。
- 未修改左側排序。
- 未改圖片URL。

## 關於組合型號的判斷
使用者提出「組合型號要不要乾脆拆開」。
本版只記錄結論，不直接改資料表：

建議後續改為：
- PRODUCT_MASTER 只存單品。
- 組合由相容表 / 適裝表產生。
- 馬桶 + 電腦馬桶座應透過適裝表確認能不能搭配。
- 龍頭也應建立適裝表。
- 扶手不能只靠單一推薦排序，應補條件，例如長度、安裝方向、材質、無障礙用途、牆面條件。

## 檔名規則
固定四檔：
- index.html
- style.css
- app.js
- README.md

快取用 query string：
- style.css?v=202607301337
- app.js?v=202607301337
