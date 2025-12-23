# API Documentation - Part 3

## Meal Management API

### Base URL
```
/api/meals
```

### Endpoints

#### 1. Get All Menus
**GET** `/menus`

Get list of meal menus with optional filters.

**Query Parameters:**
- `startDate` (optional): Filter menus from this date (YYYY-MM-DD)
- `endDate` (optional): Filter menus until this date (YYYY-MM-DD)
- `cafeteriaId` (optional): Filter by cafeteria ID
- `mealType` (optional): Filter by meal type (LUNCH, DINNER)

**Response:**
```json
[
  {
    "id": 1,
    "date": "2025-12-25",
    "mealType": "LUNCH",
    "itemsJson": {...},
    "nutritionJson": {...},
    "isPublished": true,
    "cafeteria": {
      "id": 1,
      "name": "Main Cafeteria",
      "location": "Building A"
    }
  }
]
```

#### 2. Get Menu by ID
**GET** `/menus/:id`

Get a specific menu by ID.

**Response:**
```json
{
  "id": 1,
  "date": "2025-12-25",
  "mealType": "LUNCH",
  "itemsJson": {...},
  "nutritionJson": {...},
  "isPublished": true,
  "cafeteria": {...}
}
```

#### 3. Create Menu (Admin Only)
**POST** `/menus`

Create a new meal menu.

**Request Body:**
```json
{
  "date": "2025-12-25",
  "mealType": "LUNCH",
  "cafeteriaId": 1,
  "itemsJson": {
    "main": "Grilled Chicken",
    "side": "Rice",
    "salad": "Caesar Salad",
    "dessert": "Fruit"
  },
  "nutritionJson": {
    "calories": 650,
    "protein": 45,
    "carbs": 60,
    "fat": 20
  },
  "isPublished": true
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "date": "2025-12-25",
  "mealType": "LUNCH",
  ...
}
```

#### 4. Update Menu (Admin Only)
**PUT** `/menus/:id`

Update an existing menu.

**Request Body:** (Same as create, all fields optional)

#### 5. Delete Menu (Admin Only)
**DELETE** `/menus/:id`

Delete a menu.

**Response:** 200 OK

#### 6. Get Cafeterias
**GET** `/cafeterias`

Get list of all cafeterias.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Main Cafeteria",
    "location": "Building A",
    "capacity": 200
  }
]
```

#### 7. Create Cafeteria (Admin Only)
**POST** `/cafeterias`

**Request Body:**
```json
{
  "name": "Main Cafeteria",
  "location": "Building A",
  "capacity": 200
}
```

#### 8. Delete Cafeteria (Admin Only)
**DELETE** `/cafeterias/:id`

#### 9. Create Reservation
**POST** `/reservations`

Create a meal reservation.

**Request Body:**
```json
{
  "menuId": 1,
  "mealType": "LUNCH"
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "userId": 5,
  "menuId": 1,
  "status": "PENDING",
  "qrCode": "MEAL-1-5-abc123",
  "createdAt": "2025-12-23T10:00:00Z"
}
```

#### 10. Get My Reservations
**GET** `/reservations/my`

Get current user's meal reservations.

**Response:**
```json
[
  {
    "id": 1,
    "menuId": 1,
    "status": "PENDING",
    "qrCode": "MEAL-1-5-abc123",
    "menu": {
      "date": "2025-12-25",
      "mealType": "LUNCH"
    }
  }
]
```

#### 11. Scan Reservation (Admin/Staff Only)
**POST** `/reservations/scan`

Scan QR code to process meal reservation.

**Request Body:**
```json
{
  "qrCode": "MEAL-1-5-abc123"
}
```

**Response:**
```json
{
  "message": "Yemek başarıyla teslim edildi",
  "user": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "menu": {
    "date": "2025-12-25",
    "mealType": "LUNCH"
  },
  "amount": 0,
  "isFree": true
}
```

#### 12. Cancel Reservation
**DELETE** `/reservations/:reservationId`

Cancel a meal reservation.

**Response:** 200 OK

---

## Event Management API

### Base URL
```
/api/events
```

### Endpoints

#### 1. List Events
**GET** `/`

Get list of all events.

**Query Parameters:**
- `status` (optional): Filter by status (active, cancelled, completed)
- `category` (optional): Filter by category

**Response:**
```json
[
  {
    "id": 1,
    "title": "Tech Conference 2025",
    "description": "Annual technology conference",
    "date": "2025-12-30T10:00:00Z",
    "location": "Conference Hall",
    "capacity": 100,
    "currentParticipants": 45,
    "status": "active",
    "category": "CONFERENCE"
  }
]
```

#### 2. Get Event by ID
**GET** `/:id`

Get event details.

**Response:**
```json
{
  "id": 1,
  "title": "Tech Conference 2025",
  "description": "Annual technology conference",
  "date": "2025-12-30T10:00:00Z",
  "location": "Conference Hall",
  "capacity": 100,
  "currentParticipants": 45,
  "status": "active",
  "category": "CONFERENCE",
  "surveySchema": {...}
}
```

#### 3. Create Event (Admin Only)
**POST** `/`

**Request Body:**
```json
{
  "title": "Tech Conference 2025",
  "description": "Annual technology conference",
  "date": "2025-12-30T10:00:00Z",
  "location": "Conference Hall",
  "capacity": 100,
  "category": "CONFERENCE",
  "surveySchema": {
    "questions": [
      {
        "type": "rating",
        "question": "How would you rate this event?",
        "required": true
      }
    ]
  }
}
```

**Response:** 201 Created

#### 4. Update Event (Admin Only)
**PUT** `/:id`

**Request Body:** (All fields optional)
```json
{
  "title": "Updated Title",
  "status": "cancelled",
  "capacity": 150
}
```

#### 5. Delete Event (Admin Only)
**DELETE** `/:id`

#### 6. Register for Event
**POST** `/register`

Register current user for an event.

**Request Body:**
```json
{
  "eventId": 1
}
```

**Response:** 201 Created
```json
{
  "message": "Successfully registered for event",
  "registration": {
    "id": 1,
    "eventId": 1,
    "userId": 5,
    "status": "registered",
    "qrCode": "EVENT-1-5-xyz789"
  }
}
```

#### 7. Get My Registrations
**GET** `/my-registrations`

Get current user's event registrations.

**Response:**
```json
[
  {
    "id": 1,
    "eventId": 1,
    "status": "registered",
    "qrCode": "EVENT-1-5-xyz789",
    "event": {
      "title": "Tech Conference 2025",
      "date": "2025-12-30T10:00:00Z",
      "location": "Conference Hall"
    }
  }
]
```

#### 8. Check-In (Admin/Faculty Only)
**POST** `/check-in`

Check-in a participant using QR code.

**Request Body:**
```json
{
  "qrCodeData": "EVENT-1-5-xyz789"
}
```

**Response:**
```json
{
  "message": "Check-in successful",
  "registration": {
    "id": 1,
    "status": "checked_in",
    "checkedInAt": "2025-12-30T09:45:00Z"
  }
}
```

#### 9. Get Event Participants (Admin Only)
**GET** `/:id/participants`

Get list of all participants for an event.

**Response:**
```json
[
  {
    "id": 1,
    "userId": 5,
    "status": "registered",
    "checkedInAt": null,
    "user": {
      "fullName": "John Doe",
      "email": "john@example.com"
    }
  }
]
```

#### 10. Remove Participant (Admin Only)
**DELETE** `/:id/participants/:registrationId`

Remove a participant from an event.

---

## Scheduling API

### Base URL
```
/api/scheduling
```

### Endpoints

#### 1. Generate Schedule (Admin Only)
**POST** `/generate`

Generate automatic schedule using CSP algorithm.

**Request Body:**
```json
{
  "sectionIds": [1, 2, 3, 4, 5],
  "semester": "FALL",
  "year": 2025
}
```

**Response:**
```json
{
  "semester": "FALL",
  "year": 2025,
  "generatedAt": "2025-12-23T10:00:00Z",
  "scheduleItems": [
    {
      "sectionId": 1,
      "classroomId": 5,
      "day": "monday",
      "startTime": "09:00",
      "endTime": "10:30"
    }
  ],
  "sections": [
    {
      "id": 1,
      "courseCode": "CEN205",
      "sectionNumber": 1,
      "instructor": "Dr. John Smith"
    }
  ]
}
```

#### 2. Apply Schedule (Admin Only)
**POST** `/apply`

Apply generated schedule to sections.

**Request Body:**
```json
{
  "semester": "FALL",
  "year": 2025,
  "scheduleItems": [
    {
      "sectionId": 1,
      "classroomId": 5,
      "day": "monday",
      "startTime": "09:00",
      "endTime": "10:30"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Schedule applied successfully",
  "scheduleData": {...}
}
```

#### 3. Get My Schedule
**GET** `/my-schedule`

Get current user's schedule (student or instructor).

**Query Parameters:**
- `semester` (required): Semester (FALL, SPRING)
- `year` (required): Year (e.g., 2025)

**Response:**
```json
{
  "monday": [
    {
      "sectionId": 1,
      "courseCode": "CEN205",
      "courseName": "Computer Architectures",
      "sectionNumber": 1,
      "startTime": "09:00",
      "endTime": "10:30",
      "classroom": "Building A 101",
      "instructor": "Dr. John Smith"
    }
  ],
  "tuesday": [...],
  "wednesday": [...],
  "thursday": [...],
  "friday": [...]
}
```

#### 4. Export Schedule as iCal
**GET** `/my-schedule/ical`

Export schedule as iCal file.

**Query Parameters:**
- `semester` (required)
- `year` (required)

**Response:** iCal file download

---

## Payment/Wallet API

### Base URL
```
/api/wallet
```

### Endpoints

#### 1. Get Balance
**GET** `/balance`

Get current user's wallet balance.

**Response:**
```json
{
  "balance": 150.50,
  "currency": "TRY"
}
```

#### 2. Create Topup Session
**POST** `/topup`

Create payment session for wallet topup.

**Request Body:**
```json
{
  "amount": 100
}
```

**Response:**
```json
{
  "message": "Ödeme oturumu oluşturuldu.",
  "paymentUrl": "http://localhost:5173/payment-mock?session_id=abc123&amount=100",
  "sessionId": "abc123"
}
```

#### 3. Payment Webhook
**POST** `/topup/webhook`

Handle payment webhook callback.

**Request Body:**
```json
{
  "sessionId": "abc123",
  "status": "success",
  "amount": 100,
  "userId": 5
}
```

**Response:**
```json
{
  "message": "Ödeme başarıyla alındı ve bakiye güncellendi.",
  "newBalance": 250.50
}
```

#### 4. Get Transactions
**GET** `/transactions`

Get transaction history.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "total": 25,
  "page": 1,
  "totalPages": 3,
  "transactions": [
    {
      "id": 1,
      "type": "CREDIT",
      "amount": 100,
      "balanceAfter": 250.50,
      "referenceType": "TOPUP",
      "description": "Bakiye Yükleme (Online Ödeme)",
      "createdAt": "2025-12-23T10:00:00Z"
    }
  ]
}
```

---

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "error": "ValidationError",
  "message": "Invalid request data"
}
```

**401 Unauthorized:**
```json
{
  "error": "UnauthorizedError",
  "message": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "ForbiddenError",
  "message": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "error": "NotFoundError",
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred"
}
```

