# Production Deployment Rehberi

## ⚠️ ÖNEMLİ: Production'a Deploy Etmeden Önce

### 1. Veritabanı Migration'ları

**Production'da `sync()` kullanılmıyor!** Migration'ları manuel çalıştırmanız gerekiyor:

```bash
# Production sunucusunda
npx sequelize-cli db:migrate

# Veya migration dosyalarını manuel çalıştırın
```

**Migration Dosyaları:**
- `20251209000000-create-attendance-session.js`
- `20251209000001-create-attendance-record.js`

### 2. Environment Variables (.env)

Production sunucusunda şu environment variable'ları ayarlayın:

```env
# Database
DATABASE_URL=postgres://user:password@host:5432/database

# JWT
JWT_ACCESS_SECRET=your-production-secret-key
JWT_REFRESH_SECRET=your-production-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=production

# CORS (Frontend URL'leri)
CORS_ORIGIN=https://your-frontend-domain.com,https://www.your-frontend-domain.com

# Email (opsiyonel)
MAIL_FROM=noreply@yourdomain.com
APP_BASE_URL=https://your-frontend-domain.com

# Cloudinary (opsiyonel, profil resimleri için)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 3. Frontend Environment Variables

Frontend'de production build için:

```env
VITE_API_BASE_URL=https://your-backend-api.com/api/v1
VITE_APP_NAME=SmartCampus
```

### 4. Build ve Deploy

**Backend:**
```bash
npm install --production
# Migration'ları çalıştır
npx sequelize-cli db:migrate
# Server'ı başlat
npm start
```

**Frontend:**
```bash
npm install
npm run build
# dist/ klasörünü production sunucusuna deploy edin
```

### 5. Güvenlik Kontrolleri

- ✅ `.env` dosyası `.gitignore`'da
- ✅ Production'da `sync()` kullanılmıyor
- ✅ CORS sadece belirlenen origin'lerden izin veriyor
- ✅ JWT secret'lar production'da güçlü olmalı
- ✅ HTTPS kullanın (konum servisi için gerekli)

### 6. Test Checklist

Deploy sonrası test edin:

- [ ] Backend API çalışıyor mu? (`/api/v1` endpoint'i)
- [ ] Veritabanı bağlantısı başarılı mı?
- [ ] Migration'lar çalıştırıldı mı? (AttendanceSessions ve AttendanceRecords tabloları var mı?)
- [ ] Frontend backend'e bağlanabiliyor mu?
- [ ] CORS çalışıyor mu?
- [ ] Authentication çalışıyor mu?
- [ ] Yoklama oluşturma çalışıyor mu? (Admin/Faculty)
- [ ] Aktif yoklamalar listeleniyor mu? (Student)
- [ ] Yoklamaya katılma çalışıyor mu? (Student, mesafe kontrolü ile)

### 7. Olası Sorunlar

**Problem:** Migration'lar çalışmıyor
- **Çözüm:** `npx sequelize-cli db:migrate` komutunu manuel çalıştırın

**Problem:** CORS hatası
- **Çözüm:** `CORS_ORIGIN` environment variable'ında frontend URL'ini ekleyin

**Problem:** Konum servisi çalışmıyor
- **Çözüm:** HTTPS kullanın (HTTP'de konum servisi çalışmaz)

**Problem:** Veritabanı bağlantı hatası
- **Çözüm:** `DATABASE_URL` environment variable'ını kontrol edin

### 8. Monitoring

Production'da şunları izleyin:
- API response time'ları
- Error log'ları
- Veritabanı bağlantı durumu
- Disk kullanımı (log dosyaları için)

