# 凱撒衛浴選品試算工具 v39-hotfix-category-map

## 本版修正
修正部分品項選擇數量後，右側結果區壞掉或顯示異常。

## 查到原因
buildDemands 已經會產生下列需求 type：
- clothesRack
- handDryer
- waterHeater
- urinal
- showerDoor

但 CATEGORY_MAP 原本沒有這些 type 對應。
例如「電能熱水器」會產生 waterHeater，但 CATEGORY_MAP 沒有 waterHeater，所以找不到產品候選。

另外「抽風扇」原本被接到 bathHeater，容易推薦到暖風機而不是抽風扇。

## 本版修改範圍
允許修改：
- app.js 的 CATEGORY_MAP
- app.js 的 findSimpleCandidates 防呆
- app.js 的缺資料卡片顯示
- style.css 的 missing-card 穩定樣式

禁止修改並已遵守：
- 未改推薦排序
- 未改預算演算法
- 未改 Google Sheet
- 未改 PRODUCT_MASTER
- 未改適裝表
- 未改左側 UI
- 未改縮圖版型

## 新增類別對應
- exhaustFan：抽風扇 / 換氣扇 / 排風扇
- clothesRack：電動曬衣架 / 曬衣架
- handDryer：烘手機
- waterHeater：電能熱水器 / 電熱水器 / 熱水器
- urinal：小便斗 / 小便器 / 小便斗沖水器 / 感應器 / 指壓
- showerDoor：淋浴拉門 / 無框淋浴拉門 / 乾濕分離 / 淋浴門

## 檔名規則
固定四檔：
- index.html
- style.css
- app.js
- README.md

快取用 query string：
- style.css?v=202607301500
- app.js?v=202607301500
