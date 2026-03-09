# ---- Build stage ----
FROM ghcr.io/puppeteer/puppeteer:latest AS builder

WORKDIR /home/pptruser/app

COPY --chown=pptruser:pptruser package*.json ./
RUN npm ci

COPY --chown=pptruser:pptruser tsconfig.json ./
COPY --chown=pptruser:pptruser src ./src
RUN npm run build

# ---- Runtime stage ----
FROM ghcr.io/puppeteer/puppeteer:latest

# Create a stable symlink to the versioned Chrome binary so CHROME_PATH
# doesn't need to change when the puppeteer image updates Chrome.
USER root
RUN ln -sf "$(find /home/pptruser/.cache/puppeteer -name chrome -type f | head -1)" /usr/local/bin/chrome
USER pptruser

ENV CHROME_PATH=/usr/local/bin/chrome
ENV HEADLESS=true

WORKDIR /home/pptruser/app

COPY --chown=pptruser:pptruser package*.json ./
RUN npm ci --omit=dev

COPY --chown=pptruser:pptruser --from=builder /home/pptruser/app/dist ./dist

CMD ["node", "dist/index.js"]
