const { Router } = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const attendanceController = require('../controllers/attendanceController');
const excuseController = require('../controllers/excuseController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

// Cloudinary yapılandırması
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Mazeret belgeleri için Cloudinary storage
const excuseDocumentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'smart-campus-excuse-documents',
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'doc', 'docx'],
    resource_type: 'auto', // PDF ve diğer dosya türlerini desteklemek için
  },
});

const uploadExcuseDocument = multer({ storage: excuseDocumentStorage });

const router = Router();

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);

// Admin/Faculty yoklama oluşturur
router.post('/sessions', authorizeRole('admin', 'faculty'), attendanceController.createSession);

// Admin/Faculty kendi oturumlarını görür
router.get('/sessions/my-sessions', authorizeRole('admin', 'faculty'), attendanceController.getMySessions);

// Admin/Faculty oturumu kapatır
router.put('/sessions/:sessionId/close', authorizeRole('admin', 'faculty'), attendanceController.closeSession);

// Öğrenciler aktif oturumları görür
router.get('/sessions/active', authorizeRole('student'), attendanceController.getActiveSessions);

// Herkes oturum detayını görür (kendi yetkisi dahilinde)
router.get('/sessions/:sessionId', attendanceController.getSessionById);

// Öğrenciler yoklamaya katılır
router.post('/sessions/:sessionId/checkin', authorizeRole('student'), attendanceController.checkIn);

// Öğrenciler kod ile yoklamaya katılır
router.post('/sessions/code/:code/checkin', authorizeRole('student'), attendanceController.checkInByCode);

// Öğrenciler kendi yoklama geçmişlerini görür
router.get('/my-attendance', authorizeRole('student'), attendanceController.getMyAttendance);

// Öğrenciler ders bazında yoklama durumlarını görür
router.get('/my-attendance-by-course', authorizeRole('student'), attendanceController.getMyAttendanceByCourse);

// Admin/Faculty yoklama raporunu görür
router.get('/report/:sessionId', authorizeRole('admin', 'faculty'), attendanceController.getSessionReport);

// Mazeret talepleri
// Öğrenciler mazeret talebi oluşturur (belge yükleme ile)
router.post('/excuse-requests', authorizeRole('student'), uploadExcuseDocument.single('document'), excuseController.submitExcuseRequest);

// Öğrenciler kendi mazeret taleplerini görür
router.get('/excuse-requests/my-requests', authorizeRole('student'), excuseController.getMyExcuseRequests);

// Öğretmenler kendi dersleri için mazeret taleplerini görür
router.get('/excuse-requests/pending', authorizeRole('admin', 'faculty'), excuseController.getExcuseRequestsForInstructor);

// Öğretmenler mazeret talebini onaylar
router.put('/excuse-requests/:requestId/approve', authorizeRole('admin', 'faculty'), excuseController.approveExcuseRequest);

// Öğretmenler mazeret talebini reddeder
router.put('/excuse-requests/:requestId/reject', authorizeRole('admin', 'faculty'), excuseController.rejectExcuseRequest);

// Öğrenciler belirli bir tarih ve section için yoklama oturumlarını getirir
router.get('/excuse-requests/sessions', authorizeRole('student'), excuseController.getSessionsForExcuseRequest);

module.exports = router;

