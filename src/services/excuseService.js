const db = require('../models');
const { AppError, ValidationError, ForbiddenError } = require('../utils/errors');
const { Op } = require('sequelize');

const excuseService = {
  // Öğrenci mazeret talebi oluşturur
  submitExcuseRequest: async (studentId, requestData) => {
    const { sessionId, reason, documentUrl } = requestData;

    if (!sessionId || !reason) {
      throw new ValidationError('Session ID and reason are required');
    }

    // Session'ı kontrol et
    const session = await db.AttendanceSession.findByPk(sessionId, {
      include: [
        {
          model: db.CourseSection,
          as: 'section',
          include: [
            {
              model: db.Course,
              as: 'course',
              attributes: ['id', 'code', 'name']
            }
          ]
        }
      ]
    });

    if (!session) {
      throw new ValidationError('Yoklama oturumu bulunamadı');
    }

    // Öğrencinin bu section'a kayıtlı olduğunu kontrol et
    const enrollment = await db.Enrollment.findOne({
      where: {
        studentId,
        sectionId: session.sectionId,
        status: { [Op.in]: ['enrolled', 'completed', 'failed'] }
      }
    });

    if (!enrollment) {
      throw new ValidationError('Bu derse kayıtlı değilsiniz');
    }

    // Daha önce bu session için mazeret talebi var mı kontrol et
    const existingRequest = await db.ExcuseRequest.findOne({
      where: {
        studentId,
        sessionId
      }
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new ValidationError('Bu oturum için zaten bekleyen bir mazeret talebiniz var');
      }
      if (existingRequest.status === 'approved') {
        throw new ValidationError('Bu oturum için mazeret talebiniz zaten onaylanmış');
      }
    }

    // Öğrencinin bu session'a katılmış olup olmadığını kontrol et
    const attendanceRecord = await db.AttendanceRecord.findOne({
      where: {
        studentId,
        sessionId
      }
    });

    if (attendanceRecord) {
      throw new ValidationError('Bu oturuma zaten katıldınız');
    }

    // Mazeret talebi oluştur
    const excuseRequest = await db.ExcuseRequest.create({
      studentId,
      sessionId,
      reason,
      documentUrl: documentUrl || null,
      status: 'pending'
    });

    // İlişkili verileri getir
    const requestWithDetails = await db.ExcuseRequest.findByPk(excuseRequest.id, {
      include: [
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'fullName', 'email']
        },
        {
          model: db.AttendanceSession,
          as: 'session',
          include: [
            {
              model: db.CourseSection,
              as: 'section',
              include: [
                {
                  model: db.Course,
                  as: 'course',
                  attributes: ['id', 'code', 'name']
                }
              ]
            }
          ]
        }
      ]
    });

    return {
      id: requestWithDetails.id,
      student: {
        id: requestWithDetails.student.id,
        fullName: requestWithDetails.student.fullName,
        email: requestWithDetails.student.email
      },
      session: {
        id: requestWithDetails.session.id,
        date: requestWithDetails.session.date,
        sectionName: requestWithDetails.session.section?.course
          ? `${requestWithDetails.session.section.course.code} - ${requestWithDetails.session.section.course.name}`
          : 'Bilinmeyen Ders'
      },
      reason: requestWithDetails.reason,
      documentUrl: requestWithDetails.documentUrl,
      status: requestWithDetails.status,
      createdAt: requestWithDetails.createdAt
    };
  },

  // Öğrencinin kendi mazeret taleplerini listele
  getMyExcuseRequests: async (studentId) => {
    const requests = await db.ExcuseRequest.findAll({
      where: { studentId },
      include: [
        {
          model: db.AttendanceSession,
          as: 'session',
          include: [
            {
              model: db.CourseSection,
              as: 'section',
              include: [
                {
                  model: db.Course,
                  as: 'course',
                  attributes: ['id', 'code', 'name']
                }
              ]
            }
          ]
        },
        {
          model: db.User,
          as: 'reviewer',
          attributes: ['id', 'fullName'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return requests.map(request => ({
      id: request.id,
      session: {
        id: request.session.id,
        date: request.session.date,
        sectionName: request.session.section?.course
          ? `${request.session.section.course.code} - ${request.session.section.course.name}`
          : 'Bilinmeyen Ders'
      },
      reason: request.reason,
      documentUrl: request.documentUrl,
      status: request.status,
      reviewedBy: request.reviewer ? {
        id: request.reviewer.id,
        fullName: request.reviewer.fullName
      } : null,
      reviewedAt: request.reviewedAt,
      notes: request.notes,
      createdAt: request.createdAt
    }));
  },

  // Öğretmen için mazeret taleplerini listele (kendi dersleri için)
  getExcuseRequestsForInstructor: async (instructorId) => {
    // Öğretmenin section'larını bul
    const sections = await db.CourseSection.findAll({
      where: { instructorId },
      attributes: ['id']
    });

    const sectionIds = sections.map(s => s.id);

    if (sectionIds.length === 0) {
      return [];
    }

    // Bu section'lar için mazeret taleplerini getir
    const requests = await db.ExcuseRequest.findAll({
      where: {
        status: 'pending'
      },
      include: [
        {
          model: db.AttendanceSession,
          as: 'session',
          where: {
            sectionId: { [Op.in]: sectionIds }
          },
          include: [
            {
              model: db.CourseSection,
              as: 'section',
              include: [
                {
                  model: db.Course,
                  as: 'course',
                  attributes: ['id', 'code', 'name']
                }
              ]
            }
          ]
        },
        {
          model: db.User,
          as: 'student',
          attributes: ['id', 'fullName', 'email'],
          include: [
            {
              model: db.Student,
              as: 'Student',
              attributes: ['studentNumber'],
              required: false
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return requests.map(request => ({
      id: request.id,
      student: {
        id: request.student.id,
        fullName: request.student.fullName,
        email: request.student.email,
        studentNumber: request.student.Student?.studentNumber || null
      },
      session: {
        id: request.session.id,
        date: request.session.date,
        startTime: request.session.startTime,
        endTime: request.session.endTime,
        sectionName: request.session.section?.course
          ? `${request.session.section.course.code} - ${request.session.section.course.name}`
          : 'Bilinmeyen Ders'
      },
      reason: request.reason,
      documentUrl: request.documentUrl,
      status: request.status,
      createdAt: request.createdAt
    }));
  },

  // Öğretmen mazeret talebini onaylar
  approveExcuseRequest: async (requestId, instructorId, notes) => {
    const excuseRequest = await db.ExcuseRequest.findByPk(requestId, {
      include: [
        {
          model: db.AttendanceSession,
          as: 'session',
          include: [
            {
              model: db.CourseSection,
              as: 'section',
              attributes: ['id', 'instructorId']
            }
          ]
        }
      ]
    });

    if (!excuseRequest) {
      throw new ValidationError('Mazeret talebi bulunamadı');
    }

    // Öğretmenin bu section'ın instructor'ı olduğunu kontrol et
    if (excuseRequest.session.section.instructorId !== instructorId) {
      throw new ForbiddenError('Bu mazeret talebini onaylama yetkiniz yok');
    }

    if (excuseRequest.status !== 'pending') {
      throw new ValidationError('Sadece bekleyen mazeret talepleri onaylanabilir');
    }

    // Transaction kullan
    const transaction = await db.sequelize.transaction();

    try {
      // Mazeret talebini onayla
      await excuseRequest.update({
        status: 'approved',
        reviewedBy: instructorId,
        reviewedAt: new Date(),
        notes: notes || null
      }, { transaction });

      // Öğrencinin bu session için yoklama kaydı var mı kontrol et
      const existingRecord = await db.AttendanceRecord.findOne({
        where: {
          studentId: excuseRequest.studentId,
          sessionId: excuseRequest.sessionId
        },
        transaction
      });

      if (!existingRecord) {
        // Yoklama kaydı oluştur (mazeretli olarak)
        // Session tarihini ve saatini birleştir
        const sessionDate = excuseRequest.session.date;
        const sessionTime = excuseRequest.session.startTime || '00:00:00';
        const [hours, minutes, seconds] = sessionTime.split(':').map(Number);
        const checkInDateTime = new Date(`${sessionDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds || 0).padStart(2, '0')}`);
        
        await db.AttendanceRecord.create({
          sessionId: excuseRequest.sessionId,
          studentId: excuseRequest.studentId,
          checkInTime: checkInDateTime,
          isFlagged: false,
          flagReason: 'Mazeretli - Sonradan onaylandı'
        }, { transaction });
      } else {
        // Eğer kayıt varsa, mazeretli olarak işaretle
        await existingRecord.update({
          isFlagged: false,
          flagReason: 'Mazeretli - Sonradan onaylandı'
        }, { transaction });
      }

      await transaction.commit();

      // Güncellenmiş talebi getir
      const updatedRequest = await db.ExcuseRequest.findByPk(requestId, {
        include: [
          {
            model: db.User,
            as: 'student',
            attributes: ['id', 'fullName', 'email']
          },
          {
            model: db.AttendanceSession,
            as: 'session',
            include: [
              {
                model: db.CourseSection,
                as: 'section',
                include: [
                  {
                    model: db.Course,
                    as: 'course',
                    attributes: ['id', 'code', 'name']
                  }
                ]
              }
            ]
          }
        ]
      });

      return {
        id: updatedRequest.id,
        status: updatedRequest.status,
        message: 'Mazeret talebi onaylandı ve yoklama kaydı güncellendi'
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  // Öğretmen mazeret talebini reddeder
  rejectExcuseRequest: async (requestId, instructorId, notes) => {
    const excuseRequest = await db.ExcuseRequest.findByPk(requestId, {
      include: [
        {
          model: db.AttendanceSession,
          as: 'session',
          include: [
            {
              model: db.CourseSection,
              as: 'section',
              attributes: ['id', 'instructorId']
            }
          ]
        }
      ]
    });

    if (!excuseRequest) {
      throw new ValidationError('Mazeret talebi bulunamadı');
    }

    // Öğretmenin bu section'ın instructor'ı olduğunu kontrol et
    if (excuseRequest.session.section.instructorId !== instructorId) {
      throw new ForbiddenError('Bu mazeret talebini reddetme yetkiniz yok');
    }

    if (excuseRequest.status !== 'pending') {
      throw new ValidationError('Sadece bekleyen mazeret talepleri reddedilebilir');
    }

    // Mazeret talebini reddet
    await excuseRequest.update({
      status: 'rejected',
      reviewedBy: instructorId,
      reviewedAt: new Date(),
      notes: notes || null
    });

    return {
      id: excuseRequest.id,
      status: excuseRequest.status,
      message: 'Mazeret talebi reddedildi'
    };
  },

  // Öğrenci için belirli bir tarih ve section için yoklama oturumlarını getir
  getSessionsForExcuseRequest: async (studentId, sectionId, date) => {
    // Öğrencinin bu section'a kayıtlı olduğunu kontrol et
    const enrollment = await db.Enrollment.findOne({
      where: {
        studentId,
        sectionId,
        status: { [Op.in]: ['enrolled', 'completed', 'failed'] }
      }
    });

    if (!enrollment) {
      throw new ValidationError('Bu derse kayıtlı değilsiniz');
    }

    // Bu section ve tarih için yoklama oturumlarını getir
    const sessions = await db.AttendanceSession.findAll({
      where: {
        sectionId,
        date: date
      },
      include: [
        {
          model: db.CourseSection,
          as: 'section',
          include: [
            {
              model: db.Course,
              as: 'course',
              attributes: ['id', 'code', 'name']
            }
          ]
        }
      ],
      order: [['startTime', 'ASC']]
    });

    return sessions.map(session => ({
      id: session.id,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      sectionName: session.section?.course
        ? `${session.section.course.code} - ${session.section.course.name}`
        : 'Bilinmeyen Ders'
    }));
  }
};

module.exports = excuseService;
