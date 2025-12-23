# Database Schema Update - Part 3

## Overview

This document describes the database schema changes introduced in Part 3 of the Smart Campus project. These changes include new tables for meal management, event management, payment/wallet system, and classroom reservations.

## Migration Summary

### Part 3 Migrations

1. **20251220115703-add-scholarship-to-students.js** - Adds scholarship field to Students table
2. **20251220120000-create-meal-system.js** - Creates meal management tables
3. **20251221000000-create-event.js** - Creates Events table
4. **20251221000001-create-event-registration.js** - Creates EventRegistrations table
5. **20251221000002-create-waitlist.js** - Creates Waitlists table
6. **20251221000003-create-event-survey.js** - Creates EventSurveys table
7. **20251221000004-fix-events-table.js** - Fixes and updates Events table structure
8. **20251221000005-fix-events-category.js** - Adds category field to Events
9. **20251221000006-fix-events-startdate.js** - Fixes date field in Events
10. **20251222000000-create-classroom-reservations.js** - Creates ClassroomReservations table

---

## New Tables

### 1. Cafeterias

**Purpose**: Stores cafeteria information

```sql
CREATE TABLE "Cafeterias" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "location" VARCHAR(255),
  "capacity" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields**:
- `id`: Primary key
- `name`: Cafeteria name (e.g., "Main Cafeteria")
- `location`: Cafeteria location (e.g., "Building A")
- `capacity`: Maximum capacity of the cafeteria

**Relationships**:
- Has many `MealMenus`
- Has many `MealReservations`

---

### 2. MealMenus

**Purpose**: Stores daily meal menus for cafeterias

```sql
CREATE TABLE "MealMenus" (
  "id" SERIAL PRIMARY KEY,
  "cafeteriaId" INTEGER NOT NULL REFERENCES "Cafeterias"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "mealType" ENUM('LUNCH', 'DINNER') NOT NULL,
  "itemsJson" JSONB DEFAULT '[]',
  "nutritionJson" JSONB DEFAULT '{}',
  "isPublished" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields**:
- `id`: Primary key
- `cafeteriaId`: Foreign key to Cafeterias
- `date`: Menu date (DATEONLY)
- `mealType`: Type of meal (LUNCH or DINNER)
- `itemsJson`: JSON array of menu items
  ```json
  {
    "main": "Grilled Chicken",
    "side": "Rice",
    "salad": "Caesar Salad",
    "dessert": "Fruit"
  }
  ```
- `nutritionJson`: JSON object with nutrition information
  ```json
  {
    "calories": 650,
    "protein": 45,
    "carbs": 60,
    "fat": 20
  }
  ```
- `isPublished`: Whether the menu is published and visible to users

**Indexes**:
- Unique constraint on (`cafeteriaId`, `date`, `mealType`)

---

### 3. Wallets

**Purpose**: Stores user wallet balances for payment system

```sql
CREATE TABLE "Wallets" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL UNIQUE REFERENCES "Users"("id") ON DELETE CASCADE,
  "balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields**:
- `id`: Primary key
- `userId`: Foreign key to Users (one-to-one relationship)
- `balance`: Current wallet balance (DECIMAL with 2 decimal places)
- `currency`: Currency code (default: 'TRY')
- `isActive`: Whether the wallet is active

**Relationships**:
- Belongs to `User` (one-to-one)
- Has many `Transactions`

---

### 4. Transactions

**Purpose**: Stores all wallet transactions (credits and debits)

```sql
CREATE TABLE "Transactions" (
  "id" SERIAL PRIMARY KEY,
  "walletId" INTEGER NOT NULL REFERENCES "Wallets"("id") ON DELETE CASCADE,
  "type" ENUM('CREDIT', 'DEBIT') NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "balanceAfter" DECIMAL(10,2) NOT NULL,
  "referenceType" VARCHAR(255) NOT NULL,
  "referenceId" VARCHAR(255),
  "description" VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields**:
- `id`: Primary key
- `walletId`: Foreign key to Wallets
- `type`: Transaction type (CREDIT for adding money, DEBIT for spending)
- `amount`: Transaction amount
- `balanceAfter`: Wallet balance after this transaction
- `referenceType`: Type of reference (e.g., 'TOPUP', 'MEAL_RESERVATION_SCAN', 'REFUND')
- `referenceId`: ID of related entity (e.g., payment session ID, reservation ID)
- `description`: Human-readable description

**Indexes**:
- Index on `walletId` for faster queries
- Index on `createdAt` for transaction history

---

### 5. MealReservations

**Purpose**: Stores user meal reservations

```sql
CREATE TABLE "MealReservations" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "menuId" INTEGER NOT NULL REFERENCES "MealMenus"("id") ON DELETE CASCADE,
  "cafeteriaId" INTEGER NOT NULL REFERENCES "Cafeterias"("id") ON DELETE CASCADE,
  "mealType" VARCHAR(255) NOT NULL,
  "date" DATE NOT NULL,
  "amount" DECIMAL(10,2) DEFAULT 0.00,
  "qrCode" VARCHAR(255) NOT NULL UNIQUE,
  "status" ENUM('RESERVED', 'USED', 'CANCELLED') DEFAULT 'RESERVED',
  "usedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields**:
- `id`: Primary key
- `userId`: Foreign key to Users
- `menuId`: Foreign key to MealMenus
- `cafeteriaId`: Foreign key to Cafeterias (denormalized for easier querying)
- `mealType`: Type of meal (LUNCH or DINNER) - denormalized
- `date`: Reservation date - denormalized
- `amount`: Amount charged for the meal (0.00 for scholarship students' free meals)
- `qrCode`: Unique QR code for scanning at cafeteria
- `status`: Reservation status
  - `RESERVED`: Reservation made but not used
  - `USED`: QR code scanned and meal served
  - `CANCELLED`: Reservation cancelled
- `usedAt`: Timestamp when QR code was scanned

**Indexes**:
- Unique constraint on `qrCode`
- Index on `userId` for user's reservations
- Index on `status` for filtering

---

### 6. Events

**Purpose**: Stores event information

```sql
CREATE TABLE "Events" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP NOT NULL,
  "location" VARCHAR(255) NOT NULL,
  "capacity" INTEGER NOT NULL CHECK ("capacity" > 0),
  "currentParticipants" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "status" ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
  "category" VARCHAR(255),
  "surveySchema" JSONB,
  "createdBy" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields**:
- `id`: Primary key
- `title`: Event title
- `description`: Event description
- `date`: Event date and time
- `location`: Event location
- `capacity`: Maximum number of participants
- `currentParticipants`: Current number of registered participants (for optimistic locking)
- `version`: Version number for optimistic locking (prevents race conditions)
- `status`: Event status
  - `active`: Event is active and accepting registrations
  - `cancelled`: Event is cancelled
  - `completed`: Event has completed
- `category`: Event category (e.g., 'CONFERENCE', 'WORKSHOP', 'SEMINAR')
- `surveySchema`: JSON schema for event survey
  ```json
  {
    "questions": [
      {
        "type": "rating",
        "question": "How would you rate this event?",
        "required": true
      }
    ]
  }
  ```
- `createdBy`: Foreign key to Users (event creator)

**Indexes**:
- Index on `status` for filtering active events
- Index on `date` for date-based queries
- Index on `category` for category filtering

---

### 7. EventRegistrations

**Purpose**: Stores user event registrations

```sql
CREATE TABLE "EventRegistrations" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "eventId" INTEGER NOT NULL REFERENCES "Events"("id") ON DELETE CASCADE,
  "status" ENUM('registered', 'checked-in', 'cancelled') DEFAULT 'registered',
  "qrCode" VARCHAR(255) NOT NULL UNIQUE,
  "checkedInAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields**:
- `id`: Primary key
- `userId`: Foreign key to Users
- `eventId`: Foreign key to Events
- `status`: Registration status
  - `registered`: User is registered
  - `checked-in`: User has checked in at event
  - `cancelled`: Registration cancelled
- `qrCode`: Unique QR code for check-in
- `checkedInAt`: Timestamp when user checked in

**Indexes**:
- Unique constraint on (`userId`, `eventId`) - prevents duplicate registrations
- Unique constraint on `qrCode`
- Index on `eventId` for event participants queries
- Index on `userId` for user's registrations

---

### 8. Waitlists

**Purpose**: Stores waitlist entries for full events

```sql
CREATE TABLE "Waitlists" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "eventId" INTEGER NOT NULL REFERENCES "Events"("id") ON DELETE CASCADE,
  "requestDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields**:
- `id`: Primary key
- `userId`: Foreign key to Users
- `eventId`: Foreign key to Events
- `requestDate`: Date when user joined waitlist (for FIFO ordering)

**Indexes**:
- Unique constraint on (`userId`, `eventId`) - prevents duplicate waitlist entries
- Index on (`eventId`, `requestDate`) - for FIFO ordering when spots become available

---

### 9. EventSurveys

**Purpose**: Stores event survey responses

```sql
CREATE TABLE "EventSurveys" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "eventId" INTEGER NOT NULL REFERENCES "Events"("id") ON DELETE CASCADE,
  "answers" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields**:
- `id`: Primary key
- `userId`: Foreign key to Users
- `eventId`: Foreign key to Events
- `answers`: JSON object with survey answers
  ```json
  {
    "question1": 5,
    "question2": "Great event!",
    "question3": true
  }
  ```

**Indexes**:
- Unique constraint on (`userId`, `eventId`) - one survey per user per event

---

### 10. ClassroomReservations

**Purpose**: Stores classroom reservation requests

```sql
CREATE TABLE "ClassroomReservations" (
  "id" SERIAL PRIMARY KEY,
  "classroomId" INTEGER NOT NULL REFERENCES "Classrooms"("id") ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "startTime" TIME NOT NULL,
  "endTime" TIME NOT NULL,
  "purpose" TEXT NOT NULL,
  "status" ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  "approvedBy" INTEGER REFERENCES "Users"("id") ON DELETE SET NULL,
  "approvedAt" TIMESTAMP,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Fields**:
- `id`: Primary key
- `classroomId`: Foreign key to Classrooms
- `userId`: Foreign key to Users (reservation requester)
- `date`: Reservation date
- `startTime`: Reservation start time
- `endTime`: Reservation end time
- `purpose`: Purpose of reservation
- `status`: Reservation status
  - `pending`: Awaiting approval
  - `approved`: Approved by admin
  - `rejected`: Rejected by admin
  - `cancelled`: Cancelled by user
- `approvedBy`: Foreign key to Users (admin who approved)
- `approvedAt`: Timestamp when approved
- `rejectionReason`: Reason for rejection (if rejected)

**Indexes**:
- Index on (`classroomId`, `date`, `startTime`, `endTime`) - for conflict checking
- Index on `userId` - for user's reservations
- Index on `status` - for filtering by status

---

## Modified Tables

### Students

**Migration**: `20251220115703-add-scholarship-to-students.js`

**New Field**:
- `hasScholarship`: BOOLEAN, DEFAULT false
  - Indicates if student has scholarship
  - Used for free meal eligibility

**Impact**:
- Scholarship students get one free meal per meal type (LUNCH/DINNER) per day
- First meal of each type is free, subsequent meals are charged

---

## Relationships Diagram

```
Users
  ├── Wallets (1:1)
  │     └── Transactions (1:N)
  ├── MealReservations (1:N)
  ├── EventRegistrations (1:N)
  ├── Waitlists (1:N)
  ├── EventSurveys (1:N)
  └── ClassroomReservations (1:N)

Cafeterias
  ├── MealMenus (1:N)
  └── MealReservations (1:N)

MealMenus
  └── MealReservations (1:N)

Events
  ├── EventRegistrations (1:N)
  ├── Waitlists (1:N)
  └── EventSurveys (1:N)

Classrooms
  └── ClassroomReservations (1:N)
```

---

## Data Types

### ENUM Types

**MealType**:
- `LUNCH`
- `DINNER`

**TransactionType**:
- `CREDIT` (money added)
- `DEBIT` (money spent)

**MealReservationStatus**:
- `RESERVED`
- `USED`
- `CANCELLED`

**EventStatus**:
- `active`
- `cancelled`
- `completed`

**EventRegistrationStatus**:
- `registered`
- `checked-in`
- `cancelled`

**ClassroomReservationStatus**:
- `pending`
- `approved`
- `rejected`
- `cancelled`

### JSONB Fields

Several tables use JSONB for flexible data storage:

- **MealMenus.itemsJson**: Menu items
- **MealMenus.nutritionJson**: Nutrition information
- **Events.surveySchema**: Survey schema definition
- **EventSurveys.answers**: Survey response answers

---

## Indexes and Constraints

### Unique Constraints

1. **Wallets**: `userId` (one wallet per user)
2. **MealReservations**: `qrCode` (unique QR codes)
3. **EventRegistrations**: 
   - `(userId, eventId)` (one registration per user per event)
   - `qrCode` (unique QR codes)
4. **Waitlists**: `(userId, eventId)` (one waitlist entry per user per event)
5. **EventSurveys**: `(userId, eventId)` (one survey per user per event)

### Performance Indexes

1. **Transactions**: `walletId`, `createdAt`
2. **MealReservations**: `userId`, `status`, `date`
3. **EventRegistrations**: `eventId`, `userId`, `status`
4. **Waitlists**: `(eventId, requestDate)` (FIFO ordering)
5. **ClassroomReservations**: `(classroomId, date, startTime, endTime)`, `userId`, `status`

---

## Migration Execution Order

Migrations must be executed in the following order:

1. `20251220115703-add-scholarship-to-students.js`
2. `20251220120000-create-meal-system.js`
3. `20251221000000-create-event.js`
4. `20251221000001-create-event-registration.js`
5. `20251221000002-create-waitlist.js`
6. `20251221000003-create-event-survey.js`
7. `20251221000004-fix-events-table.js`
8. `20251221000005-fix-events-category.js`
9. `20251221000006-fix-events-startdate.js`
10. `20251222000000-create-classroom-reservations.js`

---

## Rollback Strategy

All migrations include `down` methods for rollback:

- **Add Column**: Removes the column
- **Create Table**: Drops the table (cascades to dependent tables)
- **Modify Table**: Reverts to previous structure

**Warning**: Rolling back migrations that contain data will result in data loss. Always backup database before rollback.

---

## Data Migration Notes

### Events Table Updates

The `20251221000004-fix-events-table.js` migration includes data migration:
- Copies data from `startDate` to `date` if `startDate` exists
- Copies data from `registeredCount` to `currentParticipants` if `registeredCount` exists

### Scholarship Field

The `hasScholarship` field is added with default value `false`, so existing students are not affected.

---

## Best Practices

1. **Always run migrations in order**: Migration timestamps ensure correct execution order
2. **Backup before migration**: Especially for production environments
3. **Test rollback**: Test `down` migrations in development before production
4. **Monitor indexes**: Large tables may need index maintenance
5. **JSONB queries**: Use proper JSONB operators for querying JSON fields

---

## Query Examples

### Get User's Meal Reservations

```sql
SELECT mr.*, mm.date, mm.mealType, c.name as cafeteria_name
FROM "MealReservations" mr
JOIN "MealMenus" mm ON mr."menuId" = mm.id
JOIN "Cafeterias" c ON mr."cafeteriaId" = c.id
WHERE mr."userId" = :userId
ORDER BY mr."date" DESC, mr."createdAt" DESC;
```

### Get Event Participants

```sql
SELECT er.*, u."fullName", u.email
FROM "EventRegistrations" er
JOIN "Users" u ON er."userId" = u.id
WHERE er."eventId" = :eventId
ORDER BY er."createdAt" ASC;
```

### Get Wallet Transactions

```sql
SELECT *
FROM "Transactions"
WHERE "walletId" = :walletId
ORDER BY "createdAt" DESC
LIMIT :limit OFFSET :offset;
```

### Check Classroom Availability

```sql
SELECT *
FROM "ClassroomReservations"
WHERE "classroomId" = :classroomId
  AND "date" = :date
  AND "status" = 'approved'
  AND (
    ("startTime" < :endTime AND "endTime" > :startTime)
  );
```

---

## Future Considerations

1. **Partitioning**: Consider partitioning large tables (Transactions, MealReservations) by date
2. **Archiving**: Archive old transactions and reservations
3. **Soft Deletes**: Consider soft deletes for important records
4. **Audit Logs**: Add audit logging for sensitive operations
5. **Full-Text Search**: Add full-text search indexes for descriptions and purposes

