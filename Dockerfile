FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./

RUN npm install

COPY . .

RUN npm run build

FROM caddy:2-alpine

COPY --from=builder /app/build /usr/share/caddy

RUN printf '%s\n' \
    ':8080 {' \
    '    root * /usr/share/caddy' \
    '    try_files {path} /index.html' \
    '    file_server' \
    '}' \
    > /etc/caddy/Caddyfile

EXPOSE 8080
