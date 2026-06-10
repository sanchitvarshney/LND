# Builds API + serves the prebuilt client/dist. Expects client built into ../client/dist.
FROM node:20-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install && npm install -D prisma cross-env && npm install @prisma/client
COPY server/ ./
COPY client/dist /app/client/dist
RUN npx prisma generate && npm run build
ENV NODE_ENV=production DB_DRIVER=prisma CLIENT_DIST=/app/client/dist
EXPOSE 4000
CMD ["sh","-c","npx prisma db push --skip-generate && node dist/index.js"]
