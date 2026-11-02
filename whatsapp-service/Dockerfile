# خدمة واتساب uco-pickup على سيرفر إنڤير (بدل Railway — 2026-11-02)
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev
ENV NODE_ENV=production PORT=3001 WA_SESSION_DIR=/data/wa-session
EXPOSE 3001
CMD ["node", "dist/index.js"]
