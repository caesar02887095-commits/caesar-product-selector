# 凱撒衛浴選品試算工具 MVP

## 檔案
- `index.html`：頁面結構
- `style.css`：樣式
- `app.js`：讀取 Google Sheet CSV、篩選產品、試算金額

## 資料來源
目前 `app.js` 內的 `PRODUCT_CSV_URL` 已設定為你提供的 Google Sheet CSV 發布網址。

## GitHub Pages 使用方式
1. 建立 GitHub repository，例如 `caesar-product-selector`
2. 上傳這三個檔案到 repository 根目錄
3. 到 Settings → Pages
4. Source 選 Deploy from a branch
5. Branch 選 `main`，資料夾選 `/root`
6. 儲存後等待 GitHub 產生 Pages 網址

## 注意
本工具為第一版 MVP：
- 圖片URL 空白時會顯示「無圖片」
- 官網URL 空白時會依型號自動產生
- 型號包含 `/`、空白或 `DF140EV` 時，會改用 Google 搜尋
- 目前沒有登入權限控管
- 目前沒有正式報價單功能
