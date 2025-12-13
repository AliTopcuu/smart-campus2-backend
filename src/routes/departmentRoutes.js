const { Router } = require('express');
const departmentController = require('../controllers/departmentController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRole = require('../middleware/authorizeRole');

const router = Router();

// Log middleware for debugging
router.use((req, res, next) => {
  console.log(`[Department Routes] ${req.method} ${req.path}`);
  next();
});

router.get('/', authenticate, departmentController.list);
router.post('/', authenticate, authorizeRole(['admin']), departmentController.create);
router.put('/:id', authenticate, authorizeRole(['admin']), departmentController.update);
router.delete('/:id', authenticate, authorizeRole(['admin']), departmentController.remove);

module.exports = router;
