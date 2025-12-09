# Database Schema (Part 1)

## Tablolar

### Users
Kullanıcı ana tablosu.

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| id | INTEGER (PK) | Birincil anahtar |
| fullName | STRING | Kullanıcının tam adı |
| email | STRING (UNIQUE) | Email adresi (unique) |
| passwordHash | STRING | Bcrypt ile hashlenmiş şifre |
| role | ENUM | Kullanıcı rolü: 'student', 'faculty', 'admin' |
| status | ENUM | Hesap durumu: 'pending', 'active', 'suspended' |
| verificationToken | STRING (NULL) | Email doğrulama token'ı |
| verificationExpires | DATE (NULL) | Email doğrulama token süresi |
| resetToken | STRING (NULL) | Şifre sıfırlama token'ı |
| resetExpires | DATE (NULL) | Şifre sıfırlama token süresi |
| phone | STRING (NULL) | Telefon numarası |
| profilePictureUrl | STRING (NULL) | Profil fotoğrafı URL'i |
| createdAt | DATE | Oluşturulma tarihi |
| updatedAt | DATE | Güncellenme tarihi |

### Students
Öğrenci bilgileri tablosu.

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| id | INTEGER (PK) | Birincil anahtar |
| userId | INTEGER (FK) | Users tablosuna referans |
| studentNumber | STRING (UNIQUE) | Öğrenci numarası (unique) |
| departmentId | INTEGER (FK) | Departments tablosuna referans |
| gpa | DECIMAL (NULL) | Genel not ortalaması |
| cgpa | DECIMAL (NULL) | Kümülatif not ortalaması |
| createdAt | DATE | Oluşturulma tarihi |
| updatedAt | DATE | Güncellenme tarihi |

### Faculties
Akademisyen bilgileri tablosu.

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| id | INTEGER (PK) | Birincil anahtar |
| userId | INTEGER (FK) | Users tablosuna referans |
| employeeNumber | STRING (UNIQUE) | Personel numarası (unique) |
| title | STRING (NULL) | Unvan (Prof. Dr., Doç. Dr., vb.) |
| departmentId | INTEGER (FK) | Departments tablosuna referans |
| createdAt | DATE | Oluşturulma tarihi |
| updatedAt | DATE | Güncellenme tarihi |

### Departments
Bölüm bilgileri tablosu.

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| id | INTEGER (PK) | Birincil anahtar |
| name | STRING | Bölüm adı |
| code | STRING (UNIQUE) | Bölüm kodu (unique) |
| faculty | STRING | Fakülte adı |
| createdAt | DATE | Oluşturulma tarihi |
| updatedAt | DATE | Güncellenme tarihi |

## İlişkiler

### Users ↔ Students
- **Tip:** One-to-One
- **Açıklama:** Her kullanıcı en fazla bir öğrenci kaydına sahip olabilir
- **Foreign Key:** `Students.userId` → `Users.id`

### Users ↔ Faculties
- **Tip:** One-to-One
- **Açıklama:** Her kullanıcı en fazla bir akademisyen kaydına sahip olabilir
- **Foreign Key:** `Faculties.userId` → `Users.id`

### Departments ↔ Students
- **Tip:** One-to-Many
- **Açıklama:** Bir bölümde birden fazla öğrenci olabilir
- **Foreign Key:** `Students.departmentId` → `Departments.id`

### Departments ↔ Faculties
- **Tip:** One-to-Many
- **Açıklama:** Bir bölümde birden fazla akademisyen olabilir
- **Foreign Key:** `Faculties.departmentId` → `Departments.id`

## Migrations

Tüm tablolar Sequelize migrations ile oluşturulmuştur. Migration dosyaları `backend/src/migrations/` klasöründe bulunur:

- `20251208001740-create-user.js` - Users tablosu
- `20251208001924-create-department.js` - Departments tablosu
- `20251208002754-create-student.js` - Students tablosu
- `20251208002811-create-faculty.js` - Faculties tablosu
- `20251208010000-add-reset-columns-to-users.js` - Reset token kolonları
- `20251208021000-add-profile-and-phone-to-users.js` - Profil ve telefon kolonları

## Seed Data

Seed dosyası `backend/src/migrations/20251208004718-demo-users.js` ile örnek veriler oluşturulur:

- **1 Admin kullanıcı**
- **5 Öğrenci kullanıcı**
- **2 Akademisyen kullanıcı**
- **3 Bölüm**

Seed çalıştırma:
```bash
npx sequelize-cli db:seed:all
```

## Notlar

- Tüm tablolarda `createdAt` ve `updatedAt` otomatik olarak Sequelize tarafından yönetilir
- `sequelize.sync()` açılışta tabloları senkronize eder (production'da kullanılmamalı)
- Email ve öğrenci/personel numaraları unique constraint'e sahiptir
- Şifreler bcrypt ile hashlenerek saklanır (salt rounds: 10)

