const db = require('../models');
const { ValidationError, ForbiddenError } = require('../utils/errors');
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
    const { sectionId, sectionName, locationLat, locationLng, geofenceRadius, duration } = sessionData;

    if (!sectionId || !sectionName || !locationLat || !locationLng) {
      throw new ValidationError('Section ID, section name, and location are required');
    }

    const code = generateSessionCode();
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (duration || 30) * 60000); // Default 30 dakika

    const session = await db.AttendanceSession.create({
      code,
      sectionId,
      sectionName,
      createdBy: userId,
      locationLat: parseFloat(locationLat),
      locationLng: parseFloat(locationLng),
      geofenceRadius: geofenceRadius || 250,
      startTime,
      endTime,
      status: 'active'
    });

    return {
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
      status: session.status
    };
  },

  // Oturumu kapat
  closeSession: async (sessionId, userId) => {
    const session = await db.AttendanceSession.findByPk(sessionId);
    
    if (!session) {
      throw new ValidationError('Session not found');
    }

    if (session.createdBy !== userId) {
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
      where: { createdBy: userId },
      order: [['startTime', 'DESC']],
      include: [{
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
        checkedInAt: record.checkedInAt,
        distance: parseFloat(record.distance),
        isWithinGeofence: record.isWithinGeofence
      })) || []
    }));
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
      include: [{
        model: db.User,
        as: 'creator',
        attributes: ['id', 'fullName', 'email']
      }]
    });

    if (!session) {
      throw new ValidationError('Session not found');
    }

    return {
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
      status: session.status,
      instructor: session.creator ? {
        name: session.creator.fullName,
        email: session.creator.email
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
      throw new ValidationError('Session not found');
    }

    // Oturum aktif mi ve zamanında mı kontrol et
    const now = new Date();
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    
    console.log('⏰ Time check:', { 
      now: now.toISOString(), 
      startTime: startTime.toISOString(), 
      endTime: endTime.toISOString(),
      status: session.status,
      isBeforeStart: now < startTime,
      isAfterEnd: now > endTime
    });

    if (session.status !== 'active') {
      console.error('❌ Session not active:', session.status);
      throw new ValidationError(`Session is not active. Current status: ${session.status}`);
    }

    if (now < startTime) {
      console.error('❌ Session not started yet');
      const timeUntilStart = Math.round((startTime - now) / 1000 / 60); // minutes
      throw new ValidationError(`Session has not started yet. Start time: ${startTime.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} (${timeUntilStart} minutes remaining)`);
    }

    if (now > endTime) {
      console.error('❌ Session expired');
      const timeSinceEnd = Math.round((now - endTime) / 1000 / 60); // minutes
      throw new ValidationError(`Session has expired. End time: ${endTime.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} (${timeSinceEnd} minutes ago)`);
    }

    // Daha önce katılmış mı kontrol et
    const existingRecord = await db.AttendanceRecord.findOne({
      where: {
        sessionId: session.id,
        studentId: userId
      }
    });

    if (existingRecord) {
      throw new ValidationError('You have already checked in to this session');
    }

    // Mesafe hesapla
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(longitude);
    const parsedSessionLat = parseFloat(session.locationLat);
    const parsedSessionLng = parseFloat(session.locationLng);

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
      throw new ValidationError('Invalid location coordinates');
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
      throw new ValidationError(`Invalid distance calculation: ${distance}`);
    }

    const isWithinGeofence = distance <= session.geofenceRadius;
    console.log('✅ Geofence check:', { distance, geofenceRadius: session.geofenceRadius, isWithinGeofence });

    // Geofence kontrolü - dışındaysa hata ver
    if (!isWithinGeofence) {
      console.error('❌ Outside geofence:', { distance, geofenceRadius: session.geofenceRadius });
      throw new ValidationError(`You are outside the geofence area. Distance: ${Math.round(distance)}m, Required: ${session.geofenceRadius}m`);
    }

    // Kayıt oluştur
    const record = await db.AttendanceRecord.create({
      sessionId: session.id,
      studentId: userId,
      checkInLat: parsedLat,
      checkInLng: parsedLng,
      distance: distance,
      isWithinGeofence: isWithinGeofence,
      checkedInAt: now
    });

    return {
      id: record.id,
      sessionId: record.sessionId,
      distance: parseFloat(record.distance),
      isWithinGeofence: record.isWithinGeofence,
      checkedInAt: record.checkedInAt
    };
  },

  // Öğrencinin yoklama geçmişi
  getMyAttendance: async (userId) => {
    const records = await db.AttendanceRecord.findAll({
      where: { studentId: userId },
      include: [{
        model: db.AttendanceSession,
        as: 'session',
        include: [{
          model: db.User,
          as: 'creator',
          attributes: ['id', 'fullName', 'email']
        }]
      }],
      order: [['checkedInAt', 'DESC']]
    });

    return records.map(record => ({
      id: record.id,
      session: {
        id: record.session.id,
        code: record.session.code,
        sectionId: record.session.sectionId,
        sectionName: record.session.sectionName,
        startTime: record.session.startTime,
        endTime: record.session.endTime,
        geofenceRadius: record.session.geofenceRadius,
        instructor: record.session.creator ? {
          name: record.session.creator.fullName,
          email: record.session.creator.email
        } : null
      },
      distance: parseFloat(record.distance),
      isWithinGeofence: record.isWithinGeofence,
      checkedInAt: record.checkedInAt
    }));
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

    if (session.createdBy !== userId) {
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

