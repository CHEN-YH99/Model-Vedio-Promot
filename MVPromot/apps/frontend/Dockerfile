FROM node:24-alpine AS build

WORKDIR /app

COPY apps/frontend/package*.json ./
RUN npm install

COPY apps/frontend ./
RUN npm run build

FROM node:24-alpine

WORKDIR /app

COPY apps/frontend/server.mjs ./server.mjs
COPY --from=build /app/dist ./dist

EXPOSE 80

CMD ["node", "server.mjs"]
