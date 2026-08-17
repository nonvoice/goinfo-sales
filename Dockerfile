FROM --platform=linux/arm64 node:20-alpine

WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./

RUN npm install

COPY . .

RUN npm run build

RUN npm install --omit=dev serve@14.2.4

EXPOSE 8080

CMD ["sh", "-c", "npx serve -s build -l 8080"]
