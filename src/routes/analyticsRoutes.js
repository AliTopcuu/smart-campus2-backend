const { Router } = require('express');
const analyticsController = require('../controllers/analyticsController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

const router = Router();

// Tüm analytics endpoint'leri admin yetkisi gerektirir
router.use(authenticate);
router.use(authorizeRole('admin'));

/**
 * @route GET /api/v1/analytics/dashboard
 * @description Admin dashboard istatistikleri
 * @access Admin
 */
router.get('/dashboard', analyticsController.getDashboardStats);

/**
 * @route GET /api/v1/analytics/academic-performance
 * @description Akademik performans analizi
 * @access Admin
 */
router.get('/academic-performance', analyticsController.getAcademicPerformance);

/**
 * @route GET /api/v1/analytics/attendance
 * @description Yoklama analitiği
 * @access Admin
 */
router.get('/attendance', analyticsController.getAttendanceAnalytics);

/**
 * @route GET /api/v1/analytics/meal-usage
 * @description Yemek kullanım raporları
 * @access Admin
 */
router.get('/meal-usage', analyticsController.getMealUsageAnalytics);

/**
 * @route GET /api/v1/analytics/events
 * @description Etkinlik raporları
 * @access Admin
 */
router.get('/events', analyticsController.getEventAnalytics);

/**
 * @route GET /api/v1/analytics/export/:type
 * @description Rapor dışa aktarma (academic, attendance, meal, event)
 * @query format - excel, csv, pdf
 * @access Admin
 */
router.get('/export/:type', analyticsController.exportReport);

module.exports = router;
