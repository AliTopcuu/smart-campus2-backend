# User Manual - Part 3

## Table of Contents

1. [Meal Reservation](#meal-reservation)
2. [Wallet Topup](#wallet-topup)
3. [Event Registration](#event-registration)
4. [QR Code Usage](#qr-code-usage)

---

## Meal Reservation

### How to Make a Meal Reservation

1. **Navigate to Meal Service**
   - Log in to your account
   - Click on "Meal Service" or "Yemek Servisi" from the main menu

2. **View Available Menus**
   - You will see a list of available meal menus
   - Menus are organized by date and meal type (Lunch/Dinner)
   - Each menu shows:
     - Date
     - Meal type (Öğle Yemeği / Akşam Yemeği)
     - Menu items
     - Nutrition information
     - Cafeteria location

3. **Select a Menu**
   - Click on the menu you want to reserve
   - Review the menu details:
     - Main dish
     - Side dishes
     - Salad
     - Dessert
     - Nutritional values (calories, protein, carbs, fat)

4. **Make Reservation**
   - Click "Reserve" or "Rezervasyon Yap" button
   - Confirm your reservation
   - A QR code will be generated for your reservation

5. **View Your Reservations**
   - Go to "My Reservations" or "Rezervasyonlarım"
   - You can see:
     - All your meal reservations
     - Reservation status (Pending, Confirmed, Cancelled)
     - QR codes for each reservation
     - Reservation dates and meal types

6. **Cancel Reservation**
   - Go to "My Reservations"
   - Find the reservation you want to cancel
   - Click "Cancel" or "İptal Et"
   - Confirm cancellation

### Meal Time Windows

- **Lunch (Öğle Yemeği)**: 12:00 - 14:00
- **Dinner (Akşam Yemeği)**: 16:00 - 19:00

**Important**: QR codes can only be used during these time windows.

### Scholarship Students

- Scholarship students get **one free meal per meal type per day**
- First meal of each type (Lunch/Dinner) is free
- Additional meals are charged at regular price
- Free meal status is shown in your reservation details

---

## Wallet Topup

### How to Add Money to Your Wallet

1. **Navigate to Wallet**
   - Log in to your account
   - Click on "Wallet" or "Cüzdan" from the main menu

2. **View Current Balance**
   - Your current balance is displayed at the top
   - You can see your balance in Turkish Lira (TRY)

3. **Initiate Topup**
   - Click "Add Money" or "Para Yükle" button
   - Enter the amount you want to add
   - **Minimum amount**: 50 TL
   - **Maximum amount**: 10,000 TL

4. **Payment Process**
   - Click "Proceed to Payment" or "Ödemeye Geç"
   - You will be redirected to the payment gateway
   - Enter your payment details:
     - Card number
     - Expiry date
     - CVV
     - Cardholder name

5. **Complete Payment**
   - Review your payment details
   - Click "Pay" or "Öde"
   - Wait for payment confirmation

6. **Payment Confirmation**
   - After successful payment, you will be redirected back
   - Your wallet balance will be updated automatically
   - You will receive a confirmation email

### View Transaction History

1. **Go to Wallet Page**
   - Click on "Transactions" or "İşlemler" tab
   - You will see a list of all your transactions

2. **Transaction Details**
   - Transaction type (Credit/Debit)
   - Amount
   - Balance after transaction
   - Description
   - Date and time

3. **Filter Transactions**
   - Use pagination to view older transactions
   - Transactions are sorted by date (newest first)

### Payment Methods

Currently supported payment methods:
- Credit/Debit Cards (Visa, Mastercard)
- Payment gateway integration (Stripe/PayTR)

---

## Event Registration

### How to Register for an Event

1. **Browse Events**
   - Log in to your account
   - Click on "Events" or "Etkinlikler" from the main menu
   - You will see a list of available events

2. **View Event Details**
   - Click on an event to see details:
     - Event title and description
     - Date and time
     - Location
     - Capacity and current participants
     - Event category
     - Registration status

3. **Register for Event**
   - Click "Register" or "Kayıt Ol" button
   - Confirm your registration
   - A QR code will be generated for check-in

4. **View Your Registrations**
   - Go to "My Registrations" or "Kayıtlarım"
   - You can see:
     - All events you're registered for
     - Registration status
     - QR codes for check-in
     - Event dates and locations

5. **Event Check-In**
   - On the event day, go to the event location
   - Present your QR code to event staff
   - Staff will scan your QR code for check-in
   - You will receive confirmation of check-in

### Event Categories

- **Conference**: Academic and professional conferences
- **Workshop**: Hands-on learning sessions
- **Seminar**: Educational seminars
- **Social**: Social gatherings and networking events
- **Sports**: Sports events and competitions

### Waitlist

- If an event is full, you can join the waitlist
- If a spot becomes available, you will be automatically registered
- You will receive a notification when you're moved from waitlist to registered

---

## QR Code Usage

### Meal QR Codes

1. **Generate QR Code**
   - When you make a meal reservation, a QR code is automatically generated
   - QR code is displayed in "My Reservations"

2. **Using QR Code at Cafeteria**
   - Go to the cafeteria during meal time
   - Open "My Reservations" on your phone
   - Show your QR code to cafeteria staff
   - Staff will scan your QR code
   - Your meal will be served

3. **QR Code Time Restrictions**
   - **Lunch QR codes**: Valid 12:00 - 14:00
   - **Dinner QR codes**: Valid 16:00 - 19:00
   - QR codes cannot be used outside these time windows

4. **QR Code Format**
   - Format: `MEAL-{menuId}-{userId}-{uniqueId}`
   - Example: `MEAL-1-5-abc123xyz`

### Event QR Codes

1. **Generate QR Code**
   - When you register for an event, a QR code is automatically generated
   - QR code is displayed in "My Registrations"

2. **Using QR Code at Event**
   - Go to the event location
   - Open "My Registrations" on your phone
   - Show your QR code to event staff
   - Staff will scan your QR code for check-in
   - You will receive confirmation

3. **QR Code Format**
   - Format: `EVENT-{eventId}-{userId}-{uniqueId}`
   - Example: `EVENT-1-5-xyz789abc`

### Scanning QR Codes (For Staff)

1. **Access Scanner**
   - Log in as Admin, Faculty, or Cafeteria Staff
   - Navigate to appropriate scanner page:
     - Meal Scanner: For meal reservations
     - Event Check-In: For event registrations

2. **Scan QR Code**
   - Click "Start Camera" or "Kamerayı Başlat"
   - Allow camera permissions when prompted
   - Point camera at QR code
   - QR code will be automatically scanned

3. **Process Result**
   - System will validate QR code
   - If valid:
     - Meal: Process meal delivery and charge wallet (if applicable)
     - Event: Mark as checked-in
   - If invalid: Error message will be displayed

4. **Manual Entry**
   - If camera scanning fails, you can manually enter QR code
   - Enter the QR code string in the input field
   - Click "Process" or "İşle"

### Troubleshooting QR Codes

**Problem**: QR code not scanning
- **Solution**: 
  - Ensure good lighting
  - Hold phone steady
  - Clean camera lens
  - Try manual entry

**Problem**: QR code expired or invalid
- **Solution**:
  - Check if you're within valid time window (for meals)
  - Verify reservation/registration is still active
  - Contact support if issue persists

**Problem**: Camera not working
- **Solution**:
  - Check browser permissions
  - Try different browser
  - Use manual entry option

---

## Screenshots Guide

### Meal Reservation Flow

1. **Meal Menu List**
   - Shows available menus with dates and meal types
   - Filter by date range or meal type

2. **Menu Details**
   - Full menu information
   - Nutrition facts
   - Reserve button

3. **Reservation Confirmation**
   - QR code display
   - Reservation details
   - Time restrictions notice

### Wallet Topup Flow

1. **Wallet Dashboard**
   - Current balance display
   - Add money button
   - Transaction history

2. **Topup Form**
   - Amount input
   - Minimum/maximum limits
   - Proceed to payment button

3. **Payment Gateway**
   - Payment form
   - Card details input
   - Payment confirmation

### Event Registration Flow

1. **Event List**
   - Available events
   - Event details preview
   - Registration status

2. **Event Details**
   - Full event information
   - Register button
   - Capacity information

3. **Registration Confirmation**
   - QR code display
   - Event details
   - Check-in instructions

### QR Code Scanner

1. **Scanner Interface**
   - Camera view
   - Scanning area
   - Manual entry option

2. **Scan Result**
   - Success/error message
   - User information
   - Transaction details

---

## Frequently Asked Questions (FAQ)

### Meal Reservations

**Q: Can I cancel a reservation?**
A: Yes, you can cancel reservations from "My Reservations" page before the meal time.

**Q: What happens if I don't use my QR code?**
A: The reservation remains valid, but you must use it during the valid time window.

**Q: Can I reserve multiple meals?**
A: Yes, you can reserve multiple meals for different dates and meal types.

**Q: Do I get a refund if I cancel?**
A: Yes, if you paid for the meal, the amount will be refunded to your wallet.

### Wallet

**Q: What is the minimum topup amount?**
A: Minimum topup amount is 50 TL.

**Q: How long does it take for payment to reflect?**
A: Payment is usually reflected immediately after successful payment.

**Q: Can I withdraw money from my wallet?**
A: Currently, wallet balance can only be used for services within the system.

**Q: Are there any fees for topup?**
A: No, there are no additional fees for wallet topup.

### Events

**Q: Can I register for multiple events?**
A: Yes, you can register for multiple events as long as they don't conflict in time.

**Q: What happens if an event is cancelled?**
A: You will be notified via email, and your registration will be automatically cancelled.

**Q: Can I transfer my event registration to someone else?**
A: No, event registrations are non-transferable.

**Q: What if I can't attend the event?**
A: Contact event organizers or admin to cancel your registration.

### QR Codes

**Q: Can I use a screenshot of my QR code?**
A: Yes, screenshots work as long as the QR code is clearly visible.

**Q: What if my phone battery dies?**
A: You can use manual entry by providing your reservation/registration ID to staff.

**Q: Are QR codes reusable?**
A: Meal QR codes are single-use. Event QR codes are used once for check-in.

---

## Support

If you encounter any issues or have questions:

1. **Check FAQ**: Review the FAQ section above
2. **Contact Support**: Use the support form in the application
3. **Email**: Send email to support@smartcampus.edu
4. **Help Desk**: Visit the help desk during office hours

---

## Tips and Best Practices

1. **Meal Reservations**
   - Reserve meals in advance to ensure availability
   - Check menu details before reserving
   - Keep QR codes ready before going to cafeteria

2. **Wallet Management**
   - Keep sufficient balance for meal reservations
   - Review transaction history regularly
   - Use secure payment methods

3. **Event Registration**
   - Register early for popular events
   - Check event details before registering
   - Arrive on time with QR code ready

4. **QR Codes**
   - Keep phone charged
   - Have backup screenshot of QR codes
   - Test QR code scanner before event/meal time

