# Part 3 Özelliklerini Test Etme Rehberi

## 1. Backend Hazırlık

### 1.1 Migration'ları Çalıştır
```bash
cd smart_campus3_backend
npx sequelize-cli db:migrate
```

Bu komut `ClassroomReservations` tablosunu oluşturacak.

### 1.2 Backend'i Başlat
```bash
npm run dev
# veya
npm start
```

Backend'in `http://localhost:3000` (veya belirlediğiniz port) üzerinde çalıştığını kontrol edin.

---

## 2. Frontend Hazırlık

### 2.1 Frontend'i Başlat
```bash
cd smart_campus3_frontend
npm run dev
```

Frontend'in `http://localhost:5173` (veya belirlediğiniz port) üzerinde çalıştığını kontrol edin.

---

## 3. Test Senaryoları

### 3.1 Derslik Rezervasyon Sistemi

#### Test 1: Derslik Listesini Görüntüleme
1. Frontend'de giriş yapın (herhangi bir kullanıcı)
2. `/reservations` sayfasına gidin
3. **Beklenen**: Mevcut derslikler listelenmeli

#### Test 2: Yeni Rezervasyon Oluşturma
1. `/reservations` sayfasında "Yeni Rezervasyon" butonuna tıklayın
2. Formu doldurun:
   - Derslik seçin
   - Tarih seçin (bugünden ileri bir tarih)
   - Başlangıç ve bitiş saatleri girin
   - Amaç yazın
3. "Rezerve Et" butonuna tıklayın
4. **Beklenen**: 
   - Admin iseniz: Rezervasyon direkt "approved" olmalı
   - Diğer kullanıcılar: Rezervasyon "pending" olmalı

#### Test 3: Rezervasyon Listesi
1. `/reservations` sayfasında "Rezervasyonlarım" bölümünü kontrol edin
2. **Beklenen**: Oluşturduğunuz rezervasyonlar listelenmeli

#### Test 4: Rezervasyon İptal Etme
1. "pending" durumundaki bir rezervasyonu seçin
2. "İptal Et" butonuna tıklayın
3. **Beklenen**: Rezervasyon "cancelled" durumuna geçmeli

#### Test 5: Admin - Rezervasyon Onaylama (Admin kullanıcı ile)
1. Admin olarak giriş yapın
2. `/reservations` sayfasına gidin
3. "pending" durumundaki rezervasyonları görün
4. Backend API'yi kullanarak onaylayın:
   ```bash
   # Postman veya curl ile
   PUT http://localhost:3000/api/v1/reservations/{id}/approve
   Authorization: Bearer {admin_token}
   ```
5. **Beklenen**: Rezervasyon "approved" durumuna geçmeli

#### Test 6: Çakışma Kontrolü
1. Aynı derslik, tarih ve saat için iki rezervasyon oluşturmaya çalışın
2. **Beklenen**: İkinci rezervasyon reddedilmeli, "Classroom is already reserved" hatası almalısınız

---

### 3.2 Otomatik Ders Programı Oluşturma (Admin)

#### Test 1: Section'ları Görüntüleme
1. Admin olarak giriş yapın
2. `/admin/scheduling/generate` sayfasına gidin
3. Dönem ve yıl seçin
4. **Beklenen**: O döneme ait section'lar listelenmeli

#### Test 2: Program Oluşturma
1. Birkaç section seçin (checkbox ile)
2. "Program Oluştur" butonuna tıklayın
3. **Beklenen**: 
   - Loading gösterilmeli
   - Başarılı olursa: Oluşturulan program tablosu görünmeli
   - Başarısız olursa: Hata mesajı gösterilmeli (ör: çok fazla section, çakışma)

#### Test 3: Programı Uygulama
1. Oluşturulan programı kontrol edin
2. "Programı Uygula" butonuna tıklayın
3. **Beklenen**: 
   - Başarı mesajı gösterilmeli
   - Section'ların `scheduleJson` alanları güncellenmiş olmalı
   - Section'ların `classroomId` alanları atanmış olmalı

#### Test 4: Program Oluşturma Kısıtları
1. Çok fazla section seçin (ör: 20+)
2. Program oluşturmayı deneyin
3. **Beklenen**: Eğer çözüm bulunamazsa hata mesajı almalısınız

---

### 3.3 Program Görüntüleme

#### Test 1: Öğrenci Programı
1. Öğrenci olarak giriş yapın
2. Kayıtlı olduğunuz section'ların programı olmalı
3. `/schedule` sayfasına gidin
4. Dönem ve yıl seçin
5. **Beklenen**: 
   - Haftalık program tablosu görünmeli
   - Kayıtlı olduğunuz dersler gösterilmeli
   - Derslik bilgileri gösterilmeli

#### Test 2: Öğretim Üyesi Programı
1. Öğretim üyesi olarak giriş yapın
2. `/schedule` sayfasına gidin
3. **Beklenen**: Verdiğiniz derslerin programı görünmeli

#### Test 3: iCal Export
1. `/schedule` sayfasında dönem ve yıl seçin
2. "iCal İndir" butonuna tıklayın
3. **Beklenen**: 
   - `.ics` dosyası indirilmeli
   - Dosyayı Google Calendar, Outlook vb. açabilmelisiniz
   - Tüm dersler doğru tarih ve saatlerle görünmeli

---

## 4. Backend API Testleri (Postman/curl)

### 4.1 Derslik Rezervasyon Endpoints

```bash
# 1. Derslik listesi
GET http://localhost:3000/api/v1/courses/classrooms
Authorization: Bearer {token}

# 2. Rezervasyon oluştur
POST http://localhost:3000/api/v1/reservations
Authorization: Bearer {token}
Content-Type: application/json
{
  "classroomId": 1,
  "date": "2024-12-25",
  "startTime": "10:00",
  "endTime": "12:00",
  "purpose": "Proje sunumu"
}

# 3. Rezervasyon listesi
GET http://localhost:3000/api/v1/reservations
Authorization: Bearer {token}

# 4. Rezervasyon onayla (Admin)
PUT http://localhost:3000/api/v1/reservations/{id}/approve
Authorization: Bearer {admin_token}

# 5. Rezervasyon reddet (Admin)
PUT http://localhost:3000/api/v1/reservations/{id}/reject
Authorization: Bearer {admin_token}
Content-Type: application/json
{
  "rejectionReason": "Derslik müsait değil"
}

# 6. Rezervasyon iptal et
DELETE http://localhost:3000/api/v1/reservations/{id}
Authorization: Bearer {token}
```

### 4.2 Scheduling Endpoints

```bash
# 1. Program oluştur (Admin)
POST http://localhost:3000/api/v1/scheduling/generate
Authorization: Bearer {admin_token}
Content-Type: application/json
{
  "sectionIds": [1, 2, 3],
  "semester": "Fall",
  "year": 2024
}

# 2. Programı uygula (Admin)
POST http://localhost:3000/api/v1/scheduling/apply
Authorization: Bearer {admin_token}
Content-Type: application/json
{
  "semester": "Fall",
  "year": 2024,
  "scheduleItems": [
    {
      "sectionId": 1,
      "classroomId": 1,
      "day": "monday",
      "startTime": "09:00",
      "endTime": "10:30"
    }
  ]
}

# 3. Programımı görüntüle
GET http://localhost:3000/api/v1/scheduling/my-schedule?semester=Fall&year=2024
Authorization: Bearer {token}

# 4. iCal export
GET http://localhost:3000/api/v1/scheduling/my-schedule/ical?semester=Fall&year=2024
Authorization: Bearer {token}
```

---

## 5. Veritabanı Kontrolleri

### 5.1 ClassroomReservations Tablosu
```sql
-- Rezervasyonları kontrol et
SELECT * FROM "ClassroomReservations" ORDER BY "createdAt" DESC;

-- Durum dağılımı
SELECT status, COUNT(*) FROM "ClassroomReservations" GROUP BY status;
```

### 5.2 CourseSections Tablosu
```sql
-- Program atanmış section'ları kontrol et
SELECT id, "sectionNumber", "scheduleJson", "classroomId" 
FROM "CourseSections" 
WHERE "scheduleJson" IS NOT NULL;

-- Program detayları
SELECT id, "sectionNumber", "scheduleJson"->'scheduleItems' as schedule
FROM "CourseSections"
WHERE "scheduleJson" IS NOT NULL;
```

---

## 6. Hata Senaryoları Testleri

### 6.1 Derslik Rezervasyon Hataları
- ✅ Geçmiş tarih için rezervasyon yapılamaz
- ✅ Başlangıç saati bitiş saatinden sonra olamaz
- ✅ Aynı derslik ve saatte çakışan rezervasyon olamaz
- ✅ Derslik mevcut değilse hata verir

### 6.2 Program Oluşturma Hataları
- ✅ Section seçilmeden program oluşturulamaz
- ✅ Çok fazla section için çözüm bulunamazsa hata verir
- ✅ Çakışan kısıtlar varsa hata verir

---

## 7. Performans Kontrolleri

### 7.1 Program Oluşturma Süresi
- 5 section: ~1-2 saniye
- 10 section: ~5-10 saniye
- 20+ section: ~30+ saniye (veya timeout)

**Not**: Çok fazla section için algoritma optimize edilebilir.

---

## 8. UI/UX Kontrolleri

### 8.1 Responsive Tasarım
- ✅ Mobil görünümde tablolar scroll edilebilmeli
- ✅ Formlar mobilde düzgün görünmeli

### 8.2 Loading States
- ✅ API çağrıları sırasında loading gösterilmeli
- ✅ Butonlar disabled olmalı

### 8.3 Error Handling
- ✅ Hata mesajları kullanıcı dostu olmalı
- ✅ Toast/Alert mesajları gösterilmeli

---

## 9. Güvenlik Kontrolleri

### 9.1 Yetkilendirme
- ✅ Sadece admin program oluşturabilir
- ✅ Kullanıcılar sadece kendi rezervasyonlarını görebilir
- ✅ Admin tüm rezervasyonları görebilir

### 9.2 Validasyon
- ✅ Tarih validasyonu (geçmiş tarih kabul edilmez)
- ✅ Saat validasyonu (başlangıç < bitiş)
- ✅ Derslik ID validasyonu

---

## 10. Son Kontroller

### 10.1 Console Hataları
- Browser console'da hata olmamalı
- Network tab'da başarısız istek olmamalı

### 10.2 Veri Tutarlılığı
- Rezervasyonlar doğru dersliklere atanmış olmalı
- Programlar section'lara doğru atanmış olmalı
- Classroom ID'ler doğru olmalı

---

## Sorun Giderme

### Migration Hatası
```bash
# Migration'ı geri al
npx sequelize-cli db:migrate:undo

# Tekrar çalıştır
npx sequelize-cli db:migrate
```

### API Hatası
- Backend loglarını kontrol edin
- Token'ın geçerli olduğundan emin olun
- CORS ayarlarını kontrol edin

### Frontend Hatası
- Browser console'u kontrol edin
- Network tab'da API yanıtlarını kontrol edin
- React DevTools ile state'i kontrol edin

