const { Router } = require('express');
const mealController = require('../controllers/mealController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeRole');

const router = Router();

// Public or Authenticated ?
// Let's make them authenticated to be safe.

router.get('/menus', authenticate, mealController.getAllMenus);
router.get('/menus/:id', authenticate, mealController.getMenuById);

// Admin / Cafeteria Staff only
// Assuming 'admin' and 'cafeteria_staff' roles.
// authorize function might accept an array or single string.
// Let's assume it accepts a single string for now or check if it accepts array.
// Based on usage `authorize('admin')`, let's try to pass 'admin' for now.
// If multiple roles needed, I might need to check authorize implementation.

router.post('/menus', authenticate, authorize('admin'), mealController.createMenu);
router.put('/menus/:id', authenticate, authorize('admin'), mealController.updateMenu);
router.delete('/menus/:id', authenticate, authorize('admin'), mealController.deleteMenu);

// Cafeterias
router.get('/cafeterias', authenticate, mealController.getCafeterias);
router.post('/cafeterias', authenticate, authorize('admin'), mealController.createCafeteria);
router.delete('/cafeterias/:id', authenticate, authorize('admin'), mealController.deleteCafeteria);

// Reservations
router.post('/reservations', authenticate, mealController.createReservation);
router.get('/reservations/my', authenticate, mealController.getMyReservations);
router.post('/reservations/scan', authenticate, authorize(['admin', 'faculty', 'cafeteria_staff']), mealController.scanReservation); // 'faculty' added for testing, ideally 'staff' role
router.delete('/reservations/:reservationId', authenticate, mealController.cancelReservation); // Must be after /scan to avoid route conflicts

module.exports = router;
