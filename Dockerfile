FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY global/package.json ./global/

RUN npm install

COPY tsconfig.base.json ./
COPY global ./global
COPY backend ./backend

RUN npm run build --workspace=backend

FROM node:22-alpine AS prod
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY global/package.json ./global/
COPY global ./global

RUN npm install --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "backend/dist/main.js"]
