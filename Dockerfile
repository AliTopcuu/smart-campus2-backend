FROM node:20-alpine

WORKDIR /app

# Paket dosyalarını kopyala ve yükle
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# BURASI DEĞİŞTİ:
# Sadece 'src' klasörünü değil, tüm projeyi kopyala.
# .dockerignore dosyan zaten gereksizleri (node_modules, .env vb.) engelliyor.
COPY . .

# Environment
ENV NODE_ENV=production

# Port
EXPOSE 5000

# Başlat
CMD ["node", "src/server.js"]