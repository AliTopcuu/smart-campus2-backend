const db = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * GET /api/v1/analytics/dashboard
 * Admin dashboard istatistikleri
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // Toplam kullanıcı sayısı
        const totalUsers = await db.User.count();

        // Toplam ders sayısı
        const totalCourses = await db.Course.count();

        // Yoklama oranı (son 30 gün) - AttendanceRecord'da status yok, kayıt varsa "present" sayılır
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const totalAttendanceRecords = await db.AttendanceRecord.count({
            where: {
                checkInTime: { [Op.gte]: thirtyDaysAgo }
            }
        });

        // Toplam oturum sayısı (son 30 gün)
        const totalSessions = await db.AttendanceSession.count({
            where: {
                date: { [Op.gte]: thirtyDaysAgo }
            }
        });

        // Yoklama oranı hesapla (kayıt başına ortalama katılım yerine toplam katılım göster)
        const attendanceRate = totalAttendanceRecords;

        // Bugünkü yemek rezervasyonları
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        const mealReservationsToday = await db.MealReservation.count({
            where: {
                date: today
            }
        });

        // Yaklaşan etkinlikler
        const upcomingEvents = await db.Event.count({
            where: {
                date: { [Op.gte]: new Date() },
                status: { [Op.ne]: 'cancelled' }
            }
        });

        // Aktif öğrenci sayısı
        const activeStudents = await db.User.count({
            where: { role: 'student', status: 'active' }
        });

        // Aktif akademisyen sayısı
        const activeFaculty = await db.User.count({
            where: { role: 'faculty', status: 'active' }
        });

        // Sistem sağlığı
        let systemHealth = 'healthy';
        try {
            await db.sequelize.authenticate();
        } catch {
            systemHealth = 'unhealthy';
        }

        // Kullanıcı dağılımı (role bazında)
        const userDistribution = await db.User.findAll({
            attributes: [
                'role',
                [fn('COUNT', col('*')), 'count']
            ],
            group: ['role'],
            raw: true
        });

        // Haftalık yoklama trendi (son 7 gün)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const weeklyAttendance = await db.AttendanceRecord.findAll({
            attributes: [
                [fn('DATE', col('checkInTime')), 'date'],
                [fn('COUNT', col('*')), 'count']
            ],
            where: {
                checkInTime: { [Op.gte]: sevenDaysAgo }
            },
            group: [fn('DATE', col('checkInTime'))],
            order: [[fn('DATE', col('checkInTime')), 'ASC']],
            raw: true
        });

        // Haftalık yemek trendi (son 7 gün)
        const weeklyMeals = await db.MealReservation.findAll({
            attributes: [
                'date',
                [fn('COUNT', col('*')), 'count']
            ],
            where: {
                date: { [Op.gte]: sevenDaysAgo.toISOString().split('T')[0] }
            },
            group: ['date'],
            order: [['date', 'ASC']],
            raw: true
        });

        // Son aktiviteler (gerçek veriler)
        const recentActivities = [];

        // Son kayıt olan kullanıcı
        const lastUser = await db.User.findOne({
            attributes: ['fullName', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        if (lastUser) {
            recentActivities.push({
                type: 'user',
                text: `${lastUser.fullName} sisteme kaydoldu`,
                time: lastUser.createdAt
            });
        }

        // Son yoklama oturumu
        const lastSession = await db.AttendanceSession.findOne({
            attributes: ['date', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        if (lastSession) {
            recentActivities.push({
                type: 'attendance',
                text: 'Yoklama oturumu başlatıldı',
                time: lastSession.createdAt
            });
        }

        // Son yemek rezervasyonu sayısı (bugün)
        const todayMealCount = mealReservationsToday;
        if (todayMealCount > 0) {
            recentActivities.push({
                type: 'meal',
                text: `${todayMealCount} yeni yemek rezervasyonu`,
                time: new Date()
            });
        }

        // Son etkinlik
        const lastEvent = await db.Event.findOne({
            attributes: ['title', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        if (lastEvent) {
            recentActivities.push({
                type: 'event',
                text: `"${lastEvent.title}" etkinliği oluşturuldu`,
                time: lastEvent.createdAt
            });
        }

        // Son not girişi
        const lastEnrollment = await db.Enrollment.findOne({
            attributes: ['updatedAt'],
            where: { letterGrade: { [Op.ne]: null } },
            order: [['updatedAt', 'DESC']]
        });
        if (lastEnrollment) {
            recentActivities.push({
                type: 'grade',
                text: 'Not girişi tamamlandı',
                time: lastEnrollment.updatedAt
            });
        }

        // Aktiviteleri zamana göre sırala
        recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json({
            totalUsers,
            totalCourses,
            attendanceRate,
            totalSessions,
            mealReservationsToday,
            upcomingEvents,
            activeStudents,
            activeFaculty,
            systemHealth,
            userDistribution: userDistribution.map(u => ({
                role: u.role,
                count: parseInt(u.count)
            })),
            weeklyAttendance: weeklyAttendance.map(w => ({
                date: w.date,
                count: parseInt(w.count)
            })),
            weeklyMeals: weeklyMeals.map(w => ({
                date: w.date,
                count: parseInt(w.count)
            })),
            recentActivities: recentActivities.slice(0, 5)
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Dashboard istatistikleri alınamadı' });
    }
};

/**
 * GET /api/v1/analytics/academic-performance
 * Akademik performans analizi
 */
exports.getAcademicPerformance = async (req, res) => {
    try {
        // Toplam kayıt sayısı
        const totalEnrollments = await db.Enrollment.count();

        // Tamamlanan kayıtlar
        const completedEnrollments = await db.Enrollment.count({
            where: { status: 'completed' }
        });

        // Not dağılımı
        const gradeDistribution = await db.Enrollment.findAll({
            attributes: [
                'letterGrade',
                [fn('COUNT', col('*')), 'count']
            ],
            where: {
                letterGrade: { [Op.ne]: null }
            },
            group: ['letterGrade'],
            raw: true
        });

        // Toplam not sayısı
        const totalGrades = gradeDistribution.reduce((sum, g) => sum + parseInt(g.count || 0), 0);

        const gradePercentages = {
            A: 0, B: 0, C: 0, D: 0, F: 0
        };

        gradeDistribution.forEach(g => {
            const letter = g.letterGrade?.charAt(0) || 'F';
            if (gradePercentages.hasOwnProperty(letter)) {
                gradePercentages[letter] += (parseInt(g.count || 0) / Math.max(totalGrades, 1)) * 100;
            }
        });

        // Geçme/kalma oranları (gradePoint >= 2.0 geçti)
        // Sadece gradePoint değeri olan kayıtları say
        const passCount = await db.Enrollment.count({
            where: {
                gradePoint: { [Op.gte]: 2.0 }
            }
        });

        const failCount = await db.Enrollment.count({
            where: {
                gradePoint: { [Op.lt]: 2.0, [Op.ne]: null }
            }
        });

        const totalWithGrades = passCount + failCount;
        const passRate = totalWithGrades > 0 ? Math.round((passCount / totalWithGrades) * 100) : 0;
        const failRate = totalWithGrades > 0 ? Math.round((failCount / totalWithGrades) * 100) : 0;

        // Ortalama GPA
        const avgGpaResult = await db.Enrollment.findOne({
            attributes: [
                [fn('AVG', col('gradePoint')), 'avgGpa']
            ],
            where: {
                gradePoint: { [Op.ne]: null }
            },
            raw: true
        });
        const avgGpa = parseFloat(avgGpaResult?.avgGpa || 0).toFixed(2);

        // En başarılı öğrenciler (Enrollment'lardan hesaplanan GPA'ya göre)
        const topStudentsRaw = await db.Enrollment.findAll({
            attributes: [
                'studentId',
                [fn('AVG', col('gradePoint')), 'calculatedGpa'],
                [fn('COUNT', col('Enrollment.id')), 'courseCount']
            ],
            include: [{
                model: db.User,
                as: 'student',
                attributes: ['id', 'fullName', 'email']
            }],
            where: {
                gradePoint: { [Op.ne]: null }
            },
            group: ['studentId', 'student.id', 'student.fullName', 'student.email'],
            having: literal('AVG("gradePoint") >= 0'),
            order: [[fn('AVG', col('gradePoint')), 'DESC']],
            limit: 10,
            raw: true
        });

        // Risk altındaki öğrenciler (düşük GPA < 2.0)
        const atRiskStudentsRaw = await db.Enrollment.findAll({
            attributes: [
                'studentId',
                [fn('AVG', col('gradePoint')), 'calculatedGpa'],
                [fn('COUNT', col('Enrollment.id')), 'courseCount']
            ],
            include: [{
                model: db.User,
                as: 'student',
                attributes: ['id', 'fullName', 'email']
            }],
            where: {
                gradePoint: { [Op.ne]: null }
            },
            group: ['studentId', 'student.id', 'student.fullName', 'student.email'],
            having: literal('AVG("gradePoint") < 2.0'),
            order: [[fn('AVG', col('gradePoint')), 'ASC']],
            limit: 10,
            raw: true
        });

        // Student tablosundan öğrenci numaralarını al
        const allUserIds = [
            ...topStudentsRaw.map(s => s.studentId),
            ...atRiskStudentsRaw.map(s => s.studentId)
        ];

        const studentRecords = await db.Student.findAll({
            attributes: ['userId', 'studentNumber'],
            where: { userId: { [Op.in]: allUserIds } },
            raw: true
        });

        // userId -> studentNumber haritası oluştur
        const studentNumberMap = {};
        studentRecords.forEach(s => {
            studentNumberMap[s.userId] = s.studentNumber;
        });

        res.json({
            summary: {
                totalEnrollments,
                completedEnrollments,
                totalGrades,
                avgGpa: parseFloat(avgGpa)
            },
            gradeDistribution: gradePercentages,
            passFailRate: {
                passRate,
                failRate
            },
            topStudents: topStudentsRaw.map(s => ({
                id: s.studentId,
                studentNumber: studentNumberMap[s.studentId] || s.studentId,
                fullName: s['student.fullName'] || '-',
                email: s['student.email'] || '-',
                gpa: parseFloat(s.calculatedGpa || 0).toFixed(2),
                courseCount: parseInt(s.courseCount || 0)
            })),
            atRiskStudents: atRiskStudentsRaw.map(s => ({
                id: s.studentId,
                studentNumber: studentNumberMap[s.studentId] || s.studentId,
                fullName: s['student.fullName'] || '-',
                email: s['student.email'] || '-',
                gpa: parseFloat(s.calculatedGpa || 0).toFixed(2),
                courseCount: parseInt(s.courseCount || 0)
            }))
        });
    } catch (error) {
        console.error('Academic performance error:', error);
        res.status(500).json({ error: 'Akademik performans verileri alınamadı' });
    }
};

/**
 * GET /api/v1/analytics/attendance
 * Yoklama analitiği
 */
exports.getAttendanceAnalytics = async (req, res) => {
    try {
        // Toplam oturum sayısı
        const totalSessions = await db.AttendanceSession.count();

        // Toplam yoklama kaydı (katılım)
        const totalAttendance = await db.AttendanceRecord.count();

        // Aktif oturumlar
        const activeSessions = await db.AttendanceSession.count({
            where: { status: 'active' }
        });

        // Son 30 günlük yoklama trendleri
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const attendanceTrends = await db.AttendanceRecord.findAll({
            attributes: [
                [fn('DATE', col('checkInTime')), 'date'],
                [fn('COUNT', col('*')), 'count']
            ],
            where: {
                checkInTime: { [Op.gte]: thirtyDaysAgo }
            },
            group: [fn('DATE', col('checkInTime'))],
            order: [[fn('DATE', col('checkInTime')), 'ASC']],
            raw: true
        });

        // Ders bazlı yoklama sayıları
        const attendanceBySection = await db.AttendanceSession.findAll({
            attributes: [
                'id',
                'date',
                'sectionId'
            ],
            include: [
                {
                    model: db.CourseSection,
                    as: 'section',
                    attributes: ['sectionNumber'],
                    include: [{
                        model: db.Course,
                        as: 'course',
                        attributes: ['code', 'name']
                    }]
                },
                {
                    model: db.AttendanceRecord,
                    as: 'records',
                    attributes: ['id']
                }
            ],
            order: [['date', 'DESC']],
            limit: 20
        });

        // Haftalık ortalama
        const weeklyAverage = attendanceTrends.length > 0
            ? Math.round(attendanceTrends.reduce((sum, t) => sum + parseInt(t.count || 0), 0) / Math.max(attendanceTrends.length, 1))
            : 0;

        // Bayraklı kayıtlar (şüpheli yoklamalar)
        const flaggedRecords = await db.AttendanceRecord.count({
            where: { isFlagged: true }
        });

        res.json({
            summary: {
                totalSessions,
                totalAttendance,
                activeSessions,
                weeklyAverage,
                flaggedRecords
            },
            attendanceTrends: attendanceTrends.map(item => ({
                date: item.date,
                count: parseInt(item.count) || 0
            })),
            recentSessions: attendanceBySection.map(session => ({
                id: session.id,
                date: session.date,
                sectionNumber: session.section?.sectionNumber,
                courseCode: session.section?.course?.code,
                courseName: session.section?.course?.name,
                attendanceCount: session.records?.length || 0
            }))
        });
    } catch (error) {
        console.error('Attendance analytics error:', error);
        res.status(500).json({ error: 'Yoklama analitiği alınamadı' });
    }
};

/**
 * GET /api/v1/analytics/meal-usage
 * Yemek kullanım raporları
 */
exports.getMealUsageAnalytics = async (req, res) => {
    try {
        // Son 30 günlük günlük yemek sayıları
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyMealCounts = await db.MealReservation.findAll({
            attributes: [
                'date',
                [fn('COUNT', col('*')), 'count']
            ],
            where: {
                date: { [Op.gte]: thirtyDaysAgo }
            },
            group: ['date'],
            order: [['date', 'ASC']],
            raw: true
        });

        // Yemekhane kullanımı
        const cafeteriaUtilization = await db.MealReservation.findAll({
            attributes: [
                'cafeteriaId',
                [fn('COUNT', col('*')), 'count']
            ],
            include: [{
                model: db.Cafeteria,
                as: 'cafeteria',
                attributes: ['id', 'name']
            }],
            group: ['cafeteriaId', 'cafeteria.id', 'cafeteria.name'],
            raw: true
        });

        // Öğün bazında kullanım (kahvaltı, öğle, akşam)
        const mealTypeUsage = await db.MealReservation.findAll({
            attributes: [
                'mealType',
                [fn('COUNT', col('*')), 'count']
            ],
            group: ['mealType'],
            raw: true
        });

        // Yoğun saatler (kullanım zamanlarına göre - usedAt)
        const peakHours = await db.MealReservation.findAll({
            attributes: [
                [fn('EXTRACT', literal('HOUR FROM "usedAt"')), 'hour'],
                [fn('COUNT', col('*')), 'count']
            ],
            where: {
                usedAt: { [Op.ne]: null }
            },
            group: [fn('EXTRACT', literal('HOUR FROM "usedAt"'))],
            order: [[fn('COUNT', col('*')), 'DESC']],
            raw: true
        });

        // Toplam istatistikler
        const totalMeals = await db.MealReservation.count();
        const usedMeals = await db.MealReservation.count({
            where: { status: 'USED' }
        });

        // Yemekhane sayısı
        const activeCafeterias = await db.Cafeteria.count();

        // Toplam gelir
        const totalRevenueResult = await db.MealReservation.sum('amount', {
            where: { status: 'USED' }
        });
        const totalRevenue = totalRevenueResult || 0;

        // Günlük ortalama
        const dailyAverage = dailyMealCounts.length > 0
            ? Math.round(dailyMealCounts.reduce((sum, d) => sum + parseInt(d.count || 0), 0) / dailyMealCounts.length)
            : 0;

        res.json({
            dailyMealCounts: dailyMealCounts.map(item => ({
                date: item.date,
                count: parseInt(item.count) || 0
            })),
            cafeteriaUtilization: cafeteriaUtilization.map(item => ({
                cafeteriaId: item.cafeteriaId,
                cafeteriaName: item['cafeteria.name'] || 'Bilinmeyen',
                count: parseInt(item.count) || 0
            })),
            mealTypeUsage: mealTypeUsage.map(item => ({
                mealType: item.mealType,
                count: parseInt(item.count) || 0
            })),
            peakHours: peakHours.slice(0, 5).map(item => ({
                hour: parseInt(item.hour),
                count: parseInt(item.count) || 0
            })),
            totalMeals,
            usedMeals,
            activeCafeterias,
            dailyAverage,
            totalRevenue
        });
    } catch (error) {
        console.error('Meal usage analytics error:', error);
        res.status(500).json({ error: 'Yemek kullanım raporları alınamadı' });
    }
};

/**
 * GET /api/v1/analytics/events
 * Etkinlik raporları
 */
exports.getEventAnalytics = async (req, res) => {
    try {
        // Tüm etkinlikler
        const allEvents = await db.Event.findAll({
            attributes: ['id', 'title', 'category', 'capacity', 'startDate', 'date', 'currentParticipants'],
            include: [{
                model: db.EventRegistration,
                as: 'registrations',
                attributes: ['id', 'status']
            }],
            order: [['currentParticipants', 'DESC']]
        });

        // En popüler etkinlikler (en çok katılımcıya sahip)
        const popularEvents = allEvents.slice(0, 10);

        // Kayıt oranları
        const registrationRates = allEvents.map(event => ({
            eventId: event.id,
            eventTitle: event.title,
            capacity: event.capacity,
            registrations: event.registrations?.length || 0,
            rate: event.capacity > 0
                ? Math.round(((event.registrations?.length || 0) / event.capacity) * 100)
                : 0
        }));

        // Check-in oranları (status = 'checked-in')
        const totalRegs = await db.EventRegistration.count();
        const checkedIn = await db.EventRegistration.count({
            where: { status: 'checked-in' }
        });
        const checkInRate = totalRegs > 0 ? Math.round((checkedIn / totalRegs) * 100) : 0;

        // Kategori dağılımı
        const categoryBreakdown = await db.Event.findAll({
            attributes: [
                'category',
                [fn('COUNT', col('*')), 'count']
            ],
            group: ['category'],
            raw: true
        });

        res.json({
            popularEvents: popularEvents.map(e => ({
                id: e.id,
                title: e.title,
                category: e.category,
                capacity: e.capacity,
                startDate: e.startDate || e.date
            })),
            registrationRates,
            checkInStats: {
                totalRegistrations: totalRegs,
                checkedIn,
                checkInRate
            },
            categoryBreakdown: categoryBreakdown.map(item => ({
                category: item.category || 'Genel',
                count: parseInt(item.count) || 0
            }))
        });
    } catch (error) {
        console.error('Event analytics error:', error);
        res.status(500).json({ error: 'Etkinlik raporları alınamadı' });
    }
};

/**
 * GET /api/v1/analytics/export/:type
 * Rapor dışa aktarma
 */
exports.exportReport = async (req, res) => {
    const { type } = req.params;
    const { format = 'excel' } = req.query;

    try {
        let data;
        let filename;

        switch (type) {
            case 'academic':
                data = await getAcademicExportData();
                filename = 'akademik_rapor';
                break;
            case 'attendance':
                data = await getAttendanceExportData();
                filename = 'yoklama_raporu';
                break;
            case 'meal':
                data = await getMealExportData();
                filename = 'yemek_raporu';
                break;
            case 'event':
                data = await getEventExportData();
                filename = 'etkinlik_raporu';
                break;
            default:
                return res.status(400).json({ error: 'Geçersiz rapor tipi' });
        }

        switch (format.toLowerCase()) {
            case 'excel':
                return exportToExcel(res, data, filename);
            case 'csv':
                return exportToCSV(res, data, filename);
            case 'pdf':
                return exportToPDF(res, data, filename);
            default:
                return res.status(400).json({ error: 'Geçersiz format' });
        }
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Rapor dışa aktarılamadı' });
    }
};

// Helper functions for export data
async function getAcademicExportData() {
    const enrollments = await db.Enrollment.findAll({
        include: [{
            model: db.User,
            as: 'student',
            attributes: ['fullName', 'email']
        }, {
            model: db.CourseSection,
            as: 'section',
            include: [{
                model: db.Course,
                as: 'course',
                attributes: ['code', 'name']
            }]
        }],
        order: [['createdAt', 'DESC']],
        limit: 1000
    });

    // Durum çevirisi
    const statusMap = {
        'pending': 'Beklemede',
        'enrolled': 'Kayıtlı',
        'dropped': 'Bırakıldı',
        'completed': 'Tamamlandı',
        'failed': 'Kaldı',
        'rejected': 'Reddedildi'
    };

    return {
        title: 'Akademik Performans Raporu',
        headers: ['Öğrenci', 'E-posta', 'Ders Kodu', 'Ders Adı', 'GPA', 'Harf Notu', 'Durum'],
        rows: enrollments.map(e => [
            e.student?.fullName || '-',
            e.student?.email || '-',
            e.section?.course?.code || '-',
            e.section?.course?.name || '-',
            e.gradePoint || '-',
            e.letterGrade || '-',
            statusMap[e.status] || e.status || '-'
        ])
    };
}

async function getAttendanceExportData() {
    const records = await db.AttendanceRecord.findAll({
        include: [{
            model: db.User,
            as: 'student',
            attributes: ['fullName', 'email']
        }, {
            model: db.AttendanceSession,
            as: 'session',
            include: [{
                model: db.CourseSection,
                as: 'section',
                include: [{
                    model: db.Course,
                    as: 'course',
                    attributes: ['code', 'name']
                }]
            }]
        }],
        order: [['checkInTime', 'DESC']],
        limit: 1000
    });

    return {
        title: 'Yoklama Raporu',
        headers: ['Öğrenci', 'E-posta', 'Ders Kodu', 'Ders Adı', 'Tarih', 'Saat', 'Durum'],
        rows: records.map(r => [
            r.student?.fullName || '-',
            r.student?.email || '-',
            r.session?.section?.course?.code || '-',
            r.session?.section?.course?.name || '-',
            r.checkInTime ? new Date(r.checkInTime).toLocaleDateString('tr-TR') : '-',
            r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('tr-TR') : '-',
            r.isFlagged ? 'Şüpheli' : 'Onaylı'
        ])
    };
}

async function getMealExportData() {
    const reservations = await db.MealReservation.findAll({
        include: [{
            model: db.User,
            as: 'user',
            attributes: ['fullName', 'email']
        }, {
            model: db.Cafeteria,
            as: 'cafeteria',
            attributes: ['name']
        }],
        order: [['date', 'DESC']],
        limit: 1000
    });

    return {
        title: 'Yemek Kullanım Raporu',
        headers: ['Kullanıcı', 'E-posta', 'Yemekhane', 'Tarih', 'Öğün', 'Durum', 'Kullanım Saati'],
        rows: reservations.map(r => [
            r.user?.fullName || '-',
            r.user?.email || '-',
            r.cafeteria?.name || '-',
            r.date || '-',
            r.mealType === 'breakfast' ? 'Kahvaltı' : r.mealType === 'lunch' ? 'Öğle' : 'Akşam',
            r.status || '-',
            r.usedAt ? new Date(r.usedAt).toLocaleTimeString('tr-TR') : '-'
        ])
    };
}

async function getEventExportData() {
    const registrations = await db.EventRegistration.findAll({
        include: [{
            model: db.User,
            as: 'user',
            attributes: ['fullName', 'email']
        }, {
            model: db.Event,
            as: 'event',
            attributes: ['title', 'category', 'startDate']
        }],
        order: [['createdAt', 'DESC']],
        limit: 1000
    });

    return {
        title: 'Etkinlik Raporu',
        headers: ['Katılımcı', 'E-posta', 'Etkinlik', 'Kategori', 'Tarih', 'Check-in'],
        rows: registrations.map(r => [
            r.user?.fullName || '-',
            r.user?.email || '-',
            r.event?.title || '-',
            r.event?.category || '-',
            r.event?.startDate?.toLocaleDateString('tr-TR') || '-',
            r.status === 'checked-in' ? 'Evet' : 'Hayır'
        ])
    };
}

// Export to Excel
async function exportToExcel(res, data, filename) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(data.title);

    // Add title
    worksheet.addRow([data.title]);
    worksheet.addRow([]);

    // Add headers
    const headerRow = worksheet.addRow(data.headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data rows
    data.rows.forEach(row => {
        worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
        column.width = 20;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
}

// Export to CSV
function exportToCSV(res, data, filename) {
    const rows = [data.headers, ...data.rows];
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
    res.send('\uFEFF' + csv); // BOM for UTF-8
}

// Export to PDF
function exportToPDF(res, data, filename) {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);

    doc.pipe(res);

    // Title
    doc.fontSize(18).text(data.title, { align: 'center' });
    doc.moveDown();

    // Table
    const cellWidth = 80;
    const cellHeight = 20;
    let y = doc.y;

    // Headers
    data.headers.forEach((header, i) => {
        doc.fontSize(10)
            .fillColor('white')
            .rect(50 + i * cellWidth, y, cellWidth, cellHeight)
            .fill('#4472C4')
            .fillColor('white')
            .text(header, 52 + i * cellWidth, y + 5, { width: cellWidth - 4 });
    });
    y += cellHeight;

    // Data rows
    doc.fillColor('black');
    data.rows.slice(0, 30).forEach(row => { // Limit to 30 rows for PDF
        row.forEach((cell, i) => {
            doc.fontSize(8).text(String(cell), 52 + i * cellWidth, y + 5, { width: cellWidth - 4 });
        });
        y += cellHeight;
    });

    doc.end();
}
