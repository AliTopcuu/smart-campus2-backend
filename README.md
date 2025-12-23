# Backend - SmartCampus

Node.js, Express, Sequelize ve PostgreSQL tabanlı RESTful API backend servisi.

## 🌐 Canlı Uygulama

**Frontend:** [https://smart-campus2-frontend-production.up.railway.app/login](https://smart-campus2-frontend-production.up.railway.app/login)

## 🔧 Teknolojiler

- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Sequelize
- **Database:** PostgreSQL
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt
- **File Upload:** Multer
- **Email:** Nodemailer
- **Validation:** Yup

## 📋 Gereksinimler

- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose (önerilen)

## 🚀 Kurulum

### Docker ile (Önerilen)

1. Proje kök dizininde `docker-compose.yml` dosyasını kontrol edin
2. Gmail SMTP ayarlarını yapılandırın (opsiyonel):
   ```yaml
   MAIL_USER: your-email@gmail.com
   MAIL_PASS: your-app-password
   MAIL_FROM: your-email@gmail.com
   ```
3. Servisleri başlatın:
   ```bash
   docker-compose up -d
   ```
4. Veritabanı migration ve seed'lerini çalıştırın:
   ```bash
   docker-compose exec backend npx sequelize-cli db:migrate
   docker-compose exec backend npx sequelize-cli db:seed:all
   ```

### Manuel Kurulum

1. Bağımlılıkları yükleyin:
   ```bash
   cd backend
   npm install
   ```

2. Ortam değişkenlerini ayarlayın (`.env` dosyası oluşturun):
   ```env
   PORT=5000
   DATABASE_URL=postgres://user:password@localhost:5432/campus
   JWT_ACCESS_SECRET=your-access-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   APP_BASE_URL=http://localhost:5173
   CORS_ORIGIN=http://localhost:5173
   
   # SMTP Ayarları (Opsiyonel)
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USER=your-email@gmail.com
   MAIL_PASS=your-app-password
   MAIL_FROM=your-email@gmail.com
   ```

3. PostgreSQL veritabanını oluşturun:
   ```sql
   CREATE DATABASE campus;
   ```

4. Migration'ları çalıştırın:
   ```bash
   npx sequelize-cli db:migrate
   ```

5. Seed verilerini yükleyin:
   ```bash
   npx sequelize-cli db:seed:all
   ```

## 📊 Seed Data (Demo Kullanıcılar)

Seed işlemi sonrası aşağıdaki demo kullanıcılar oluşturulur:

### Admin Kullanıcı
- **Email:** `admin@smartcampus.edu`
- **Password:** `Password123`
- **Role:** Admin

### Öğrenci Kullanıcılar (5 adet)
- **Email:** `student1@smartcampus.edu` - `student5@smartcampus.edu`
- **Password:** `Password123`
- **Role:** Student
- **Student Numbers:** 2020001 - 2020005
- **GPA:** 3.0 (tüm öğrenciler)
- **CGPA:** 3.1 (tüm öğrenciler)
- **Departments:** Bilgisayar Mühendisliği, Elektrik-Elektronik Mühendisliği, Endüstri Mühendisliği, İşletme, İktisat (döngüsel olarak atanır)

### Akademisyen Kullanıcılar (2 adet)
- **Email:** `faculty1@smartcampus.edu`, `faculty2@smartcampus.edu`
- **Password:** `Password123`
- **Role:** Faculty
- **Employee Numbers:** EMP-1, EMP-2
- **Titles:** Professor (faculty1), Assistant Professor (faculty2)
- **Departments:** Bilgisayar Mühendisliği, Elektrik-Elektronik Mühendisliği (sırayla atanır)

### Bölümler (Departments)
Seed işlemi aşağıdaki bölümleri oluşturur:
- Bilgisayar Mühendisliği (Mühendislik Fakültesi)
- Elektrik-Elektronik Mühendisliği (Mühendislik Fakültesi)
- Endüstri Mühendisliği (Mühendislik Fakültesi)
- İşletme (İşletme Fakültesi)
- İktisat (İktisadi ve İdari Bilimler Fakültesi)

**Not:** Tüm demo kullanıcılar için şifre: `Password123`

6. Sunucuyu başlatın:
   ```bash
   npm start
   # veya geliştirme modu için
   npm run dev
   ```

## 📡 API Endpoints

Detaylı API dokümantasyonu için:
- **Part 1-2:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Part 3:** [docs/API_DOCUMENTATION_PART3.md](./docs/API_DOCUMENTATION_PART3.md)

### Authentication
- `POST /api/v1/auth/register` - Kullanıcı kaydı
- `POST /api/v1/auth/verify-email` - Email doğrulama
- `POST /api/v1/auth/login` - Giriş
- `POST /api/v1/auth/refresh` - Token yenileme
- `POST /api/v1/auth/logout` - Çıkış
- `POST /api/v1/auth/forgot-password` - Şifre sıfırlama talebi
- `POST /api/v1/auth/reset-password` - Şifre sıfırlama

### Users
- `GET /api/v1/users/me` - Kullanıcı profil bilgileri
- `PUT /api/v1/users/me` - Profil güncelleme
- `POST /api/v1/users/me/change-password` - Şifre değiştirme
- `POST /api/v1/users/me/profile-picture` - Profil fotoğrafı yükleme
- `GET /api/v1/users` - Kullanıcı listesi (admin)

## 🔐 Authentication

### JWT Token Yapısı

- **Access Token:** 15 dakika geçerlilik süresi
- **Refresh Token:** 7 gün geçerlilik süresi
- **Reset Token:** 24 saat geçerlilik süresi

### Token Kullanımı

Çoğu endpoint için `Authorization` header'ında Bearer token gereklidir:

```
Authorization: Bearer <accessToken>
```

Token süresi dolduğunda, `/auth/refresh` endpoint'i kullanılarak yeni access token alınabilir.

## 📁 Proje Yapısı

```
backend/
├── src/
│   ├── controllers/      # Route handler'ları
│   ├── middleware/        # Auth, validation, error handling
│   ├── models/           # Sequelize modelleri
│   ├── routes/           # Route tanımları
│   ├── services/         # İş mantığı
│   ├── migrations/       # Veritabanı migration'ları
│   ├── seeders/          # Seed dosyaları
│   ├── utils/            # Yardımcı fonksiyonlar
│   ├── app.js            # Express uygulaması
│   └── server.js         # Sunucu başlatma
├── Dockerfile
└── package.json
```

## 📝 Veritabanı

Detaylı veritabanı şeması için:
- **Part 1-2:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- **Part 3 Updates:** [docs/DATABASE_SCHEMA_UPDATE.md](./docs/DATABASE_SCHEMA_UPDATE.md)

### Migration Komutları

```bash
# Tüm migration'ları çalıştır
npx sequelize-cli db:migrate

# Son migration'ı geri al
npx sequelize-cli db:migrate:undo

# Tüm migration'ları geri al
npx sequelize-cli db:migrate:undo:all

# Seed çalıştır
npx sequelize-cli db:seed:all
```

## 📧 Email Yapılandırması

SMTP ayarları yapılandırılmadığında, email doğrulama ve şifre sıfırlama linkleri konsola loglanır. Gmail kullanımı için:

1. Google Hesabınızda 2 adımlı doğrulamayı etkinleştirin
2. Uygulama şifresi oluşturun: [Google Account Settings](https://myaccount.google.com/apppasswords)
3. 16 haneli uygulama şifresini `MAIL_PASS` olarak ayarlayın

## 🔒 Güvenlik

- Şifreler bcrypt ile hashlenir (salt rounds: 10)
- JWT token'lar güvenli secret'lar ile imzalanır
- CORS yapılandırması ile sadece izin verilen origin'lerden istek kabul edilir
- Helmet.js ile HTTP header güvenliği sağlanır
- File upload'lar için dosya tipi ve boyut kontrolü yapılır (max 5MB, jpg/png)

## 🐛 Hata Ayıklama

Loglar konsola yazdırılır. Geliştirme modunda detaylı hata mesajları gösterilir.

## 📄 Lisans

ISC
