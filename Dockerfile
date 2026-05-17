FROM node:22-alpine
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

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "backend/dist/main.js"]
