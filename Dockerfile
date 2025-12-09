FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY config ./config
COPY migrations ./migrations
COPY models ./models
COPY seeders ./seeders
COPY uploads ./uploads
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "src/server.js"]

