# Multi-Stage Production Build: Telemetry Ingestion Service
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S apextrack && adduser -S apextrack -G apextrack
COPY --from=builder --chown=apextrack:apextrack /app/node_modules ./node_modules
COPY --chown=apextrack:apextrack package.json server.js ./
USER apextrack
EXPOSE 4003
CMD ["node", "server.js"]
