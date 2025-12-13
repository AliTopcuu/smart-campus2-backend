const { Router } = require('express');
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

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

// Öğrenciler kendi yoklama geçmişlerini görür
router.get('/my-attendance', authorizeRole('student'), attendanceController.getMyAttendance);

// Admin/Faculty yoklama raporunu görür
router.get('/report/:sessionId', authorizeRole('admin', 'faculty'), attendanceController.getSessionReport);

module.exports = router;

