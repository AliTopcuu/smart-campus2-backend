# Payment Integration Guide

## Overview

This guide explains how to integrate payment systems (Stripe/PayTR) into the Smart Campus application for wallet topup functionality.

## Payment Flow

### Flow Diagram

```
┌─────────────┐
│   User      │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. Request Topup
       ▼
┌─────────────────┐
│  Backend API    │
│  /wallet/topup  │
└──────┬──────────┘
       │
       │ 2. Create Payment Session
       │    (Generate sessionId)
       ▼
┌─────────────────┐
│ Payment Gateway │
│  (Stripe/PayTR) │
└──────┬──────────┘
       │
       │ 3. Redirect to Payment Page
       ▼
┌─────────────────┐
│  Payment Page    │
│  (Gateway UI)    │
└──────┬──────────┘
       │
       │ 4. User Completes Payment
       ▼
┌─────────────────┐
│ Payment Gateway │
│  (Webhook Call) │
└──────┬──────────┘
       │
       │ 5. Webhook Notification
       ▼
┌─────────────────┐
│  Backend API    │
│ /wallet/topup/  │
│    webhook      │
└──────┬──────────┘
       │
       │ 6. Verify & Update Wallet
       ▼
┌─────────────────┐
│   Database      │
│  (Wallet Update)│
└─────────────────┘
```

## Stripe Integration

### Setup

1. **Create Stripe Account**
   - Go to https://stripe.com
   - Create account and get API keys

2. **Install Stripe SDK**
   ```bash
   npm install stripe
   ```

3. **Environment Variables**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Implementation

#### 1. Create Payment Session

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createTopupSession = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'try',
          product_data: {
            name: 'Wallet Topup',
          },
          unit_amount: amount * 100, // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/wallet?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/wallet?canceled=true`,
      metadata: {
        userId: userId.toString(),
        type: 'wallet_topup'
      },
      client_reference_id: userId.toString()
    });

    res.json({
      sessionId: session.id,
      paymentUrl: session.url
    });
  } catch (error) {
    next(error);
  }
};
```

#### 2. Webhook Handler

```javascript
exports.handleWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const t = await sequelize.transaction();

  try {
    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Verify payment was successful
      if (session.payment_status === 'paid') {
        const userId = parseInt(session.metadata.userId);
        const amount = session.amount_total / 100; // Convert from cents

        // Update wallet
        let wallet = await Wallet.findOne({ 
          where: { userId }, 
          transaction: t 
        });
        
        if (!wallet) {
          wallet = await Wallet.create({ userId }, { transaction: t });
        }

        const newBalance = parseFloat(wallet.balance) + amount;
        await wallet.update({ balance: newBalance }, { transaction: t });

        // Create transaction record
        await Transaction.create({
          walletId: wallet.id,
          type: 'CREDIT',
          amount: amount,
          balanceAfter: newBalance,
          referenceType: 'TOPUP',
          description: 'Bakiye Yükleme (Stripe)',
          referenceId: session.id
        }, { transaction: t });

        await t.commit();

        // Send confirmation email
        const user = await User.findByPk(userId);
        if (user) {
          sendPaymentConfirmationEmail(user.email, amount, newBalance);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};
```

#### 3. Webhook Endpoint Configuration

In your Express app:

```javascript
// Stripe webhook requires raw body
app.post('/api/wallet/topup/webhook', 
  express.raw({ type: 'application/json' }),
  walletController.handleWebhook
);
```

### Stripe Webhook Setup

1. **Install Stripe CLI** (for local testing)
   ```bash
   stripe listen --forward-to localhost:3000/api/wallet/topup/webhook
   ```

2. **Configure Webhook in Stripe Dashboard**
   - Go to Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/wallet/topup/webhook`
   - Select events: `checkout.session.completed`
   - Copy webhook signing secret

## PayTR Integration

### Setup

1. **Create PayTR Account**
   - Go to https://www.paytr.com
   - Get merchant ID and secret key

2. **Environment Variables**
   ```env
   PAYTR_MERCHANT_ID=your_merchant_id
   PAYTR_MERCHANT_KEY=your_merchant_key
   PAYTR_MERCHANT_SALT=your_merchant_salt
   ```

### Implementation

#### 1. Create Payment Session

```javascript
const crypto = require('crypto');

exports.createTopupSession = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    const merchantId = process.env.PAYTR_MERCHANT_ID;
    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

    // Generate unique order ID
    const orderId = `TOPUP-${userId}-${Date.now()}`;

    // Create hash for PayTR
    const hashStr = `${merchantId}${userId}${amount}${orderId}${merchantSalt}`;
    const hash = crypto.createHmac('sha256', merchantKey)
      .update(hashStr)
      .digest('base64');

    // PayTR payment form data
    const paymentData = {
      merchant_id: merchantId,
      user_id: userId,
      payment_amount: amount * 100, // Convert to cents
      merchant_oid: orderId,
      user_name: req.user.fullName || 'User',
      user_email: req.user.email,
      user_address: '',
      user_phone: req.user.phone || '',
      merchant_ok_url: `${process.env.FRONTEND_URL}/wallet?success=true`,
      merchant_fail_url: `${process.env.FRONTEND_URL}/wallet?fail=true`,
      hash: hash
    };

    // Store order in database for verification
    await PaymentOrder.create({
      orderId,
      userId,
      amount,
      status: 'pending'
    });

    res.json({
      orderId,
      paymentUrl: 'https://www.paytr.com/odeme',
      paymentData
    });
  } catch (error) {
    next(error);
  }
};
```

#### 2. Webhook Handler

```javascript
exports.handleWebhook = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const {
      merchant_oid,
      status,
      total_amount,
      hash
    } = req.body;

    // Verify hash
    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
    const hashStr = `${merchant_oid}${merchantSalt}${status}${total_amount}`;
    const calculatedHash = crypto.createHmac('sha256', merchantKey)
      .update(hashStr)
      .digest('base64');

    if (hash !== calculatedHash) {
      throw new ValidationError('Invalid hash');
    }

    // Find order
    const order = await PaymentOrder.findOne({
      where: { orderId: merchant_oid },
      transaction: t
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if already processed
    if (order.status !== 'pending') {
      await t.rollback();
      return res.json({ status: 'already_processed' });
    }

    if (status === 'success') {
      const amount = parseFloat(total_amount) / 100;
      const userId = order.userId;

      // Update wallet
      let wallet = await Wallet.findOne({ 
        where: { userId }, 
        transaction: t 
      });
      
      if (!wallet) {
        wallet = await Wallet.create({ userId }, { transaction: t });
      }

      const newBalance = parseFloat(wallet.balance) + amount;
      await wallet.update({ balance: newBalance }, { transaction: t });

      // Create transaction record
      await Transaction.create({
        walletId: wallet.id,
        type: 'CREDIT',
        amount: amount,
        balanceAfter: newBalance,
        referenceType: 'TOPUP',
        description: 'Bakiye Yükleme (PayTR)',
        referenceId: merchant_oid
      }, { transaction: t });

      // Update order status
      await order.update({ status: 'completed' }, { transaction: t });

      await t.commit();

      // Send confirmation email
      const user = await User.findByPk(userId);
      if (user) {
        sendPaymentConfirmationEmail(user.email, amount, newBalance);
      }

      res.json({ status: 'success' });
    } else {
      await order.update({ status: 'failed' }, { transaction: t });
      await t.commit();
      res.json({ status: 'failed' });
    }
  } catch (error) {
    await t.rollback();
    next(error);
  }
};
```

## Security Best Practices

### 1. Webhook Signature Verification

Always verify webhook signatures to ensure requests are from the payment gateway:

```javascript
// Stripe
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);

// PayTR
const calculatedHash = crypto.createHmac('sha256', merchantKey)
  .update(hashStr)
  .digest('base64');
if (hash !== calculatedHash) {
  throw new ValidationError('Invalid signature');
}
```

### 2. Idempotency

Handle duplicate webhook calls:

```javascript
// Check if transaction already processed
const existingTransaction = await Transaction.findOne({
  where: { referenceId: session.id }
});

if (existingTransaction) {
  return res.json({ status: 'already_processed' });
}
```

### 3. Transaction Safety

Always use database transactions for wallet updates:

```javascript
const t = await sequelize.transaction();
try {
  // Update wallet
  // Create transaction record
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

### 4. Amount Validation

Validate amounts before processing:

```javascript
if (!amount || amount < 50) {
  throw new ValidationError('Minimum amount is 50 TL');
}

if (amount > 10000) {
  throw new ValidationError('Maximum amount is 10,000 TL');
}
```

## Test Cards

### Stripe Test Cards

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC.

### PayTR Test Mode

Enable test mode in PayTR dashboard and use test credentials provided by PayTR.

## Frontend Integration

### Example: Redirect to Payment

```javascript
const handleTopup = async (amount) => {
  try {
    const response = await api.post('/wallet/topup', { amount });
    const { paymentUrl } = response.data;
    
    // Redirect to payment gateway
    window.location.href = paymentUrl;
  } catch (error) {
    console.error('Payment error:', error);
  }
};
```

### Example: Handle Payment Callback

```javascript
// After payment success
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  
  if (success === 'true') {
    // Refresh wallet balance
    fetchWalletBalance();
    showSuccessMessage('Payment successful!');
  }
}, []);
```

## Error Handling

### Common Errors

1. **Payment Failed**
   - User cancels payment
   - Insufficient funds
   - Card declined

2. **Webhook Timeout**
   - Implement retry mechanism
   - Log failed webhooks for manual processing

3. **Duplicate Transactions**
   - Check reference ID before processing
   - Return success if already processed

## Monitoring

### Logging

Log all payment events:

```javascript
console.log('Payment webhook received', {
  orderId: merchant_oid,
  status: status,
  amount: total_amount,
  timestamp: new Date()
});
```

### Alerts

Set up alerts for:
- Failed webhooks
- Payment discrepancies
- High-value transactions

## Production Checklist

- [ ] Webhook endpoint is HTTPS
- [ ] Webhook signature verification enabled
- [ ] Test mode disabled
- [ ] Production API keys configured
- [ ] Error handling implemented
- [ ] Transaction logging enabled
- [ ] Email notifications working
- [ ] Monitoring and alerts configured

