const db = require('../models');
const { AppError, ValidationError, ForbiddenError } = require('../utils/errors');
const { Op } = require('sequelize');

// Haversine formula ile mesafe hesaplama (metre cinsinden)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Unique kod oluştur
function generateSessionCode() {
  return `QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

const attendanceService = {
  // Admin/Faculty yoklama oturumu oluşturur
  createSession: async (userId, sessionData) => {
    const { sectionId, latitude, longitude, geofenceRadius, date, startTime, endTime } = sessionData;

    if (!sectionId || !latitude || !longitude) {
      throw new ValidationError('Section ID and location are required');
    }

    // Section bilgisini getir ve instructor kontrolü yap
    const section = await db.CourseSection.findByPk(sectionId, {
      include: [{ model: db.Course, as: 'course' }]
    });

    if (!section) {
      throw new ValidationError('Section bulunamadı');
    }

    // Kullanıcının bu section'ın instructor'ı olduğunu kontrol et
    if (section.instructorId !== userId) {
      throw new ForbiddenError('Bu section için yetkiniz yok. Sadece kendi section\'larınıza yoklama başlatabilirsiniz.');
    }

    // QR kod oluştur (session ID ile birlikte)
    const qrCode = generateSessionCode();
    
    // Tarih ve saat formatı
    const sessionDate = date || new Date().toISOString().split('T')[0];
    const sessionStartTime = startTime || new Date().toTimeString().split(' ')[0].substring(0, 5);
    const sessionEndTime = endTime || null;

    const session = await db.AttendanceSession.create({
      sectionId,
      instructorId: userId,
      date: sessionDate,
      startTime: sessionStartTime,
      endTime: sessionEndTime,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      geofenceRadius: geofenceRadius || 250,
      qrCode: qrCode,
      status: 'active'
    });

    return {
      id: session.id,
      qrCode: session.qrCode,
      sectionId: session.sectionId,
      section: section,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      latitude: parseFloat(session.latitude),
      longitude: parseFloat(session.longitude),
      geofenceRadius: parseFloat(session.geofenceRadius),
      status: session.status
    };
  },

  // Oturumu kapat
  closeSession: async (sessionId, userId) => {
    const session = await db.AttendanceSession.findByPk(sessionId);
    
    if (!session) {
      throw new ValidationError('Session not found');
    }

    if (session.instructorId !== userId) {
      throw new ForbiddenError('You can only close your own sessions');
    }

    session.status = 'closed';
    await session.save();

    return {
      id: session.id,
      status: session.status
    };
  },

  // Kullanıcının oluşturduğu oturumları listele
  getMySessions: async (userId) => {
    const sessions = await db.AttendanceSession.findAll({
      where: { instructorId: userId },
      order: [['date', 'DESC'], ['startTime', 'DESC']],
      include: [
        {
          model: db.CourseSection,
          as: 'section',
          include: [{
            model: db.Course,
            as: 'course'
          }]
        },
        {
          model: db.AttendanceRecord,
          as: 'records',
          include: [{
            model: db.User,
            as: 'student',
            attributes: ['id', 'fullName', 'email'],
            include: [{
              model: db.Student,
              attributes: ['studentNumber'],
              required: false // LEFT JOIN - öğrenci kaydı olmayabilir
            }]
          }]
        }
      ]
    });

    return sessions.map(session => {
      // Date ve Time'i birleştir - Türkiye timezone (GMT+3) için
      // Tarih string'ini (YYYY-MM-DD) ve saat string'ini (HH:mm:ss) birleştir
      let startDateTime = null;
      let endDateTime = null;
      
      if (session.startTime) {
        const [startHours, startMinutes, startSeconds] = session.startTime.split(':').map(Number);
        // Tarih ve saati birleştir, Türkiye timezone'unda (GMT+3) yorumla
        // ISO string formatında: YYYY-MM-DDTHH:mm:ss+03:00
        const dateTimeString = `${session.date}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}:${String(startSeconds || 0).padStart(2, '0')}+03:00`;
        startDateTime = new Date(dateTimeString);
      }
      
      if (session.endTime) {
        const [endHours, endMinutes, endSeconds] = session.endTime.split(':').map(Number);
        const dateTimeString = `${session.date}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:${String(endSeconds || 0).padStart(2, '0')}+03:00`;
        endDateTime = new Date(dateTimeString);
      }
      
      return {
        id: session.id,
        qrCode: session.qrCode,
        sectionId: session.sectionId,
        sectionName: session.section?.course?.code 
          ? `${session.section.course.code} - ${session.section.course.name}`
          : `Section ${session.sectionId}`,
        code: session.section?.course?.code || 'N/A',
        location: {
          lat: parseFloat(session.latitude),
          lng: parseFloat(session.longitude)
        },
        geofenceRadius: parseFloat(session.geofenceRadius),
        date: session.date,
        startTime: startDateTime ? startDateTime.toISOString() : null,
        endTime: endDateTime ? endDateTime.toISOString() : null,
        status: session.status,
        recordCount: session.records?.length || 0,
        records: session.records?.map(record => ({
          id: record.id,
          student: {
            id: record.student?.id,
            fullName: record.student?.fullName,
            email: record.student?.email,
            studentNumber: record.student?.Student?.studentNumber || null
          },
          checkInTime: record.checkInTime,
          checkedInAt: record.checkInTime, // Backward compatibility
          distanceFromCenter: record.distanceFromCenter ? parseFloat(record.distanceFromCenter) : null,
          distance: record.distanceFromCenter ? parseFloat(record.distanceFromCenter) : null, // Backward compatibility
          isFlagged: record.isFlagged || false,
          isWithinGeofence: !record.isFlagged // Backward compatibility
        })) || []
      };
    });
  },

  // Aktif oturumları listele (öğrenciler için)
  getActiveSessions: async (userId) => {
    const now = new Date();
    const sessions = await db.AttendanceSession.findAll({
      where: {
        status: 'active',
        startTime: { [Op.lte]: now },
        endTime: { [Op.gte]: now }
      },
      order: [['startTime', 'DESC']],
      include: [{
        model: db.User,
        as: 'creator',
        attributes: ['id', 'fullName', 'email']
      }]
    });

    return sessions.map(session => ({
      id: session.id,
      code: session.code,
      sectionId: session.sectionId,
      sectionName: session.sectionName,
      location: {
        lat: parseFloat(session.locationLat),
        lng: parseFloat(session.locationLng)
      },
      geofenceRadius: session.geofenceRadius,
      startTime: session.startTime,
      endTime: session.endTime,
      instructor: session.creator ? {
        name: session.creator.fullName,
        email: session.creator.email
      } : null
    }));
  },

  // Oturum detayını getir
  getSessionById: async (sessionId) => {
    const session = await db.AttendanceSession.findByPk(sessionId, {
      include: [
        {
          model: db.User,
          as: 'instructor',
          attributes: ['id', 'fullName', 'email']
        },
        {
          model: db.CourseSection,
          as: 'section',
          attributes: ['id'],
          include: [{
            model: db.Course,
            as: 'course',
            attributes: ['id', 'code', 'name']
          }]
        }
      ]
    });

    if (!session) {
      throw new ValidationError('Yoklama oturumu bulunamadı');
    }

    // Section name'i dinamik olarak oluştur
    let sectionName = 'Bilinmeyen Section';
    if (session.section && session.section.course) {
      const courseCode = session.section.course.code || '';
      const courseName = session.section.course.name || '';
      sectionName = `${courseCode} - ${courseName}`;
    }

    return {
      id: session.id,
      code: session.qrCode || session.code,
      sectionId: session.sectionId,
      sectionName: sectionName,
      location: {
        lat: parseFloat(session.latitude),
        lng: parseFloat(session.longitude)
      },
      geofenceRadius: session.geofenceRadius,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      instructor: session.instructor ? {
        name: session.instructor.fullName,
        email: session.instructor.email
      } : null
    };
  },

  // Öğrenci yoklamaya katılır
  checkIn: async (sessionId, userId, checkInData) => {
    console.log('🔍 checkIn called:', { sessionId, userId, checkInData });
    const { lat, lng, lon } = checkInData;
    const longitude = lng || lon; // Support both lng and lon

    console.log('📍 Coordinates:', { lat, lng, lon, longitude });

    if (!lat || !longitude) {
      console.error('❌ Missing coordinates:', { lat, lng, lon, longitude });
      throw new ValidationError('Location coordinates are required');
    }

    // Oturumu kontrol et
    const session = await db.AttendanceSession.findByPk(sessionId);
    if (!session) {
      throw new ValidationError('Yoklama oturumu bulunamadı');
    }

    // Oturum aktif mi ve zamanında mı kontrol et
    const now = new Date();
    
    // startTime ve endTime TIME tipinde (HH:mm:ss), date ile birleştir
    // Türkiye timezone (GMT+3) için
    const startTimeStr = session.startTime; // TIME format: "HH:mm:ss"
    const endTimeStr = session.endTime; // TIME format: "HH:mm:ss" (nullable)
    
    // Date ve Time'i birleştir - Türkiye timezone'unda (GMT+3)
    const [startHours, startMinutes, startSeconds] = startTimeStr.split(':').map(Number);
    const startTimeString = `${session.date}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}:${String(startSeconds || 0).padStart(2, '0')}+03:00`;
    const startTime = new Date(startTimeString);
    
    let endTime = null;
    if (endTimeStr) {
      const [endHours, endMinutes, endSeconds] = endTimeStr.split(':').map(Number);
      const endTimeString = `${session.date}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:${String(endSeconds || 0).padStart(2, '0')}+03:00`;
      endTime = new Date(endTimeString);
    }
    
    console.log('⏰ Time check:', { 
      now: now.toISOString(), 
      sessionDate: sessionDate.toISOString(),
      startTime: startTime.toISOString(), 
      endTime: endTime ? endTime.toISOString() : 'null',
      status: session.status,
      isBeforeStart: now < startTime,
      isAfterEnd: endTime ? now > endTime : false
    });

    if (session.status !== 'active') {
      console.error('❌ Session not active:', session.status);
      throw new ValidationError(`Oturum aktif değil. Mevcut durum: ${session.status}`);
    }

    if (now < startTime) {
      console.error('❌ Session not started yet');
      const timeUntilStart = Math.round((startTime - now) / 1000 / 60); // minutes
      throw new ValidationError(`Oturum henüz başlamadı. Başlangıç saati: ${startTime.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} (${timeUntilStart} dakika kaldı)`);
    }

    if (endTime && now > endTime) {
      console.error('❌ Session expired');
      const timeSinceEnd = Math.round((now - endTime) / 1000 / 60); // minutes
      throw new ValidationError(`Oturum süresi doldu. Bitiş saati: ${endTime.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} (${timeSinceEnd} dakika önce)`);
    }

    // Daha önce katılmış mı kontrol et
    const existingRecord = await db.AttendanceRecord.findOne({
      where: {
        sessionId: session.id,
        studentId: userId
      }
    });

    if (existingRecord) {
      throw new ValidationError('Bu oturuma zaten katıldınız');
    }

    // Mesafe hesapla
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(longitude);
    const parsedSessionLat = parseFloat(session.latitude);
    const parsedSessionLng = parseFloat(session.longitude);

    console.log('📐 Parsed coordinates:', { 
      parsedLat, 
      parsedLng, 
      parsedSessionLat, 
      parsedSessionLng,
      geofenceRadius: session.geofenceRadius
    });

    // Koordinatların geçerli olduğunu kontrol et
    if (isNaN(parsedLat) || isNaN(parsedLng) || isNaN(parsedSessionLat) || isNaN(parsedSessionLng)) {
      console.error('❌ Invalid coordinates:', { parsedLat, parsedLng, parsedSessionLat, parsedSessionLng });
      throw new ValidationError('Geçersiz konum koordinatları');
    }

    const distance = calculateDistance(
      parsedLat,
      parsedLng,
      parsedSessionLat,
      parsedSessionLng
    );

    console.log('📏 Calculated distance:', distance, 'm');

    // Mesafe değerinin geçerli olduğunu kontrol et
    if (isNaN(distance) || distance < 0) {
      console.error('❌ Invalid distance:', distance);
      throw new ValidationError(`Geçersiz mesafe hesaplaması: ${distance}`);
    }

    const isWithinGeofence = distance <= session.geofenceRadius;
    console.log('✅ Geofence check:', { distance, geofenceRadius: session.geofenceRadius, isWithinGeofence });

    // Geofence kontrolü - dışındaysa hata ver
    if (!isWithinGeofence) {
      console.error('❌ Outside geofence:', { distance, geofenceRadius: session.geofenceRadius });
      throw new ValidationError(`Geofence bölgesinin dışındasınız. Mesafe: ${Math.round(distance)}m, Gerekli: ${session.geofenceRadius}m`);
    }

    // Kayıt oluştur
    const record = await db.AttendanceRecord.create({
      sessionId: session.id,
      studentId: userId,
      latitude: parsedLat,
      longitude: parsedLng,
      distanceFromCenter: distance,
      isFlagged: !isWithinGeofence,
      flagReason: !isWithinGeofence ? `Geofence dışında. Mesafe: ${Math.round(distance)}m` : null,
      checkInTime: now
    });

    return {
      id: record.id,
      sessionId: record.sessionId,
      distance: parseFloat(record.distanceFromCenter),
      isWithinGeofence: !record.isFlagged,
      checkedInAt: record.checkInTime
    };
  },

  // Öğrencinin yoklama geçmişi
  getMyAttendance: async (userId) => {
    const records = await db.AttendanceRecord.findAll({
      where: { studentId: userId },
      include: [{
        model: db.AttendanceSession,
        as: 'session',
        include: [
          {
            model: db.User,
            as: 'instructor',
            attributes: ['id', 'fullName', 'email']
          },
          {
            model: db.CourseSection,
            as: 'section',
            attributes: ['id', 'sectionNumber'],
            include: [{
              model: db.Course,
              as: 'course',
              attributes: ['id', 'code', 'name']
            }]
          }
        ]
      }],
      order: [['checkInTime', 'DESC']]
    });

    return records.map(record => {
      // Section name'i oluştur
      let sectionName = 'Bilinmeyen Ders';
      if (record.session?.section?.course) {
        const courseCode = record.session.section.course.code || '';
        const courseName = record.session.section.course.name || '';
        sectionName = `${courseCode} - ${courseName}`;
      }

      // Date ve Time'i birleştir - Türkiye timezone (GMT+3) için
      let startDateTime = null;
      let endDateTime = null;
      
      if (record.session?.date && record.session?.startTime) {
        const [startHours, startMinutes, startSeconds] = record.session.startTime.split(':').map(Number);
        const dateTimeString = `${record.session.date}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}:${String(startSeconds || 0).padStart(2, '0')}+03:00`;
        startDateTime = new Date(dateTimeString);
      }
      
      if (record.session?.date && record.session?.endTime) {
        const [endHours, endMinutes, endSeconds] = record.session.endTime.split(':').map(Number);
        const dateTimeString = `${record.session.date}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:${String(endSeconds || 0).padStart(2, '0')}+03:00`;
        endDateTime = new Date(dateTimeString);
      }

      return {
        id: record.id,
        session: {
          id: record.session.id,
          code: record.session.qrCode || record.session.code,
          sectionId: record.session.sectionId,
          sectionName: sectionName,
          startTime: startDateTime ? startDateTime.toISOString() : null,
          endTime: endDateTime ? endDateTime.toISOString() : null,
          geofenceRadius: record.session.geofenceRadius,
          instructor: record.session.instructor ? {
            name: record.session.instructor.fullName,
            email: record.session.instructor.email
          } : null
        },
        checkInTime: record.checkInTime,
        checkedInAt: record.checkInTime, // Backward compatibility
        distance: record.distanceFromCenter ? parseFloat(record.distanceFromCenter) : null,
        distanceFromCenter: record.distanceFromCenter ? parseFloat(record.distanceFromCenter) : null,
        isWithinGeofence: !record.isFlagged,
        isFlagged: record.isFlagged || false
      };
    });
  },

  // Öğrencinin ders bazında yoklama durumu
  getMyAttendanceByCourse: async (userId) => {
    // Öğrencinin aldığı tüm dersleri getir
    const enrollments = await db.Enrollment.findAll({
      where: {
        studentId: userId,
        status: 'enrolled' // Sadece aktif kayıtlı dersler
      },
      include: [{
        model: db.CourseSection,
        as: 'section',
        attributes: ['id', 'sectionNumber'],
        include: [{
          model: db.Course,
          as: 'course',
          attributes: ['id', 'code', 'name']
        }]
      }]
    });

    // Her ders için yoklama bilgilerini hesapla
    const coursesWithAttendance = await Promise.all(
      enrollments.map(async (enrollment) => {
        const sectionId = enrollment.sectionId;
        
        // Bu section için tüm oturumları getir
        const allSessions = await db.AttendanceSession.findAll({
          where: { sectionId },
          order: [['date', 'DESC'], ['startTime', 'DESC']],
          attributes: ['id', 'date', 'startTime', 'endTime', 'status', 'qrCode']
        });

        // Öğrencinin bu section'daki katıldığı oturumları getir
        const attendanceRecords = await db.AttendanceRecord.findAll({
          where: {
            studentId: userId,
            sessionId: { [db.Sequelize.Op.in]: allSessions.map(s => s.id) }
          },
          attributes: ['id', 'sessionId', 'checkInTime']
        });

        // Katıldığı oturum ID'lerini set olarak tut
        const attendedSessionIds = new Set(attendanceRecords.map(r => r.sessionId));
        
        // Oturum detaylarını hazırla
        const now = new Date();
        const sessions = allSessions.map(session => {
          const record = attendanceRecords.find(r => r.sessionId === session.id);
          
          // Date ve Time'i birleştir - Türkiye timezone (GMT+3) için
          let startDateTime = null;
          let endDateTime = null;
          
          if (session.date && session.startTime) {
            const [startHours, startMinutes, startSeconds] = session.startTime.split(':').map(Number);
            const dateTimeString = `${session.date}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}:${String(startSeconds || 0).padStart(2, '0')}+03:00`;
            startDateTime = new Date(dateTimeString);
          }
          
          if (session.date && session.endTime) {
            const [endHours, endMinutes, endSeconds] = session.endTime.split(':').map(Number);
            const dateTimeString = `${session.date}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:${String(endSeconds || 0).padStart(2, '0')}+03:00`;
            endDateTime = new Date(dateTimeString);
          }

          // Oturum durumunu kontrol et (tarih/saat bazlı)
          let actualStatus = session.status;
          if (session.status === 'active') {
            // Eğer oturum bitiş zamanı geçmişse, kapalı olarak işaretle
            if (endDateTime && now > endDateTime) {
              actualStatus = 'closed';
            }
            // Eğer oturum başlangıç zamanı henüz gelmemişse, bekliyor olarak işaretle
            else if (startDateTime && now < startDateTime) {
              actualStatus = 'pending';
            }
          }

          return {
            id: session.id,
            date: session.date,
            startTime: startDateTime ? startDateTime.toISOString() : null,
            endTime: endDateTime ? endDateTime.toISOString() : null,
            status: actualStatus,
            code: session.qrCode,
            attended: attendedSessionIds.has(session.id),
            checkInTime: record ? record.checkInTime : null
          };
        });

        const totalSessions = allSessions.length;
        const attendedCount = attendanceRecords.length;
        const attendancePercentage = totalSessions > 0 
          ? Math.round((attendedCount / totalSessions) * 100) 
          : 0;

        return {
          sectionId: sectionId,
          course: {
            code: enrollment.section.course.code,
            name: enrollment.section.course.name
          },
          sectionNumber: enrollment.section.sectionNumber,
          totalSessions,
          attendedCount,
          attendancePercentage,
          sessions
        };
      })
    );

    return coursesWithAttendance;
  },

  // Section için yoklama raporu (hoca için)
  getSessionReport: async (sessionId, userId) => {
    const session = await db.AttendanceSession.findByPk(sessionId, {
      include: [{
        model: db.AttendanceRecord,
        as: 'records',
        include: [{
          model: db.User,
          as: 'student',
          attributes: ['id', 'fullName', 'email']
        }]
      }]
    });

    if (!session) {
      throw new ValidationError('Session not found');
    }

    if (session.instructorId !== userId) {
      throw new ForbiddenError('You can only view reports for your own sessions');
    }

    return {
      session: {
        id: session.id,
        code: session.code,
        sectionId: session.sectionId,
        sectionName: session.sectionName,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status
      },
      records: session.records.map(record => ({
        id: record.id,
        student: {
          id: record.student.id,
          name: record.student.fullName,
          email: record.student.email
        },
        distance: parseFloat(record.distance),
        isWithinGeofence: record.isWithinGeofence,
        checkedInAt: record.checkedInAt
      })),
      totalCheckedIn: session.records.length,
      withinGeofence: session.records.filter(r => r.isWithinGeofence).length,
      outsideGeofence: session.records.filter(r => !r.isWithinGeofence).length
    };
  }
};

module.exports = attendanceService;

