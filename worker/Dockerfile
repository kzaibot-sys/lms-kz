FROM node:20-alpine

RUN apk add --no-cache ffmpeg python3 py3-pip curl

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
