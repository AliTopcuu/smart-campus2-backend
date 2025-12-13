const { Router } = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const attendanceRoutes = require('./attendanceRoutes');

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'Smart Campus API v1' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/attendance', attendanceRoutes);

module.exports = router;

