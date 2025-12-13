const { Router } = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { Op } = require('sequelize');
const authController = require('../controllers/authController');
const authService = require('../services/authService');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeRole');
const { ValidationError } = require('../utils/errors');
const db = require('../models');
const { User, Student, Faculty, Department } = db;

const router = Router();

/* -------------------------------------------------------
   ☁️ CLOUDINARY YAPILANDIRMASI
------------------------------------------------------- */
// .env dosyasındaki bilgileri alıp Cloudinary'yi başlatıyoruz
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer için Cloudinary deposunu ayarlıyoruz
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'smart-campus-profiles', // Cloudinary'de bu isimde bir klasör açar
    allowed_formats: ['jpg', 'png', 'jpeg'], // Sadece resimlere izin ver
    transformation: [{ width: 500, height: 500, crop: 'limit' }], // (İsteğe bağlı) Resmi kare yapar ve optimize eder
  },
});

const upload = multer({ storage: storage });

/* -------------------------------------------------------
   👤 KULLANICI ROTALARI
------------------------------------------------------- */

// Profil Bilgilerini Getir
router.get('/me', authenticate, authController.getProfile);

// Profil Bilgilerini Güncelle (İsim, Telefon)
router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { fullName, phone } = req.body;
    if (fullName) {
      req.user.fullName = fullName;
      await req.user.save();
    }
    if (phone) {
      req.user.phone = phone;
      await req.user.save();
    }

    const profile = await authService.getProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// Şifre Değiştir
router.post('/me/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current and new password are required');
    }

    const isValid = await bcrypt.compare(currentPassword, req.user.passwordHash);
    if (!isValid) {
      throw new ValidationError('Current password is incorrect');
    }

    req.user.passwordHash = await bcrypt.hash(newPassword, 10);
    await req.user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------
   🖼️ PROFİL FOTOĞRAFI YÜKLEME (CLOUDINARY)
------------------------------------------------------- */
router.post('/me/profile-picture', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('File is required');
    }

    // Cloudinary yüklemeyi tamamlayınca dosya bilgilerini req.file içine koyar.
    // req.file.path -> Cloudinary'deki resmin direkt URL'idir (https://res.cloudinary.com/...)
    const imageUrl = req.file.path;

    // Veritabanını güncelle
    req.user.profilePictureUrl = imageUrl;
    await req.user.save();

    res.json({ avatarUrl: imageUrl });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------
   👑 ADMİN ROTALARI (Kullanıcı Listeleme)
------------------------------------------------------- */
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, department, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const where = {};
    if (role) where.role = role;
    if (search) {
      where.fullName = { [Op.iLike]: `%${search}%` };
    }

    const departmentFilter = department
      ? { where: { code: { [Op.iLike]: department } }, required: false }
      : {};

    const include = [
      { model: Student, include: [{ model: Department, ...departmentFilter }] },
      { model: Faculty, include: [{ model: Department, ...departmentFilter }] },
    ];

    const { count, rows } = await User.findAndCountAll({
      where,
      include,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      data: rows.map(authService.buildUserPayload),
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: count,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;