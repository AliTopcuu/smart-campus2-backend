const db = require('../models');
const { Enrollment, CourseSection, Course, User, AttendanceRecord, AttendanceSession, CoursePrerequisite } = db;
const { Op } = db.Sequelize;
const { fn, col, literal } = db.sequelize;
const { AppError } = require('../utils/errors');

// Recursive prerequisite checking
const checkPrerequisites = async (courseId, studentId) => {
  try {
    const prerequisites = await CoursePrerequisite.findAll({
      where: { courseId },
      include: [
        {
          model: Course,
          as: 'prerequisite',
          attributes: ['id', 'code', 'name']
        }
      ]
    });

    if (prerequisites.length === 0) {
      return; // No prerequisites
    }

    for (const prereq of prerequisites) {
      // Check if student has completed this prerequisite
      const hasCompleted = await Enrollment.findOne({
        where: {
          studentId,
          status: 'completed'
        },
        include: [
          {
            model: CourseSection,
            as: 'section',
            where: {
              courseId: prereq.prerequisiteCourseId
            },
            attributes: ['courseId']
          }
        ]
      });

      if (!hasCompleted) {
        const prereqCourse = prereq.prerequisite;
        const courseName = prereqCourse ? `${prereqCourse.code} - ${prereqCourse.name}` : 'Unknown';
        throw new Error(`Prerequisite not met: ${courseName}`);
      }

      // Recursive check for prerequisites of prerequisites
      await checkPrerequisites(prereq.prerequisiteCourseId, studentId);
    }
  } catch (error) {
    console.error('Error in checkPrerequisites:', error);
    throw error;
  }
};

// Schedule conflict detection
const hasScheduleConflict = async (studentId, newSectionId) => {
  const newSection = await CourseSection.findByPk(newSectionId, {
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id']
      }
    ]
  });

  if (!newSection || !newSection.scheduleJson) {
    return false;
  }

  // Get all enrolled sections for the student
  const enrolledSections = await Enrollment.findAll({
    where: {
      studentId,
      status: 'enrolled'
    },
    include: [
      {
        model: CourseSection,
        as: 'section',
        where: {
          semester: newSection.semester,
          year: newSection.year
        },
        attributes: ['id', 'scheduleJson']
      }
    ]
  });

  const newSchedule = newSection.scheduleJson;
  if (!newSchedule || !newSchedule.days || !newSchedule.startTime || !newSchedule.endTime) {
    return false;
  }

  for (const enrollment of enrolledSections) {
    const existingSchedule = enrollment.section.scheduleJson;
    if (!existingSchedule || !existingSchedule.days || !existingSchedule.startTime || !existingSchedule.endTime) {
      continue;
    }

    // Check if days overlap
    const dayOverlap = newSchedule.days.some(day => existingSchedule.days.includes(day));
    if (!dayOverlap) {
      continue;
    }

    // Check if time overlaps
    const newStart = timeToMinutes(newSchedule.startTime);
    const newEnd = timeToMinutes(newSchedule.endTime);
    const existingStart = timeToMinutes(existingSchedule.startTime);
    const existingEnd = timeToMinutes(existingSchedule.endTime);

    if ((newStart < existingEnd && newEnd > existingStart)) {
      return true; // Conflict found
    }
  }

  return false;
};

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const enroll = async (studentId, sectionId) => {
  try {
    // Check if any enrollment exists for this student-section combination
    // Unique constraint allows only one enrollment per student-section pair
    const existingEnrollment = await Enrollment.findOne({
      where: { 
        studentId, 
        sectionId
      }
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'enrolled') {
        throw new Error('Already enrolled in this section');
      }
      if (existingEnrollment.status === 'pending') {
        throw new Error('Enrollment request is already pending approval');
      }
      // If status is 'rejected', 'dropped', 'completed', or 'failed', we can update it to 'pending'
      // This allows students to re-apply or re-enroll
      if (['rejected', 'dropped', 'completed', 'failed'].includes(existingEnrollment.status)) {
        // Get section info for validation checks
        const section = await CourseSection.findByPk(sectionId, {
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'code', 'name']
            }
          ]
        });
        
        if (!section) {
          throw new Error('Section not found');
        }
        
        // Check prerequisites
        await checkPrerequisites(section.courseId, studentId);
        
        // Check capacity
        if (section.enrolledCount >= section.capacity) {
          throw new Error('Section is full');
        }
        
        // Check schedule conflict (only with enrolled courses)
        const enrolledSections = await Enrollment.findAll({
          where: {
            studentId,
            status: 'enrolled'
          },
          include: [
            {
              model: CourseSection,
              as: 'section',
              where: {
                semester: section.semester,
                year: section.year
              },
              include: [
                {
                  model: Course,
                  as: 'course',
                  attributes: ['id', 'code', 'name']
                }
              ],
              attributes: ['id', 'scheduleJson', 'sectionNumber']
            }
          ]
        });

        // Parse scheduleJson if it's a string
        let scheduleJson = section.scheduleJson;
        if (typeof scheduleJson === 'string') {
          try {
            scheduleJson = JSON.parse(scheduleJson);
          } catch (e) {
            scheduleJson = null;
          }
        }

        // Check for schedule conflicts (same logic as above)
        if (scheduleJson) {
          // New format: scheduleItems array
          if (Array.isArray(scheduleJson.scheduleItems) && scheduleJson.scheduleItems.length > 0) {
            for (const newItem of scheduleJson.scheduleItems) {
              for (const enrolledEnrollment of enrolledSections) {
                let existingSchedule = enrolledEnrollment.section.scheduleJson;
                if (typeof existingSchedule === 'string') {
                  try {
                    existingSchedule = JSON.parse(existingSchedule);
                  } catch (e) {
                    continue;
                  }
                }
                
                if (!existingSchedule) continue;
                
                // Check new format
                if (Array.isArray(existingSchedule.scheduleItems) && existingSchedule.scheduleItems.length > 0) {
                  for (const existingItem of existingSchedule.scheduleItems) {
                    if (newItem.day === existingItem.day) {
                      const newStart = timeToMinutes(newItem.startTime);
                      const newEnd = timeToMinutes(newItem.endTime);
                      const existingStart = timeToMinutes(existingItem.startTime);
                      const existingEnd = timeToMinutes(existingItem.endTime);
                      
                      if ((newStart < existingEnd && newEnd > existingStart)) {
                        const courseCode = enrolledEnrollment.section.course?.code || 'Bilinmeyen';
                        const courseName = enrolledEnrollment.section.course?.name || 'Ders';
                        throw new Error(`Bu dersi alamazsın. ${courseCode} - ${courseName} dersi ile aynı gün ve saatte çakışıyor.`);
                      }
                    }
                  }
                }
                // Check old format
                else if (existingSchedule.days && Array.isArray(existingSchedule.days) && existingSchedule.startTime) {
                  if (existingSchedule.days.includes(newItem.day)) {
                    const newStart = timeToMinutes(newItem.startTime);
                    const newEnd = timeToMinutes(newItem.endTime);
                    const existingStart = timeToMinutes(existingSchedule.startTime);
                    const existingEnd = timeToMinutes(existingSchedule.endTime);
                    
                    if ((newStart < existingEnd && newEnd > existingStart)) {
                      const courseCode = enrolledEnrollment.section.course?.code || 'Bilinmeyen';
                      const courseName = enrolledEnrollment.section.course?.name || 'Ders';
                      throw new Error(`Bu dersi alamazsın. ${courseCode} - ${courseName} dersi ile aynı gün ve saatte çakışıyor.`);
                    }
                  }
                }
              }
            }
          }
          // Old format: days array + startTime/endTime
          else if (scheduleJson.days && Array.isArray(scheduleJson.days) && scheduleJson.startTime) {
            for (const enrolledEnrollment of enrolledSections) {
              let existingSchedule = enrolledEnrollment.section.scheduleJson;
              if (typeof existingSchedule === 'string') {
                try {
                  existingSchedule = JSON.parse(existingSchedule);
                } catch (e) {
                  continue;
                }
              }
              
              if (!existingSchedule) continue;
              
              // Check new format
              if (Array.isArray(existingSchedule.scheduleItems) && existingSchedule.scheduleItems.length > 0) {
                for (const existingItem of existingSchedule.scheduleItems) {
                  if (scheduleJson.days.includes(existingItem.day)) {
                    const newStart = timeToMinutes(scheduleJson.startTime);
                    const newEnd = timeToMinutes(scheduleJson.endTime);
                    const existingStart = timeToMinutes(existingItem.startTime);
                    const existingEnd = timeToMinutes(existingItem.endTime);
                    
                    if ((newStart < existingEnd && newEnd > existingStart)) {
                      const courseCode = enrolledEnrollment.section.course?.code || 'Bilinmeyen';
                      const courseName = enrolledEnrollment.section.course?.name || 'Ders';
                      throw new Error(`Bu dersi alamazsın. ${courseCode} - ${courseName} dersi ile aynı gün ve saatte çakışıyor.`);
                    }
                  }
                }
              }
              // Check old format
              else if (existingSchedule.days && Array.isArray(existingSchedule.days) && existingSchedule.startTime) {
                const dayOverlap = scheduleJson.days.some(day => existingSchedule.days.includes(day));
                if (dayOverlap) {
                  const newStart = timeToMinutes(scheduleJson.startTime);
                  const newEnd = timeToMinutes(scheduleJson.endTime);
                  const existingStart = timeToMinutes(existingSchedule.startTime);
                  const existingEnd = timeToMinutes(existingSchedule.endTime);

                  if ((newStart < existingEnd && newEnd > existingStart)) {
                    const courseCode = enrolledEnrollment.section.course?.code || 'Bilinmeyen';
                    const courseName = enrolledEnrollment.section.course?.name || 'Ders';
                    throw new Error(`Bu dersi alamazsın. ${courseCode} - ${courseName} dersi ile aynı gün ve saatte çakışıyor.`);
                  }
                }
              }
            }
          }
        }
        
        // Update existing enrollment to pending
        await existingEnrollment.update({
          status: 'pending',
          enrollmentDate: new Date()
        });
        
        return {
          message: 'Enrollment request resubmitted. Waiting for instructor approval.',
          enrollment: existingEnrollment
        };
      }
      
      // Should not reach here, but just in case
      throw new Error('Cannot enroll in this section with your current enrollment status');
    }

    // Get section and course info
    const section = await CourseSection.findByPk(sectionId, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'code', 'name']
        }
      ]
    });

    if (!section) {
      throw new Error('Section not found');
    }

    // Check prerequisites
    try {
      await checkPrerequisites(section.courseId, studentId);
    } catch (prereqError) {
      // Re-throw prerequisite errors as-is
      throw prereqError;
    }

    // Check schedule conflict with enrolled courses only
    const enrolledSections = await Enrollment.findAll({
      where: {
        studentId,
        status: 'enrolled'
      },
      include: [
        {
          model: CourseSection,
          as: 'section',
          where: {
            semester: section.semester,
            year: section.year
          },
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'code', 'name']
            }
          ],
          attributes: ['id', 'scheduleJson', 'sectionNumber']
        }
      ]
    });

    // Parse scheduleJson if it's a string
    let scheduleJson = section.scheduleJson;
    if (typeof scheduleJson === 'string') {
      try {
        scheduleJson = JSON.parse(scheduleJson);
      } catch (e) {
        // If parsing fails, assume no schedule conflict check needed
        scheduleJson = null;
      }
    }

    // Check for schedule conflicts
    if (scheduleJson) {
      // New format: scheduleItems array
      if (Array.isArray(scheduleJson.scheduleItems) && scheduleJson.scheduleItems.length > 0) {
        for (const newItem of scheduleJson.scheduleItems) {
          for (const enrolledEnrollment of enrolledSections) {
            let existingSchedule = enrolledEnrollment.section.scheduleJson;
            if (typeof existingSchedule === 'string') {
              try {
                existingSchedule = JSON.parse(existingSchedule);
              } catch (e) {
                continue;
              }
            }
            
            if (!existingSchedule) continue;
            
            // Check new format
            if (Array.isArray(existingSchedule.scheduleItems) && existingSchedule.scheduleItems.length > 0) {
              for (const existingItem of existingSchedule.scheduleItems) {
                if (newItem.day === existingItem.day) {
                  const newStart = timeToMinutes(newItem.startTime);
                  const newEnd = timeToMinutes(newItem.endTime);
                  const existingStart = timeToMinutes(existingItem.startTime);
                  const existingEnd = timeToMinutes(existingItem.endTime);
                  
                  if ((newStart < existingEnd && newEnd > existingStart)) {
                    const courseCode = enrolledEnrollment.section.course?.code || 'Bilinmeyen';
                    const courseName = enrolledEnrollment.section.course?.name || 'Ders';
                    throw new Error(`Bu dersi alamazsın. ${courseCode} - ${courseName} dersi ile aynı gün ve saatte çakışıyor.`);
                  }
                }
              }
            }
            // Check old format
            else if (existingSchedule.days && Array.isArray(existingSchedule.days) && existingSchedule.startTime) {
              if (existingSchedule.days.includes(newItem.day)) {
                const newStart = timeToMinutes(newItem.startTime);
                const newEnd = timeToMinutes(newItem.endTime);
                const existingStart = timeToMinutes(existingSchedule.startTime);
                const existingEnd = timeToMinutes(existingSchedule.endTime);
                
                if ((newStart < existingEnd && newEnd > existingStart)) {
                  const courseCode = enrolledEnrollment.section.course?.code || 'Bilinmeyen';
                  const courseName = enrolledEnrollment.section.course?.name || 'Ders';
                  throw new Error(`Bu dersi alamazsın. ${courseCode} - ${courseName} dersi ile aynı gün ve saatte çakışıyor.`);
                }
              }
            }
          }
        }
      }
      // Old format: days array + startTime/endTime
      else if (scheduleJson.days && Array.isArray(scheduleJson.days) && scheduleJson.startTime) {
        for (const enrolledEnrollment of enrolledSections) {
          let existingSchedule = enrolledEnrollment.section.scheduleJson;
          if (typeof existingSchedule === 'string') {
            try {
              existingSchedule = JSON.parse(existingSchedule);
            } catch (e) {
              continue;
            }
          }
          
          if (!existingSchedule) continue;
          
          // Check new format
          if (Array.isArray(existingSchedule.scheduleItems) && existingSchedule.scheduleItems.length > 0) {
            for (const existingItem of existingSchedule.scheduleItems) {
              if (scheduleJson.days.includes(existingItem.day)) {
                const newStart = timeToMinutes(scheduleJson.startTime);
                const newEnd = timeToMinutes(scheduleJson.endTime);
                const existingStart = timeToMinutes(existingItem.startTime);
                const existingEnd = timeToMinutes(existingItem.endTime);
                
                if ((newStart < existingEnd && newEnd > existingStart)) {
                  const courseCode = enrolledEnrollment.section.course?.code || 'Bilinmeyen';
                  const courseName = enrolledEnrollment.section.course?.name || 'Ders';
                  throw new Error(`Bu dersi alamazsın. ${courseCode} - ${courseName} dersi ile aynı gün ve saatte çakışıyor.`);
                }
              }
            }
          }
          // Check old format
          else if (existingSchedule.days && Array.isArray(existingSchedule.days) && existingSchedule.startTime) {
            const dayOverlap = scheduleJson.days.some(day => existingSchedule.days.includes(day));
            if (dayOverlap) {
              const newStart = timeToMinutes(scheduleJson.startTime);
              const newEnd = timeToMinutes(scheduleJson.endTime);
              const existingStart = timeToMinutes(existingSchedule.startTime);
              const existingEnd = timeToMinutes(existingSchedule.endTime);

              if ((newStart < existingEnd && newEnd > existingStart)) {
                const courseCode = enrolledEnrollment.section.course?.code || 'Bilinmeyen';
                const courseName = enrolledEnrollment.section.course?.name || 'Ders';
                throw new Error(`Bu dersi alamazsın. ${courseCode} - ${courseName} dersi ile aynı gün ve saatte çakışıyor.`);
              }
            }
          }
        }
      }
    }

    // Check capacity (but don't update it yet - will be updated when approved)
    if (section.enrolledCount >= section.capacity) {
      throw new Error('Section is full');
    }

    // Create enrollment with pending status
    const enrollment = await Enrollment.create({
      studentId,
      sectionId,
      status: 'pending',
      enrollmentDate: new Date()
    });

    return {
      message: 'Enrollment request submitted. Waiting for instructor approval.',
      enrollment
    };
  } catch (error) {
    console.error('Error in enroll service:', error);
    throw error;
  }
};

const drop = async (enrollmentId, studentId) => {
  const enrollment = await Enrollment.findOne({
    where: { id: enrollmentId, studentId },
    include: [
      {
        model: CourseSection,
        as: 'section',
        attributes: ['id', 'enrolledCount']
      }
    ]
  });

  if (!enrollment) {
    throw new Error('Enrollment not found');
  }

  if (enrollment.status !== 'enrolled') {
    throw new Error('Cannot drop a course that is not currently enrolled');
  }

  // Check drop period (first 4 weeks)
  const enrollmentDate = new Date(enrollment.enrollmentDate);
  const now = new Date();
  const weeksSinceEnrollment = Math.floor((now - enrollmentDate) / (1000 * 60 * 60 * 24 * 7));

  if (weeksSinceEnrollment > 4) {
    throw new Error('Drop period has ended. Cannot drop after 4 weeks.');
  }

  // Update enrollment status
  await enrollment.update({ status: 'dropped' });

  // Decrease section capacity
  // Column name is 'enrolledCount' as defined in migration
  // Use raw SQL to ensure correct column name
  await db.sequelize.query(
    `UPDATE "CourseSections" 
     SET "enrolledCount" = "enrolledCount" - 1 
     WHERE id = :sectionId`,
    {
      replacements: { sectionId: enrollment.sectionId },
      type: db.sequelize.QueryTypes.UPDATE
    }
  );

  return {
    message: 'Successfully dropped the course'
  };
};

const myCourses = async (studentId) => {
  const enrollments = await Enrollment.findAll({
    where: {
      studentId,
      // ÖNEMLİ GÜNCELLEME: 
      // Sadece 'enrolled' derseniz, dönem sonu not girilip statü 'completed' olunca ders buradan silinir.
      // Bu yüzden notu girilmiş dersleri de çağırıyoruz.
      status: { [Op.in]: ['enrolled', 'completed', 'failed'] }
    },
    attributes: [
      'id',
      'studentId',
      'sectionId',
      'status',
      'enrollmentDate',
      'midtermGrade',
      'finalGrade',
      'letterGrade',
      'gradePoint'
    ],
    include: [
      {
        model: CourseSection,
        as: 'section',
        // Don't specify attributes to get all fields including scheduleJson
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'code', 'name', 'credits', 'ects']
          },
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'fullName', 'email']
          }
        ]
      }
    ],
    order: [['enrollmentDate', 'DESC']]
  });

  // Calculate attendance percentage for each course
  // Also fetch scheduleJson separately if not included
  const enrollmentsWithAttendance = await Promise.all(
    enrollments.map(async (enrollment) => {
      const sectionId = enrollment.sectionId;
      
      // Always fetch scheduleJson directly from database to ensure we get it
      // Sequelize JSONB fields sometimes don't come through in includes
      let scheduleJson = null;
      try {
        // Try Sequelize findByPk with raw: true first (most reliable for JSONB)
        const sectionRaw = await CourseSection.findByPk(sectionId, {
          attributes: ['id', 'scheduleJson'],
          raw: true // Get raw data, not Sequelize instance
        });
        
        if (sectionRaw && sectionRaw.scheduleJson !== null && sectionRaw.scheduleJson !== undefined) {
          scheduleJson = sectionRaw.scheduleJson;
          
          console.log('ScheduleJson from Sequelize raw query:', {
            enrollmentId: enrollment.id,
            sectionId: sectionId,
            scheduleJsonFromDB: scheduleJson,
            scheduleJsonType: typeof scheduleJson,
            sectionRaw: sectionRaw
          });
        }
        
        // If raw query didn't work, try Sequelize instance
        if (!scheduleJson) {
          const sectionDirect = await CourseSection.findByPk(sectionId, {
            attributes: ['id', 'scheduleJson'],
            raw: false // Get Sequelize instance
          });
          
          if (sectionDirect) {
            // Use toJSON() to get plain object, then get scheduleJson
            const sectionData = sectionDirect.toJSON ? sectionDirect.toJSON() : sectionDirect;
            scheduleJson = sectionData.scheduleJson;
            
            // Also try direct access methods
            if (!scheduleJson || scheduleJson === null || scheduleJson === undefined) {
              scheduleJson = sectionDirect.scheduleJson || 
                            sectionDirect.get?.('scheduleJson') ||
                            sectionDirect.dataValues?.scheduleJson ||
                            null;
            }
            
            console.log('ScheduleJson from Sequelize instance:', {
              enrollmentId: enrollment.id,
              sectionId: sectionId,
              scheduleJsonFromDB: scheduleJson,
              scheduleJsonType: typeof scheduleJson,
              sectionData: sectionData
            });
          } else {
            console.error('Section not found for sectionId:', sectionId);
          }
        }
      } catch (e) {
        console.error('Error fetching scheduleJson:', e);
      }
      
      // Parse if string (Sequelize sometimes returns JSONB as string)
      if (typeof scheduleJson === 'string' && scheduleJson !== 'null' && scheduleJson.trim() !== '') {
        try {
          scheduleJson = JSON.parse(scheduleJson);
          console.log('Parsed scheduleJson from string:', scheduleJson);
        } catch (e) {
          console.error('Error parsing scheduleJson:', e, scheduleJson);
          scheduleJson = null;
        }
      }
      
      // If it's the string "null", set to null
      if (scheduleJson === 'null') {
        scheduleJson = null;
      }
      
      // Final check - if still null, log it
      if (!scheduleJson) {
        console.warn('ScheduleJson is null for sectionId:', sectionId, 'enrollmentId:', enrollment.id);
      } else {
        console.log('ScheduleJson successfully retrieved:', {
          enrollmentId: enrollment.id,
          sectionId: sectionId,
          scheduleJson: scheduleJson,
          scheduleJsonType: typeof scheduleJson,
          scheduleJsonStringified: JSON.stringify(scheduleJson)
        });
      }
      
      // Debug: Log raw enrollment data to check if grades are present
      if (process.env.NODE_ENV === 'development') {
        console.log('Raw enrollment data for studentId:', studentId, {
          enrollmentId: enrollment.id,
          sectionId: enrollment.sectionId,
          midtermGrade: enrollment.midtermGrade,
          finalGrade: enrollment.finalGrade,
          letterGrade: enrollment.letterGrade,
          gradePoint: enrollment.gradePoint,
          midtermType: typeof enrollment.midtermGrade,
          finalType: typeof enrollment.finalGrade,
          midtermValue: enrollment.get ? enrollment.get('midtermGrade') : 'N/A',
          finalValue: enrollment.get ? enrollment.get('finalGrade') : 'N/A'
        });
      }

      // Get total sessions for this section
      const totalSessions = await AttendanceSession.count({
        where: { sectionId, status: { [Op.ne]: 'cancelled' } }
      });

      // Get attended sessions
      const sessionIds = await AttendanceSession.findAll({
        where: { sectionId, status: { [Op.ne]: 'cancelled' } },
        attributes: ['id']
      });
      const sessionIdList = sessionIds.map(s => s.id);
      
      const attendedSessions = sessionIdList.length > 0
        ? await AttendanceRecord.count({
            where: {
              studentId,
              sessionId: { [Op.in]: sessionIdList }
            }
          })
        : 0;

      // Get excused absences
      const excusedAbsences = sessionIdList.length > 0
        ? await db.ExcuseRequest.count({
            where: {
              studentId,
              status: 'approved',
              sessionId: { [Op.in]: sessionIdList }
            }
          })
        : 0;

      const attendancePercentage =
        totalSessions > 0
          ? Math.round(((attendedSessions + excusedAbsences) / totalSessions) * 100)
          : null;

      // Parse scheduleJson if it's a string
      if (typeof scheduleJson === 'string' && scheduleJson !== 'null') {
        try {
          scheduleJson = JSON.parse(scheduleJson);
        } catch (e) {
          scheduleJson = null;
        }
      }
      
      // If it's the string "null", set to null
      if (scheduleJson === 'null') {
        scheduleJson = null;
      }

      // Debug log
      if (process.env.NODE_ENV === 'development') {
        console.log('Schedule data for enrollment:', enrollment.id, {
          scheduleJson,
          scheduleJsonType: typeof scheduleJson,
          sectionId: enrollment.sectionId,
          hasSection: !!enrollment.section
        });
      }

      // YENİ EKLENEN KISIM: NOT BİLGİLERİ
      // Convert DECIMAL to number, handle null/undefined properly
      // Sequelize DECIMAL fields come as strings, so we need to parse them
      // Use get() method to ensure we get the raw value from Sequelize instance
      const midtermValue = enrollment.get ? enrollment.get('midtermGrade') : enrollment.midtermGrade;
      const finalValue = enrollment.get ? enrollment.get('finalGrade') : enrollment.finalGrade;
      const letterValue = enrollment.get ? enrollment.get('letterGrade') : enrollment.letterGrade;
      const gradePointValue = enrollment.get ? enrollment.get('gradePoint') : enrollment.gradePoint;
      
      const grades = {
          midterm: (midtermValue !== null && 
                   midtermValue !== undefined && 
                   midtermValue !== '' &&
                   !isNaN(midtermValue))
            ? parseFloat(midtermValue)
            : null,
          final: (finalValue !== null && 
                 finalValue !== undefined && 
                 finalValue !== '' &&
                 !isNaN(finalValue))
            ? parseFloat(finalValue)
            : null,
          letter: (letterValue && String(letterValue).trim() !== '') 
            ? String(letterValue).trim()
            : null,
          gradePoint: (gradePointValue !== null && 
                      gradePointValue !== undefined && 
                      gradePointValue !== '' &&
                      !isNaN(gradePointValue))
            ? parseFloat(gradePointValue)
            : null
      };
      
      // Debug: Log processed grades
      if (process.env.NODE_ENV === 'development') {
        console.log('Processed grades for enrollmentId:', enrollment.id, {
          raw: { midtermValue, finalValue, letterValue, gradePointValue },
          processed: grades
        });
      }
      
      // Final debug log before returning
      console.log('Final return data for enrollment:', enrollment.id, {
        scheduleJson,
        scheduleJsonType: typeof scheduleJson,
        scheduleJsonValue: scheduleJson ? JSON.stringify(scheduleJson) : 'null',
        sectionId: sectionId,
        willReturnScheduleJson: !!scheduleJson
      });
      
      const returnData = {
        enrollmentId: enrollment.id,
        sectionId: enrollment.sectionId, // Section ID'yi ekle
        status: enrollment.status, // Öğrenci dersin durumunu görsün (Tamamlandı/Kaldı/Devam Ediyor)
        course: {
          code: enrollment.section.course.code,
          name: enrollment.section.course.name,
          credits: enrollment.section.course.credits,
          ects: enrollment.section.course.ects
        },
        section: {
          sectionNumber: enrollment.section.sectionNumber,
          instructor: enrollment.section.instructor?.fullName || 'TBA',
          scheduleText: scheduleJson
            ? formatScheduleText(scheduleJson)
            : 'TBA',
          scheduleJson: scheduleJson // Make sure this is included - even if null
        },
        grades,
        attendancePercentage
      };
      
      // Final verification
      console.log('Return data section object:', {
        enrollmentId: enrollment.id,
        sectionScheduleJson: returnData.section.scheduleJson,
        sectionScheduleJsonType: typeof returnData.section.scheduleJson,
        sectionKeys: Object.keys(returnData.section)
      });
      
      return returnData;
    })
  );

  // Final check - log the entire response to see if section is included
  console.log('myCourses returning enrollments:', {
    count: enrollmentsWithAttendance.length,
    firstEnrollment: enrollmentsWithAttendance[0] ? {
      enrollmentId: enrollmentsWithAttendance[0].enrollmentId,
      hasSection: !!enrollmentsWithAttendance[0].section,
      sectionKeys: enrollmentsWithAttendance[0].section ? Object.keys(enrollmentsWithAttendance[0].section) : [],
      sectionScheduleJson: enrollmentsWithAttendance[0].section?.scheduleJson
    } : null
  });

  return enrollmentsWithAttendance;
};

const formatScheduleText = (scheduleJson) => {
  if (!scheduleJson) {
    return 'TBA';
  }
  
  // New format: scheduleItems array
  if (Array.isArray(scheduleJson.scheduleItems) && scheduleJson.scheduleItems.length > 0) {
    const dayLabels = {
      Monday: 'Pazartesi',
      Tuesday: 'Salı',
      Wednesday: 'Çarşamba',
      Thursday: 'Perşembe',
      Friday: 'Cuma',
    };
    const scheduleTexts = scheduleJson.scheduleItems.map(item => {
      const dayLabel = dayLabels[item.day] || item.day;
      const timeStr = item.startTime && item.endTime 
        ? ` ${item.startTime}-${item.endTime}` 
        : '';
      return `${dayLabel}${timeStr}`;
    });
    return scheduleTexts.join(', ');
  }
  
  // Old format: days array + single startTime/endTime
  if (Array.isArray(scheduleJson.days) && scheduleJson.days.length > 0 && scheduleJson.startTime) {
    const days = scheduleJson.days.join(', ');
    const time = `${scheduleJson.startTime}${scheduleJson.endTime ? ` - ${scheduleJson.endTime}` : ''}`;
    return `${days} ${time}`;
  }
  
  return 'TBA';
};

const sectionStudents = async (sectionId) => {
  // Notu girilmiş (completed/failed) veya hala dersi alan (enrolled) herkesi getir.
  // Sadece dersi bırakanları, reddedilenleri ve onay bekleyenleri hariç tut.
  const enrollments = await Enrollment.findAll({
    where: {
      sectionId,
      status: { 
        [Op.notIn]: ['dropped', 'rejected', 'pending'] 
      }
    },
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'fullName', 'email'],
        include: [
          {
            model: db.Student,
            as: 'Student',
            attributes: ['studentNumber']
          }
        ]
      }
    ],
    order: [['enrollmentDate', 'ASC']]
  });

  return enrollments.map((enrollment) => ({
    enrollmentId: enrollment.id,
    id: enrollment.student.id,
    name: enrollment.student.fullName,
    studentName: enrollment.student.fullName,
    studentNumber: enrollment.student.Student?.studentNumber || 'N/A',
    studentId: enrollment.student.Student?.studentNumber || 'N/A',
    midtermGrade: enrollment.midtermGrade,
    finalGrade: enrollment.finalGrade,
    letterGrade: enrollment.letterGrade,
    gradePoint: enrollment.gradePoint,
    status: enrollment.status // Statüyü frontend'de görmek için ekledik
  }));
};
// Get pending enrollments for a section (for instructors and admins)
const getPendingEnrollments = async (sectionId, userId, userRole) => {
  // Verify instructor owns this section (or user is admin)
  const section = await CourseSection.findByPk(sectionId);
  if (!section) {
    throw new Error('Section not found');
  }

  // Admin can view any section's pending enrollments
  if (userRole !== 'admin' && section.instructorId !== userId) {
    throw new Error('You are not the instructor of this section');
  }

  const enrollments = await Enrollment.findAll({
    where: {
      sectionId,
      status: 'pending'
    },
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'fullName', 'email'],
        include: [
          {
            model: db.Student,
            as: 'Student',
            attributes: ['studentNumber']
          }
        ]
      }
    ],
    order: [['enrollmentDate', 'ASC']]
  });

  return enrollments.map((enrollment) => ({
    enrollmentId: enrollment.id,
    id: enrollment.student.id,
    name: enrollment.student.fullName,
    studentName: enrollment.student.fullName,
    studentNumber: enrollment.student.Student?.studentNumber || 'N/A',
    enrollmentDate: enrollment.enrollmentDate
  }));
};

// Approve enrollment
const approveEnrollment = async (enrollmentId, userId, userRole) => {
  const enrollment = await Enrollment.findByPk(enrollmentId, {
    include: [
      {
        model: CourseSection,
        as: 'section',
        attributes: ['id', 'enrolledCount', 'capacity', 'instructorId']
      }
    ]
  });

  if (!enrollment) {
    throw new AppError('Kayıt bulunamadı', 404);
  }

  if (!enrollment.section) {
    throw new AppError('Bu kayıt için section bulunamadı', 404);
  }

  if (enrollment.status !== 'pending') {
    throw new AppError('Sadece bekleyen kayıtlar onaylanabilir', 400);
  }

  // Verify instructor owns this section (or user is admin)
  if (userRole !== 'admin' && enrollment.section.instructorId !== userId) {
    throw new AppError('Bu section için yetkiniz yok. Sadece kendi section\'larınızı onaylayabilirsiniz.', 403);
  }

  // Check capacity
  const currentEnrolled = enrollment.section.enrolledCount || 0;
  const capacity = enrollment.section.capacity || 0;
  if (capacity > 0 && currentEnrolled >= capacity) {
    throw new AppError('Section dolu. Daha fazla kayıt onaylanamaz.', 400);
  }

  // Use transaction to ensure atomicity
  const transaction = await db.sequelize.transaction();

  try {
    // Update enrollment status
    await enrollment.update({ status: 'enrolled' }, { transaction });

    // Increase section enrolledCount
    // Use raw query to ensure transaction works correctly
    await db.sequelize.query(
      `UPDATE "CourseSections" 
       SET "enrolledCount" = COALESCE("enrolledCount", 0) + 1 
       WHERE id = :sectionId`,
      {
        replacements: { sectionId: enrollment.sectionId },
        type: db.sequelize.QueryTypes.UPDATE,
        transaction
      }
    );

    await transaction.commit();

    return {
      message: 'Enrollment approved successfully',
      enrollment: await Enrollment.findByPk(enrollmentId, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'fullName', 'email']
          }
        ]
      })
    };
  } catch (error) {
    await transaction.rollback();
    console.error('Error in approveEnrollment:', error);
    console.error('Error stack:', error.stack);
    // If it's already an AppError, just rethrow it
    if (error.statusCode) {
      throw error;
    }
    // Otherwise, wrap it in an AppError
    throw new AppError(error.message || 'Kayıt onaylanırken bir hata oluştu', 500);
  }
};

// Reject enrollment
const rejectEnrollment = async (enrollmentId, userId, userRole) => {
  const enrollment = await Enrollment.findByPk(enrollmentId, {
    include: [
      {
        model: CourseSection,
        as: 'section',
        attributes: ['id', 'instructorId']
      }
    ]
  });

  if (!enrollment) {
    throw new Error('Enrollment not found');
  }

  if (enrollment.status !== 'pending') {
    throw new Error('Only pending enrollments can be rejected');
  }

  // Verify instructor owns this section (or user is admin)
  if (userRole !== 'admin' && enrollment.section.instructorId !== userId) {
    throw new Error('You are not the instructor of this section');
  }

  // Update enrollment status to rejected
  await enrollment.update({ status: 'rejected' });

  return {
    message: 'Enrollment rejected successfully'
  };
};

module.exports = {
  enroll,
  drop,
  myCourses,
  sectionStudents,
  getPendingEnrollments,
  approveEnrollment,
  rejectEnrollment
};
