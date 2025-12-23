# Veritabanı Bağlantı Sorunu Çözümü

## Sorun: "role postgres does not exist"

Bu hata, PostgreSQL'de `postgres` kullanıcısının olmadığını gösterir.

## Çözüm 1: PostgreSQL Kullanıcı Adınızı Bulun

### Windows'ta PostgreSQL Kullanıcı Adınızı Kontrol Edin:

1. **PostgreSQL servisini kontrol edin:**
```powershell
# PowerShell'de çalıştırın
Get-Service | Where-Object {$_.Name -like "*postgres*"}
```

2. **Varsayılan kullanıcı adı genellikle:**
   - Windows kullanıcı adınız (ör: `ranad`)
   - Veya `postgres` (eğer kurulumda oluşturulduysa)

## Çözüm 2: .env Dosyası Oluşturun

Backend klasöründe `.env` dosyası oluşturun:

```bash
cd smart_campus3_backend
```

`.env` dosyası oluşturun ve şu içeriği ekleyin:

```env
# Veritabanı Bağlantısı
# Format: postgres://KULLANICI_ADI:ŞİFRE@localhost:5432/VERİTABANI_ADI

# Örnek 1: Windows kullanıcı adınızla
DATABASE_URL=postgres://ranad:şifreniz@localhost:5432/campus

# Örnek 2: postgres kullanıcısıyla (eğer varsa)
# DATABASE_URL=postgres://postgres:şifreniz@localhost:5432/campus

# Örnek 3: Şifre yoksa
# DATABASE_URL=postgres://ranad@localhost:5432/campus
```

## Çözüm 3: PostgreSQL Kullanıcısı Oluşturun (İsteğe Bağlı)

Eğer `postgres` kullanıcısını oluşturmak isterseniz:

```sql
-- PostgreSQL'de (psql veya pgAdmin'de çalıştırın)
CREATE USER postgres WITH PASSWORD 'yourPassword';
ALTER USER postgres CREATEDB;
```

## Çözüm 4: Mevcut Kullanıcınızı Kullanın

### Adım 1: PostgreSQL'e bağlanın
```bash
# Windows'ta genellikle:
psql -U ranad -d postgres
# veya
psql -U your_username -d postgres
```

### Adım 2: Veritabanınızı kontrol edin
```sql
\l  -- Tüm veritabanlarını listeler
```

### Adım 3: .env dosyasını güncelleyin
Mevcut kullanıcı adınızı ve şifrenizi kullanın.

## Hızlı Test

### 1. PostgreSQL Bağlantısını Test Edin:
```bash
# PowerShell'de
psql -U your_username -d postgres
```

Bağlanabiliyorsanız, aynı bilgileri `.env` dosyasına yazın.

### 2. .env Dosyasını Oluşturduktan Sonra:
```bash
npx sequelize-cli db:migrate
```

## Alternatif: Docker Kullanıyorsanız

Eğer Docker ile PostgreSQL kullanıyorsanız:

```bash
# Docker container'ı kontrol edin
docker ps

# .env dosyasında:
DATABASE_URL=postgres://postgres:postgres@localhost:5432/campus
```

## Sorun Devam Ederse

1. **PostgreSQL servisinin çalıştığından emin olun:**
```powershell
Get-Service postgresql*
```

2. **Port'u kontrol edin:**
   - Varsayılan: `5432`
   - Farklıysa `.env` dosyasında güncelleyin

3. **Veritabanı adını kontrol edin:**
   - `.env` dosyasında `campus` yerine mevcut veritabanı adınızı yazın

