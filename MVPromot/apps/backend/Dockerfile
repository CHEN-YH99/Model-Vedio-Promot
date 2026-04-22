FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY apps/backend/package*.json ./
RUN npm install

COPY apps/backend ./

EXPOSE 3000

CMD ["npm", "run", "dev"]
