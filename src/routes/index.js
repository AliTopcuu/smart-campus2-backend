const { Router } = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const courseRoutes = require('./courseRoutes');
const sectionRoutes = require('./sectionRoutes');
const enrollmentRoutes = require('./enrollmentRoutes');
const gradeRoutes = require('./gradeRoutes');
const departmentRoutes = require('./departmentRoutes');

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'Smart Campus API v1' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/courses', courseRoutes);
router.use('/sections', sectionRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/grades', gradeRoutes);
router.use('/departments', departmentRoutes);
router.use('/meals', require('./mealRoutes'));
router.use('/wallet', require('./walletRoutes'));
router.use('/events', require('./eventRoutes'));
router.use('/reservations', require('./classroomReservationRoutes'));
router.use('/scheduling', require('./schedulingRoutes'));

module.exports = router;

