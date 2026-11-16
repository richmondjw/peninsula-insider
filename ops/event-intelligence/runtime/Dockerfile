FROM openclaw-custom:latest
WORKDIR /app
COPY ops/event-intelligence/ /app/ops/event-intelligence/
COPY next/node_modules/parse5/ /app/next/node_modules/parse5/
COPY next/node_modules/entities/ /app/next/node_modules/entities/
COPY next/src/content/events/ /app/next/src/content/events/
COPY next/src/content/venues/ /app/next/src/content/venues/
COPY source-manifest.json /app/source-manifest.json
ENV TZ=Australia/Melbourne PI_EVENT_RUNTIME_ROOT=/data NODE_ENV=production PI_EVENT_CATALOG_DIRECTORY=/app/next/src/content/events
USER 1000:1000
HEALTHCHECK --interval=60s --timeout=10s --start-period=10m --retries=3 CMD node /app/ops/event-intelligence/runtime/healthcheck.mjs /data
ENTRYPOINT ["node", "/app/ops/event-intelligence/runner.mjs"]
CMD ["--daemon", "/data"]

COPY next/src/lib/ /app/next/src/lib/
