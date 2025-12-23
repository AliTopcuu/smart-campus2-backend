const db = require('../models');
const { CourseSection, Classroom, Enrollment, Course } = db;
const { ValidationError } = require('../utils/errors');
const { Op } = require('sequelize');

/**
 * Constraint Satisfaction Problem (CSP) based scheduling algorithm
 * 
 * Hard Constraints:
 * 1. No instructor double-booking
 * 2. No classroom double-booking
 * 3. No student schedule conflict (based on enrollments)
 * 4. Classroom capacity >= section capacity
 * 5. Classroom features match course requirements
 * 
 * Soft Constraints (optimize):
 * 1. Respect instructor time preferences
 * 2. Minimize gaps in student schedules
 * 3. Distribute courses evenly across week
 * 4. Prefer morning slots for required courses
 */

// Time slots: Monday-Friday, 09:00-17:00 (excluding lunch break 12:00-13:00)
// Each slot is 30 minutes, courses are 1.5 hours (3 slots) with 15 min break between courses
const TIME_SLOTS = [];
for (let hour = 9; hour < 17; hour++) {
  // Skip lunch break (12:00-13:00)
  if (hour === 12) continue;
  
  for (let minute = 0; minute < 60; minute += 30) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  }
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// Convert time string to minutes for comparison
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
}

// Convert minutes to time string
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Check if two time ranges overlap
function timeOverlaps(start1, end1, start2, end2) {
  if (!start1 || !end1 || !start2 || !end2) {
    return false; // Invalid time range
  }
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  // Overlap occurs if: start1 < end2 AND start2 < end1
  return s1 < e2 && s2 < e1;
}

// Check if time range overlaps with lunch break (12:00-13:00)
function overlapsLunchBreak(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const lunchStart = timeToMinutes('12:00');
  const lunchEnd = timeToMinutes('13:00');
  return start < lunchEnd && end > lunchStart;
}

// Check if there's at least 15 minutes gap between courses
// Returns true if courses don't overlap AND have at least 15 min gap
function hasMinimumGap(startTime1, endTime1, startTime2, endTime2) {
  // If they don't overlap at all, check gap
  if (!timeOverlaps(startTime1, endTime1, startTime2, endTime2)) {
    // Check gap: course1 ends before course2 starts
    if (timeToMinutes(endTime1) <= timeToMinutes(startTime2)) {
      const gap = timeToMinutes(startTime2) - timeToMinutes(endTime1);
      return gap >= 15;
    }
    // Check gap: course2 ends before course1 starts
    if (timeToMinutes(endTime2) <= timeToMinutes(startTime1)) {
      const gap = timeToMinutes(startTime1) - timeToMinutes(endTime2);
      return gap >= 15;
    }
  }
  // If they overlap, no gap
  return false;
}

// Check hard constraints
function checkHardConstraints(assignment, allAssignments, section, classroom, day, startTime, endTime, enrollments) {
  // Validate inputs
  if (!startTime || !endTime || !day || !classroom) {
    return { valid: false, reason: 'Invalid assignment parameters' };
  }

  // Check if overlaps with lunch break (12:00-13:00)
  if (overlapsLunchBreak(startTime, endTime)) {
    return { valid: false, reason: 'Course overlaps with lunch break (12:00-13:00)' };
  }

  // Normalize day to lowercase for comparison
  const normalizedDay = day.toLowerCase();

  // 1. No instructor double-booking (with 15 min gap requirement)
  if (section.instructorId) {
    for (const otherAssignment of allAssignments) {
      if (otherAssignment.sectionId === section.id) continue;
      if (!otherAssignment.instructorId || !otherAssignment.startTime || !otherAssignment.endTime) continue;
      
      if (otherAssignment.instructorId === section.instructorId &&
          otherAssignment.day?.toLowerCase() === normalizedDay) {
        // Check for overlap or insufficient gap
        if (!hasMinimumGap(otherAssignment.startTime, otherAssignment.endTime, startTime, endTime)) {
          return { valid: false, reason: `Instructor double-booking: Instructor ${section.instructorId} already has a class at ${otherAssignment.startTime}-${otherAssignment.endTime} (needs 15 min gap)` };
        }
      }
    }
  }

  // 2. No classroom double-booking (with 15 min gap requirement)
  for (const otherAssignment of allAssignments) {
    if (otherAssignment.sectionId === section.id) continue;
    if (!otherAssignment.classroomId || !otherAssignment.startTime || !otherAssignment.endTime) continue;
    
    if (otherAssignment.classroomId === classroom.id &&
        otherAssignment.day?.toLowerCase() === normalizedDay) {
      // Check for overlap or insufficient gap
      if (!hasMinimumGap(otherAssignment.startTime, otherAssignment.endTime, startTime, endTime)) {
        return { valid: false, reason: `Classroom double-booking: Classroom ${classroom.id} already booked at ${otherAssignment.startTime}-${otherAssignment.endTime} (needs 15 min gap)` };
      }
    }
  }

  // 3. No student schedule conflict
  if (enrollments && enrollments.length > 0) {
    for (const enrollment of enrollments) {
      const enrolledSection = enrollment.section;
      if (!enrolledSection || !enrolledSection.scheduleJson) continue;

      let enrolledSchedule = enrolledSection.scheduleJson;
      if (typeof enrolledSchedule === 'string') {
        try {
          enrolledSchedule = JSON.parse(enrolledSchedule);
        } catch (e) {
          continue;
        }
      }

      // Check if enrolled section has schedule on same day
      if (Array.isArray(enrolledSchedule.scheduleItems)) {
        for (const item of enrolledSchedule.scheduleItems) {
          if (item.day && item.day.toLowerCase() === day.toLowerCase() &&
              timeOverlaps(item.startTime, item.endTime, startTime, endTime)) {
            return { valid: false, reason: 'Student schedule conflict' };
          }
        }
      } else if (enrolledSchedule.days && Array.isArray(enrolledSchedule.days)) {
        if (enrolledSchedule.days.some(d => d.toLowerCase() === day.toLowerCase()) &&
            timeOverlaps(enrolledSchedule.startTime, enrolledSchedule.endTime, startTime, endTime)) {
          return { valid: false, reason: 'Student schedule conflict' };
        }
      }
    }
  }

  // 4. Classroom capacity >= section capacity
  if (classroom.capacity < section.capacity) {
    return { valid: false, reason: 'Classroom capacity insufficient' };
  }

  // 5. Classroom features match course requirements (if specified)
  if (section.course && section.course.requirementsJson) {
    let requirements = section.course.requirementsJson;
    if (typeof requirements === 'string') {
      try {
        requirements = JSON.parse(requirements);
      } catch (e) {
        requirements = null;
      }
    }

    if (requirements && requirements.features) {
      const classroomFeatures = classroom.featuresJson || {};
      for (const requiredFeature of requirements.features) {
        if (!classroomFeatures[requiredFeature]) {
          return { valid: false, reason: `Missing required feature: ${requiredFeature}` };
        }
      }
    }
  }

  return { valid: true };
}

// Calculate soft constraint score (lower is better)
function calculateSoftScore(assignment, allAssignments, section, day, startTime) {
  let score = 0;

  // 1. Prefer morning slots for required courses
  const startMinutes = timeToMinutes(startTime);
  if (section.course && section.course.isRequired) {
    // Morning slots (09:00-12:00) get lower score
    if (startMinutes >= 540 && startMinutes < 720) {
      score -= 10;
    } else {
      score += 5;
    }
  }

  // 2. Distribute courses evenly across week
  const dayIndex = DAYS_OF_WEEK.indexOf(day.toLowerCase());
  const coursesOnDay = allAssignments.filter(a => a.day === day).length;
  score += coursesOnDay * 2; // Penalize days with many courses

  // 3. Minimize gaps (prefer consecutive time slots)
  // This is harder to calculate without full schedule, so we'll skip for now

  return score;
}

// Backtracking algorithm with heuristics
async function backtrackSchedule(sections, classrooms, enrollments, existingAssignments = [], assignments = [], depth = 0) {
  if (depth >= sections.length) {
    return { success: true, assignments };
  }

  const section = sections[depth];
  
  // Check if this section already has a schedule (from previous manual assignment)
  const existingSchedule = section.scheduleJson;
  if (existingSchedule && typeof existingSchedule === 'object' && Array.isArray(existingSchedule.scheduleItems) && existingSchedule.scheduleItems.length > 0) {
    // Use existing schedule for this section
    const existingItem = existingSchedule.scheduleItems[0];
    if (existingItem.day && existingItem.startTime && existingItem.endTime) {
      const assignment = {
        sectionId: section.id,
        instructorId: section.instructorId,
        classroomId: section.classroomId || existingItem.classroomId,
        day: existingItem.day,
        startTime: existingItem.startTime,
        endTime: existingItem.endTime
      };

      // Check hard constraints against all assignments (including existing ones)
      const allAssignments = [...existingAssignments, ...assignments];
      const sectionEnrollments = await Enrollment.findAll({
        where: { sectionId: section.id, status: 'enrolled' },
        include: [
          {
            model: CourseSection,
            as: 'section',
            include: [{ model: Course, as: 'course' }]
          }
        ]
      });

      const classroom = classrooms.find(c => c.id === assignment.classroomId);
      if (!classroom) {
        // Classroom not found, skip this section or try to find alternative
        return { success: false, assignments: null };
      }

      const constraintCheck = checkHardConstraints(
        assignment,
        allAssignments,
        section,
        classroom,
        assignment.day,
        assignment.startTime,
        assignment.endTime,
        sectionEnrollments
      );

      if (constraintCheck.valid) {
        assignments.push(assignment);
        const result = await backtrackSchedule(sections, classrooms, enrollments, existingAssignments, assignments, depth + 1);
        if (result.success) {
          return result;
        }
        assignments.pop();
      }
      // If existing schedule conflicts, we can't use it - continue to try alternatives
    }
  }
  
  // Get enrollments for this section
  const sectionEnrollments = await Enrollment.findAll({
    where: { sectionId: section.id, status: 'enrolled' },
    include: [
      {
        model: CourseSection,
        as: 'section',
        include: [{ model: Course, as: 'course' }]
      }
    ]
  });

  // Try each classroom
  for (const classroom of classrooms) {
    // Try each day
    for (const day of DAYS_OF_WEEK) {
      // Try different time slots (course duration: 1.5 hours = 3 slots)
      // We need at least 3 slots ahead for a 1.5 hour course
      for (let i = 0; i < TIME_SLOTS.length - 3; i++) {
        const startTime = TIME_SLOTS[i];
        const endTimeIndex = i + 3;
        
        // Check if endTime would be in lunch break
        if (endTimeIndex < TIME_SLOTS.length) {
          const endTime = TIME_SLOTS[endTimeIndex];
          
          // Validate time slot
          if (!startTime || !endTime) {
            continue;
          }

          // Skip if start or end time is in lunch break
          if (overlapsLunchBreak(startTime, endTime)) {
            continue;
          }

          const assignment = {
            sectionId: section.id,
            instructorId: section.instructorId,
            classroomId: classroom.id,
            day,
            startTime,
            endTime
          };

          // Check hard constraints against all assignments (including existing ones and current assignments)
          const allAssignments = [...existingAssignments, ...assignments];
          const constraintCheck = checkHardConstraints(
            assignment,
            allAssignments,
            section,
            classroom,
            day,
            startTime,
            endTime,
            sectionEnrollments
          );

          if (!constraintCheck.valid) {
            // Log conflict for debugging
            if (process.env.NODE_ENV === 'development') {
              console.log(`Conflict detected for section ${section.id}: ${constraintCheck.reason}`);
            }
            continue; // Skip this assignment
          }

          // Add assignment and recurse
          assignments.push(assignment);
          const result = await backtrackSchedule(sections, classrooms, enrollments, existingAssignments, assignments, depth + 1);

          if (result.success) {
            return result;
          }

          // Backtrack
          assignments.pop();
        }
      }
    }
  }

  return { success: false, assignments: null };
}

// Generate schedule using CSP algorithm
async function generateSchedule(sectionIds, semester, year) {
  // Fetch sections with full details
  const sections = await CourseSection.findAll({
    where: {
      id: { [Op.in]: sectionIds },
      semester,
      year
    },
    include: [
      { model: Course, as: 'course' },
      { model: db.User, as: 'instructor', attributes: ['id', 'fullName'], required: false }
    ]
  });

  if (sections.length === 0) {
    throw new ValidationError('No sections found for the given criteria');
  }

  // Fetch all available classrooms
  const classrooms = await Classroom.findAll({
    order: [['capacity', 'DESC']]
  });

  if (classrooms.length === 0) {
    throw new ValidationError('No classrooms available');
  }

  // Fetch all enrollments for conflict checking
  const allEnrollments = await Enrollment.findAll({
    where: {
      status: 'enrolled',
      sectionId: { [Op.in]: sectionIds }
    },
    include: [
      {
        model: CourseSection,
        as: 'section',
        include: [{ model: Course, as: 'course' }]
      }
    ]
  });

  // Get existing assignments from ALL sections (not just selected ones)
  // This ensures we don't conflict with manually assigned schedules from other sections
  const allExistingSections = await CourseSection.findAll({
    where: {
      semester,
      year,
      scheduleJson: { [Op.ne]: null },
      classroomId: { [Op.ne]: null }
    },
    include: [
      { model: Course, as: 'course' },
      { model: db.User, as: 'instructor', attributes: ['id', 'fullName'], required: false }
    ]
  });

  const existingAssignments = [];
  for (const section of allExistingSections) {
    // Skip sections that are in the selected list (they will be handled in backtrackSchedule)
    if (sectionIds.includes(section.id)) {
      continue;
    }

    if (section.scheduleJson && section.classroomId) {
      let scheduleJson = section.scheduleJson;
      if (typeof scheduleJson === 'string') {
        try {
          scheduleJson = JSON.parse(scheduleJson);
        } catch (e) {
          continue;
        }
      }

      if (Array.isArray(scheduleJson.scheduleItems)) {
        for (const item of scheduleJson.scheduleItems) {
          if (item.day && item.startTime && item.endTime) {
            existingAssignments.push({
              sectionId: section.id,
              instructorId: section.instructorId,
              classroomId: section.classroomId,
              day: item.day.toLowerCase(),
              startTime: item.startTime,
              endTime: item.endTime
            });
          }
        }
      }
    }
  }

  // Run backtracking algorithm
  const result = await backtrackSchedule(sections, classrooms, allEnrollments, existingAssignments);

  if (!result.success) {
    throw new ValidationError('Could not generate a valid schedule. Try adjusting constraints or reducing number of sections.');
  }

  // Format assignments as schedule items
  const scheduleItems = result.assignments.map(assignment => ({
    sectionId: assignment.sectionId,
    classroomId: assignment.classroomId,
    day: assignment.day,
    startTime: assignment.startTime,
    endTime: assignment.endTime
  }));

  return {
    semester,
    year,
    generatedAt: new Date(),
    scheduleItems,
    sections: sections.map(s => ({
      id: s.id,
      courseCode: s.course?.code,
      sectionNumber: s.sectionNumber,
      instructor: s.instructor?.fullName
    }))
  };
}

// Apply generated schedule to sections
async function applySchedule(scheduleData) {
  const t = await db.sequelize.transaction();
  try {
    const { scheduleItems } = scheduleData;

    for (const item of scheduleItems) {
      const section = await CourseSection.findByPk(item.sectionId, { transaction: t });
      if (!section) {
        throw new ValidationError(`Section ${item.sectionId} not found`);
      }

      // Create or update scheduleJson
      const scheduleJson = {
        scheduleItems: [
          {
            day: item.day,
            startTime: item.startTime,
            endTime: item.endTime,
            classroomId: item.classroomId
          }
        ]
      };

      await section.update({ 
        scheduleJson,
        classroomId: item.classroomId
      }, { transaction: t });
    }

    await t.commit();
    return { message: 'Schedule applied successfully', scheduleData };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// Get user's schedule (student or instructor)
async function getMySchedule(userId, userRole, semester, year) {
  let sections = [];

  if (userRole === 'student') {
    // Get enrolled sections
    const enrollments = await Enrollment.findAll({
      where: {
        studentId: userId,
        status: 'enrolled'
      },
      include: [
        {
          model: CourseSection,
          as: 'section',
          where: {
            semester,
            year
          },
          include: [
            { model: Course, as: 'course' },
            { model: Classroom, as: 'classroom' },
            { model: db.User, as: 'instructor', attributes: ['id', 'fullName'], required: false }
          ]
        }
      ]
    });
    sections = enrollments.map(e => e.section).filter(s => s != null);
  } else if (userRole === 'faculty' || userRole === 'admin') {
    // Get sections where user is instructor
    sections = await CourseSection.findAll({
      where: {
        instructorId: userId,
        semester,
        year
      },
      include: [
        { model: Course, as: 'course' },
        { model: Classroom, as: 'classroom' }
      ]
    });
  }

  // Format as weekly schedule
  const weeklySchedule = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: []
  };

  for (const section of sections) {
    if (!section.scheduleJson) continue;

    let scheduleJson = section.scheduleJson;
    if (typeof scheduleJson === 'string') {
      try {
        scheduleJson = JSON.parse(scheduleJson);
      } catch (e) {
        continue;
      }
    }

    if (Array.isArray(scheduleJson.scheduleItems)) {
      for (const item of scheduleJson.scheduleItems) {
        const day = item.day?.toLowerCase();
        if (day && weeklySchedule[day]) {
          weeklySchedule[day].push({
            sectionId: section.id,
            courseCode: section.course?.code,
            courseName: section.course?.name,
            sectionNumber: section.sectionNumber,
            startTime: item.startTime,
            endTime: item.endTime,
            classroom: section.classroom ? `${section.classroom.building} ${section.classroom.roomNumber}` : null,
            instructor: section.instructor?.fullName || 'TBA'
          });
        }
      }
    }
  }

  // Sort by start time for each day
  for (const day of Object.keys(weeklySchedule)) {
    weeklySchedule[day].sort((a, b) => {
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
  }

  return weeklySchedule;
}

module.exports = {
  generateSchedule,
  applySchedule,
  getMySchedule
};

