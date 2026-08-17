# 第一階段：建置 Vite 前端靜態檔案
# 使用 node 映像檔來安裝依賴並執行 npm run build
# (建置階段讓 Zeabur 伺服器用自己的架構跑即可，不影響最終的純文字前端檔案)
FROM node:18-alpine AS builder
WORKDIR /app

# 複製 package.json 和 lock 檔案
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# 安裝依賴套件
RUN npm install

# 複製所有原始碼
COPY . .

# 執行 React 打包 (Create React App 會輸出到 build 資料夾)
RUN npm run build

# ---------------------------------------------------

# 第二階段：【關鍵修復】強制使用 ARM64 (Mac Mini 適用的架構) 的 Caddy 伺服器
# 這樣可以避免 Zeabur 的雲端建置機台 (通常是 AMD64) 抓錯版本
FROM caddy:2-alpine

# 自訂 Caddy 設定檔，強制監聽 8080 Port 
# (同時加入 try_files 確保 React 前端路由重新整理時不會 404)
RUN echo ':8080 {' > /etc/caddy/Caddyfile && \
    echo '    root * /usr/share/caddy' >> /etc/caddy/Caddyfile && \
    echo '    try_files {path} /index.html' >> /etc/caddy/Caddyfile && \
    echo '    file_server' >> /etc/caddy/Caddyfile && \
    echo '}' >> /etc/caddy/Caddyfile

# 【關鍵修改】：將 /app/dist 改為 /app/build
# 將第一階段打包好的 build 資料夾，複製到 Caddy 預設的網頁伺服器目錄
COPY --from=builder /app/build /usr/share/caddy

# 開放 8080 port 供 Zeabur 自動綁定路由
EXPOSE 8080
