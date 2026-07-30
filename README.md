# 凱撒衛浴選品試算工具 MVP v32

## 本版修正
修正 v31 仍然按「產生選品試算」沒有反應的問題。

## 查到的真正原因
舊的 DOMContentLoaded 初始化區塊裡仍保留一段舊 stepper 程式：

- 它期待按鈕有 .minus / .plus class。
- 但目前 HTML 按鈕是用 data-step / data-target。
- 因此 minus / plus 會是 null。
- 執行 minus.addEventListener 時會發生錯誤。
- 這會中斷後面的初始化，包括 loadProducts() 與 runButton 綁定。

## 本版處理
- 移除舊 DOMContentLoaded 初始化區塊。
- 移除 v30 / v31 追加的外掛 click handler，避免重複綁定。
- 改成一個乾淨初始化流程：
  - 建立預設浴櫃列。
  - 初始化預設值。
  - 綁定新增尺寸按鈕。
  - 綁定 stepper 加減按鈕。
  - 綁定產生選品試算按鈕。
  - 呼叫 loadProducts()。

## 未改動
- 未改 UI。
- 未改 buildDemands。
- 未改 renderEstimate。
- 未改選品規則。
- 未改 Google Sheet。
- 未改 PRODUCT_MASTER。

## 檔名規則
固定四檔：
- index.html
- style.css
- app.js
- README.md

快取用 query string：
- style.css?v=202607301203
- app.js?v=202607301203
