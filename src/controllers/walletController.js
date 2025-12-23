const db = require('../models');
const { Wallet, Transaction, User } = db;
const { NotFoundError, ValidationError } = require('../utils/errors');
const { sequelize } = require('../models');
const { sendPaymentConfirmationEmail } = require('../utils/mailer');
const crypto = require('crypto');

// Bakiye Sorgulama
exports.getBalance = async (req, res, next) => {
    try {
        const userId = req.user.id;

        let wallet = await Wallet.findOne({ where: { userId } });

        if (!wallet) {
            wallet = await Wallet.create({ userId });
        }

        res.json({
            balance: wallet.balance,
            currency: wallet.currency
        });
    } catch (error) {
        next(error);
    }
};

// Para Yükleme Başlatma (Session Oluşturma)
exports.createTopupSession = async (req, res, next) => {
    try {
        const { amount } = req.body;

        // Minimum Amount Check
        if (!amount || amount < 50) {
            throw new ValidationError('Minimum yükleme tutarı 50 TL olmalıdır.');
        }

        // Mock Payment Gateway Logic
        // In real life, here we would call Stripe.checkout.sessions.create

        const sessionId = crypto.randomUUID();
        const paymentUrl = `http://localhost:5173/payment-mock?session_id=${sessionId}&amount=${amount}`;

        // Return Payment URL
        res.json({
            message: 'Ödeme oturumu oluşturuldu.',
            paymentUrl: paymentUrl,
            sessionId: sessionId
        });

    } catch (error) {
        next(error);
    }
};

// Webhook Callback (Simulated)
exports.handleWebhook = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        // Verify signature (Mock: we accept a secret header or just trust the body for this demo)
        // const signature = req.headers['x-payment-signature'];

        const { sessionId, status, amount, userId } = req.body;

        // Note: In a real webhook, userId might come from metadata attached to the session
        // Here, we expect the client/mock-page to send it back for simplicity in this demo environment.
        // OR we should have saved the session in DB. 
        // For simplicity: We will trust the payload provided by our authenticated "Mock Page".
        // BUT to be safe and use req.user (since this endpoint will be authenticated for our demo purpose):

        const targetUserId = req.user.id; // User triggering the "success" from mock page

        if (status !== 'success') {
            throw new ValidationError('Ödeme başarısız veya iptal edildi.');
        }

        if (!amount || amount <= 0) {
            throw new ValidationError('Geçersiz tutar.');
        }

        let wallet = await Wallet.findOne({ where: { userId: targetUserId }, transaction: t });
        if (!wallet) {
            wallet = await Wallet.create({ userId: targetUserId }, { transaction: t });
        }

        const newBalance = parseFloat(wallet.balance) + parseFloat(amount);

        // Update Wallet (Atomic)
        await wallet.update({ balance: newBalance }, { transaction: t });

        // Create Transaction
        await Transaction.create({
            walletId: wallet.id,
            type: 'CREDIT',
            amount: amount,
            balanceAfter: newBalance,
            referenceType: 'TOPUP',
            description: 'Bakiye Yükleme (Online Ödeme)',
            referenceId: sessionId || 'ONLINE_PAYMENT'
        }, { transaction: t });

        await t.commit();

        // Send Confirmation Email
        const user = await User.findByPk(targetUserId);
        if (user) {
            sendPaymentConfirmationEmail(user.email, amount, newBalance);
        }

        res.json({
            message: 'Ödeme başarıyla alındı ve bakiye güncellendi.',
            newBalance: newBalance
        });

    } catch (error) {
        await t.rollback();
        next(error);
    }
};

// İşlem Geçmişi (Pagination)
exports.getTransactions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const wallet = await Wallet.findOne({ where: { userId } });

        if (!wallet) {
            return res.json({
                total: 0,
                page,
                totalPages: 0,
                transactions: []
            });
        }

        const { count, rows } = await Transaction.findAndCountAll({
            where: { walletId: wallet.id },
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
            transactions: rows
        });
    } catch (error) {
        next(error);
    }
};
