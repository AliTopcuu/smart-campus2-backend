const db = require('../models');
const { MealMenu, Cafeteria } = db;
const { ValidationError, NotFoundError } = require('../utils/errors');
const { Op } = require('sequelize');

exports.getCafeterias = async (req, res, next) => {
    try {
        const cafeterias = await Cafeteria.findAll();
        res.json(cafeterias);
    } catch (error) {
        next(error);
    }
};

exports.createCafeteria = async (req, res, next) => {
    try {
        const { name, location, capacity } = req.body;
        const cafeteria = await Cafeteria.create({ name, location, capacity });
        res.status(201).json(cafeteria);
    } catch (error) {
        next(error);
    }
};

exports.getAllMenus = async (req, res, next) => {
    try {
        const { startDate, endDate, cafeteriaId } = req.query;
        const where = {};

        if (startDate && endDate) {
            where.date = { [Op.between]: [startDate, endDate] };
        } else if (startDate) {
            where.date = { [Op.gte]: startDate };
        }

        if (cafeteriaId) {
            where.cafeteriaId = cafeteriaId;
        }

        if (req.query.mealType) {
            where.mealType = req.query.mealType;
        }

        const menus = await MealMenu.findAll({
            where,
            include: [{ model: Cafeteria, as: 'cafeteria' }],
            order: [['date', 'ASC'], ['mealType', 'ASC']],
        });
        res.json(menus);
    } catch (error) {
        next(error);
    }
};

exports.getMenuById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const menu = await MealMenu.findByPk(id, {
            include: [{ model: Cafeteria, as: 'cafeteria' }],
        });
        if (!menu) {
            throw new NotFoundError('Menu not found');
        }
        res.json(menu);
    } catch (error) {
        next(error);
    }
};

exports.createMenu = async (req, res, next) => {
    try {
        const { date, mealType, itemsJson, nutritionJson, isPublished } = req.body;
        const cafeteriaId = Number(req.body.cafeteriaId);

        // Check if cafeteria exists
        const cafeteria = await Cafeteria.findByPk(cafeteriaId);
        if (!cafeteria) {
            throw new ValidationError('Selected cafeteria does not exist');
        }

        // Check if menu exists
        const existing = await MealMenu.findOne({
            where: { cafeteriaId, date, mealType },
        });
        if (existing) {
            throw new ValidationError('Menu already exists for this cafeteria, date and meal type');
        }

        const menu = await MealMenu.create({
            cafeteriaId,
            date,
            mealType,
            itemsJson,
            nutritionJson,
            isPublished,
        });
        res.status(201).json(menu);
    } catch (error) {
        next(error);
    }
};

exports.updateMenu = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { cafeteriaId, date, mealType, itemsJson, nutritionJson, isPublished } = req.body;

        const menu = await MealMenu.findByPk(id);
        if (!menu) {
            throw new NotFoundError('Menu not found');
        }

        const updates = {};

        if (cafeteriaId) {
            const cid = Number(cafeteriaId);
            if (cid !== menu.cafeteriaId) {
                const cafeteria = await Cafeteria.findByPk(cid);
                if (!cafeteria) throw new ValidationError('Selected cafeteria does not exist');
                updates.cafeteriaId = cid;
            }
        }

        if (date) updates.date = date;
        if (mealType) updates.mealType = mealType;
        if (itemsJson !== undefined) updates.itemsJson = itemsJson;
        if (nutritionJson !== undefined) updates.nutritionJson = nutritionJson;
        if (isPublished !== undefined) updates.isPublished = isPublished;

        await menu.update(updates);
        res.json(menu);
    } catch (error) {
        console.error('Update Menu Error:', error);
        next(error);
    }
};

exports.deleteMenu = async (req, res, next) => {
    try {
        const { id } = req.params;
        const menu = await MealMenu.findByPk(id);
        if (!menu) {
            throw new NotFoundError('Menu not found');
        }
        await menu.destroy();
        res.json({ message: 'Menu deleted successfully' });
    } catch (error) {
        console.error('Delete Menu Error:', error);
        next(error);
    }
};

exports.deleteCafeteria = async (req, res, next) => {
    try {
        const { id } = req.params;
        const cafeteria = await Cafeteria.findByPk(id);
        if (!cafeteria) {
            throw new NotFoundError('Cafeteria not found');
        }
        await cafeteria.destroy();
        res.json({ message: 'Cafeteria deleted successfully' });
    } catch (error) {
        console.error('Delete Cafeteria Error:', error);
        next(error);
    }
};

exports.createReservation = async (req, res, next) => {
    try {
        const { menuId } = req.body;
        const userId = req.user.id; // User ID from auth middleware

        const menu = await MealMenu.findByPk(menuId);
        if (!menu) {
            throw new NotFoundError('Menu not found');
        }

        // Check if menu is in the past
        const today = new Date().toISOString().split('T')[0];
        if (menu.date < today) {
            throw new ValidationError('Geçmiş tarihteki yemeklere rezervasyon yapılamaz.');
        }

        // Check if meal start time has passed (only for today's meals)
        if (menu.date === today) {
            const mealType = menu.mealType; // 'LUNCH' or 'DINNER'
            const mealStartHour = mealType === 'LUNCH' ? 12 : 18;
            const mealStartTime = new Date(menu.date);
            mealStartTime.setHours(mealStartHour, 0, 0, 0);

            const now = new Date();
            if (now >= mealStartTime) {
                const mealTypeText = mealType === 'LUNCH' ? 'öğle yemeği' : 'akşam yemeği';
                throw new ValidationError(`${mealTypeText.charAt(0).toUpperCase() + mealTypeText.slice(1)} başlama saati geçmiş. Rezervasyon yapılamaz.`);
            }
        }

        // Prevent duplicate reservation for same menu
        const existing = await db.MealReservation.findOne({
            where: {
                userId,
                menuId
            }
        });

        if (existing) {
            throw new ValidationError('You already have a reservation for this menu');
        }

        // PAYMENT LOGIC
        // Assuming a standard meal price if not defined constantly
        // In a real scenario, price might come from Menu or global setting
        // Let's assume price is 0 for now as per user request history, OR 
        // Rezervasyon yaparken para düşülmez, sadece rezervasyon oluşturulur
        // Para sadece QR kod okutulduğunda düşülecek
        const MEAL_PRICE = 20.00; // Sadece referans için, rezervasyon sırasında kullanılmaz

        // Simple QR Code generation (unique string)
        const qrCode = `${userId}-${menuId}-${Date.now()}`;

        // Rezervasyon oluştur (amount başlangıçta 0, QR okutulduğunda güncellenecek)
        const reservation = await db.MealReservation.create({
            userId,
            menuId,
            cafeteriaId: menu.cafeteriaId,
            mealType: menu.mealType,
            date: menu.date,
            amount: 0, // Rezervasyon sırasında 0, QR okutulduğunda güncellenecek
            qrCode,
            status: 'RESERVED'
        });

        res.status(201).json(reservation);
    } catch (error) {
        console.error('Create Reservation Error:', error);
        next(error);
    }
};

exports.getMyReservations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const reservations = await db.MealReservation.findAll({
            where: { userId },
            include: [
                {
                    model: MealMenu,
                    as: 'menu',
                    include: [{ model: Cafeteria, as: 'cafeteria' }]
                },
                { model: Cafeteria, as: 'cafeteria' }
            ],
            order: [['date', 'DESC']]
        });
        res.json(reservations);
    } catch (error) {
        console.error('Get Reservations Error:', error);
        next(error);
    }
};

exports.cancelReservation = async (req, res, next) => {
    try {
        const { reservationId } = req.params;
        const userId = req.user.id;

        const reservation = await db.MealReservation.findOne({
            where: { id: reservationId, userId },
            include: [
                {
                    model: MealMenu,
                    as: 'menu'
                }
            ]
        });

        if (!reservation) {
            throw new NotFoundError('Rezervasyon bulunamadı.');
        }

        if (reservation.status === 'CANCELLED') {
            throw new ValidationError('Bu rezervasyon zaten iptal edilmiş.');
        }

        if (reservation.status === 'USED') {
            throw new ValidationError('Kullanılmış rezervasyon iptal edilemez.');
        }

        // Check if >= 2 hours before meal start time
        const reservationDate = new Date(reservation.date);
        const mealType = reservation.menu?.mealType || reservation.mealType;
        
        // Meal start times: LUNCH starts at 12:00, DINNER starts at 18:00
        const mealStartHour = mealType === 'LUNCH' ? 12 : 18;
        const mealStartTime = new Date(reservationDate);
        mealStartTime.setHours(mealStartHour, 0, 0, 0);

        const now = new Date();
        const hoursUntilMealStart = (mealStartTime - now) / (1000 * 60 * 60); // Convert to hours

        if (hoursUntilMealStart < 2) {
            throw new ValidationError('Rezervasyon iptali için yemek başlamasından en az 2 saat önce olmalıdır.');
        }

        // Update reservation status to CANCELLED
        reservation.status = 'CANCELLED';
        await reservation.save();

        res.json({
            message: 'Rezervasyon başarıyla iptal edildi.',
            reservation: {
                id: reservation.id,
                status: reservation.status,
                date: reservation.date
            }
        });
    } catch (error) {
        console.error('Cancel Reservation Error:', error);
        next(error);
    }
};

exports.scanReservation = async (req, res, next) => {
    const t = await db.sequelize.transaction();
    try {
        const { qrCode } = req.body;
        const MEAL_PRICE = 20.00;

        const reservation = await db.MealReservation.findOne({
            where: { qrCode },
            include: [
                {
                    model: MealMenu,
                    as: 'menu',
                },
                { 
                    model: db.User, 
                    as: 'user', 
                    attributes: ['id', 'fullName', 'email', 'role'],
                    include: [
                        {
                            model: db.Student,
                            attributes: ['hasScholarship']
                        }
                    ]
                }
            ],
            transaction: t
        });

        if (!reservation) {
            throw new NotFoundError('Geçersiz QR Kod. Rezervasyon bulunamadı.');
        }

        // QR kod sınırsız kullanılabilir, status kontrolü yapılmıyor
        // Sadece iptal edilmiş rezervasyonlar kullanılamaz
        if (reservation.status === 'CANCELLED') {
            throw new ValidationError('Bu rezervasyon iptal edilmiş!');
        }

        // Check date
        const today = new Date().toISOString().split('T')[0];
        if (reservation.date !== today) {
            throw new ValidationError(`Bu rezervasyon bugüne ait değil! (${reservation.date})`);
        }

        // Check if QR code can be used within meal time window
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const mealType = reservation.mealType; // 'LUNCH' or 'DINNER'

        let canUseQR = false;
        if (mealType === 'LUNCH') {
            // Öğle yemeği: 12:00 - 14:00 arasında kullanılabilir (12:00 dahil, 14:00 hariç)
            const startMinutes = 12 * 60; // 12:00 = 720 dakika
            const endMinutes = 14 * 60; // 14:00 = 840 dakika
            canUseQR = currentTimeInMinutes >= startMinutes && currentTimeInMinutes < endMinutes;
        } else if (mealType === 'DINNER') {
            // Akşam yemeği: 16:00 - 19:00 arasında kullanılabilir (16:00 dahil, 19:00 hariç)
            const startMinutes = 16 * 60; // 16:00 = 960 dakika
            const endMinutes = 19 * 60; // 19:00 = 1140 dakika
            canUseQR = currentTimeInMinutes >= startMinutes && currentTimeInMinutes < endMinutes;
        }

        if (!canUseQR) {
            const mealTimeWindow = mealType === 'LUNCH' ? '12:00 - 14:00' : '16:00 - 19:00';
            throw new ValidationError(`QR kod sadece yemek saatinde kullanılabilir (${mealTimeWindow}).`);
        }

        const userId = reservation.userId;
        const isScholarshipStudent = reservation.user?.Student?.hasScholarship || false;

        let shouldCharge = true;
        let chargeAmount = MEAL_PRICE;

        // Wallet'ı bul veya oluştur (ücretsiz yemek için de gerekli transaction kaydı için)
        let wallet = await db.Wallet.findOne({ 
            where: { userId }, 
            transaction: t 
        });

        if (!wallet) {
            wallet = await db.Wallet.create({ userId, balance: 0 }, { transaction: t });
        }

        // Check if scholarship student has already used free meal today for THIS meal type (LUNCH or DINNER)
        // QR kod sınırsız kullanılabilir, her okutmada kontrol edilir
        // Burslu öğrenci her öğün türü için sadece ilk okutmada ücretsiz, sonraki tüm okutmalarda ücretli
        if (isScholarshipStudent) {
            // Bugün bu öğün türü için ücretsiz yemek kullanılmış mı kontrol et (Transaction kayıtlarından)
            const todayStart = new Date(`${today}T00:00:00.000Z`);
            const todayEnd = new Date(`${today}T23:59:59.999Z`);
            const mealTypeText = mealType === 'LUNCH' ? 'Öğle Yemeği' : 'Akşam Yemeği';
            
            // Bu öğün türü için bugün ücretsiz (amount=0) yemek kullanılmış mı kontrol et
            const todayFreeMealUsed = await db.Transaction.findOne({
                where: {
                    walletId: wallet.id,
                    referenceType: 'MEAL_RESERVATION_SCAN',
                    amount: 0,
                    createdAt: {
                        [Op.gte]: todayStart,
                        [Op.lte]: todayEnd
                    },
                    description: {
                        [Op.like]: `%${mealTypeText}%`
                    }
                },
                transaction: t
            });

            if (!todayFreeMealUsed) {
                // İlk ücretsiz yemek - bugün bu öğün türü için daha önce ücretsiz yemek kullanılmamış
                shouldCharge = false;
                chargeAmount = 0;
                console.log(`[Burslu Öğrenci] İlk ücretsiz yemek: ${mealTypeText} - UserId: ${userId}, Date: ${today}`);
            } else {
                // Bu öğün türü için bugün zaten ücretsiz yemek kullanılmış, artık ücretli
                shouldCharge = true;
                chargeAmount = MEAL_PRICE;
                console.log(`[Burslu Öğrenci] Ücretli yemek: ${mealTypeText} - UserId: ${userId}, Date: ${today}, Ücretsiz kullanım tarihi: ${todayFreeMealUsed.createdAt}`);
            }
        }

        // Deduct balance if needed
        if (shouldCharge) {

            if (parseFloat(wallet.balance) < chargeAmount) {
                throw new ValidationError(`Yetersiz Bakiye. Mevcut: ${wallet.balance} TL, Gerekli: ${chargeAmount} TL`);
            }

            // Deduct balance
            const newBalance = parseFloat(wallet.balance) - chargeAmount;
            await wallet.update({ balance: newBalance }, { transaction: t });

            // Create Transaction Record
            await db.Transaction.create({
                walletId: wallet.id,
                type: 'DEBIT',
                amount: chargeAmount,
                balanceAfter: newBalance,
                referenceType: 'MEAL_RESERVATION_SCAN',
                description: `Yemek Teslimi - ${mealType === 'LUNCH' ? 'Öğle Yemeği' : 'Akşam Yemeği'} (${today})`,
                referenceId: reservation.id.toString()
            }, { transaction: t });

            // Update reservation amount
            reservation.amount = chargeAmount;
        } else {
            // Free meal - Transaction kaydı oluştur (amount=0) ama balance değişmez
            await db.Transaction.create({
                walletId: wallet.id,
                type: 'DEBIT',
                amount: 0,
                balanceAfter: wallet.balance, // Balance değişmez
                referenceType: 'MEAL_RESERVATION_SCAN',
                description: `Yemek Teslimi (Ücretsiz) - ${mealType === 'LUNCH' ? 'Öğle Yemeği' : 'Akşam Yemeği'} (${today})`,
                referenceId: reservation.id.toString()
            }, { transaction: t });

            // Free meal - set amount to 0
            reservation.amount = 0;
        }

        // Update reservation - QR kod sınırsız kullanılabilir
        // Her okutmada usedAt güncellenir, status 'USED' olarak kalır ama tekrar kullanılabilir
        if (reservation.status !== 'USED') {
            reservation.status = 'USED';
        }
        reservation.usedAt = new Date(); // Her okutmada son kullanım tarihi güncellenir
        await reservation.save({ transaction: t });

        await t.commit();

        const message = shouldCharge 
            ? `Afiyet olsun! ${chargeAmount} TL bakiyenizden düşüldü.`
            : 'Afiyet olsun! Burslu öğrenci olarak ücretsiz yemeğiniz teslim edildi.';

        res.json({
            message,
            user: {
                name: reservation.user.fullName,
                fullName: reservation.user.fullName,
                email: reservation.user.email
            },
            menu: reservation.menu,
            amount: chargeAmount,
            isFree: !shouldCharge
        });

    } catch (error) {
        // Only rollback if transaction is still active (not already committed or rolled back)
        try {
            await t.rollback();
        } catch (rollbackError) {
            // Transaction already finished (committed or rolled back), ignore rollback error
            if (!rollbackError.message.includes('finished') && !rollbackError.message.includes('rollback')) {
                // If it's a different error, log it
                console.warn('Unexpected rollback error:', rollbackError.message);
            }
        }
        console.error('Scan Reservation Error:', error);
        next(error);
    }
};
