# API Documentation (Part 1)

**Base URL:** `http://localhost:5000/api/v1`

## Authentication Endpoints

### POST `/auth/register`
Kullanıcı kaydı oluşturur.

**Request Body:**
```json
{
  "fullName": "string",
  "email": "string",
  "password": "string",
  "confirmPassword": "string",
  "role": "student" | "faculty" | "admin",
  "department": "string (optional, required for student/faculty)",
  "studentNumber": "string (optional, required for student)",
  "termsAccepted": boolean
}
```

**Response:** `201 Created`
```json
{
  "message": "Kayıt başarılı. Email doğrulama linki gönderildi.",
  "user": { ... }
}
```

### POST `/auth/verify-email`
Email doğrulama token'ı ile hesabı aktifleştirir.

**Request Body:**
```json
{
  "token": "string"
}
```

**Response:** `200 OK`
```json
{
  "message": "Email başarıyla doğrulandı."
}
```

### POST `/auth/login`
Kullanıcı girişi yapar.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "rememberMe": boolean (optional)
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "user": { ... }
}
```

**Token Süreleri:**
- Access Token: 15 dakika
- Refresh Token: 7 gün
- Remember Me: Token'lar localStorage'da saklanır (aksi halde sessionStorage)

### POST `/auth/refresh`
Access token'ı yeniler.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "string"
}
```

### POST `/auth/logout`
Kullanıcı çıkışı yapar.

**Request Body (optional):**
```json
{
  "refreshToken": "string"
}
```

**Response:** `200 OK`
```json
{
  "message": "Çıkış başarılı."
}
```

### POST `/auth/forgot-password`
Şifre sıfırlama email'i gönderir.

**Request Body:**
```json
{
  "email": "string"
}
```

**Response:** `200 OK`
```json
{
  "message": "Şifre sıfırlama linki email adresinize gönderildi."
}
```

**Not:** Reset token 24 saat geçerlidir.

### POST `/auth/reset-password`
Şifre sıfırlama token'ı ile yeni şifre belirler.

**Request Body:**
```json
{
  "token": "string",
  "password": "string",
  "confirmPassword": "string"
}
```

**Response:** `200 OK`
```json
{
  "message": "Şifre başarıyla güncellendi."
}
```

## User Endpoints

### GET `/users/me`
Kullanıcının kendi profil bilgilerini getirir.

**Headers:** `Authorization: Bearer <accessToken>`

**Response:** `200 OK`
```json
{
  "id": "number",
  "fullName": "string",
  "email": "string",
  "role": "string",
  "phone": "string",
  "profilePictureUrl": "string",
  "status": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### PUT `/users/me`
Kullanıcının kendi profil bilgilerini günceller.

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
```json
{
  "fullName": "string (optional)",
  "phone": "string (optional)"
}
```

**Response:** `200 OK`
```json
{
  "message": "Profil başarıyla güncellendi.",
  "user": { ... }
}
```

### POST `/users/me/change-password`
Kullanıcının şifresini değiştirir.

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Response:** `200 OK`
```json
{
  "message": "Şifre başarıyla güncellendi."
}
```

### POST `/users/me/profile-picture`
Kullanıcının profil fotoğrafını yükler.

**Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: multipart/form-data`

**Request Body:**
- `file`: File (jpg/png, max 5MB)

**Response:** `200 OK`
```json
{
  "message": "Profil fotoğrafı başarıyla yüklendi.",
  "profilePictureUrl": "string"
}
```

### GET `/users`
Admin kullanıcılar için kullanıcı listesi getirir.

**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 10)
- `role`: string (optional, filter by role)
- `department`: string (optional, filter by department)
- `search`: string (optional, search in fullName/email)

**Response:** `200 OK`
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## Error Responses

Tüm endpoint'ler hata durumunda aşağıdaki formatı kullanır:

**400 Bad Request:**
```json
{
  "message": "Validation error message"
}
```

**401 Unauthorized:**
```json
{
  "message": "Unauthorized. Please login."
}
```

**403 Forbidden:**
```json
{
  "message": "Access denied. Insufficient permissions."
}
```

**404 Not Found:**
```json
{
  "message": "Resource not found."
}
```

**500 Internal Server Error:**
```json
{
  "message": "Internal server error."
}
```

## Authentication

Çoğu endpoint için `Authorization` header'ında Bearer token gereklidir:

```
Authorization: Bearer <accessToken>
```

Token süresi dolduğunda, `refresh` endpoint'i kullanılarak yeni access token alınabilir.

