FROM node:22.23.2-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
COPY --from=pi_fonts . /pi-fonts-source/
RUN PI_FONT_SOURCE=/pi-fonts-source npm run build

FROM node:22.23.2-bookworm-slim AS runtime

ENV NODE_ENV=development \
    FOUNDRY_HOST=0.0.0.0 \
    FOUNDRY_PORT=4310 \
    FOUNDRY_STATIC_DIR=/app/dist \
    FOUNDRY_DATA_ROOT=/data

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/.server-build ./.server-build
RUN mkdir -p /data && chown node:node /data

USER node
EXPOSE 4310
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=6 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4310/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["npm", "start"]
