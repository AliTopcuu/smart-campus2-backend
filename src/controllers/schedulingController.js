const schedulingService = require('../services/schedulingService');
const { ValidationError } = require('../utils/errors');

/**
 * Generate automatic schedule using CSP algorithm
 */
exports.generateSchedule = async (req, res, next) => {
  try {
    const { sectionIds, semester, year } = req.body;

    if (!sectionIds || !Array.isArray(sectionIds) || sectionIds.length === 0) {
      throw new ValidationError('sectionIds array is required');
    }

    if (!semester || !year) {
      throw new ValidationError('semester and year are required');
    }

    const scheduleData = await schedulingService.generateSchedule(sectionIds, semester, year);
    res.json(scheduleData);
  } catch (error) {
    console.error('Generate schedule error:', error);
    next(error);
  }
};

/**
 * Apply generated schedule to sections
 */
exports.applySchedule = async (req, res, next) => {
  try {
    const scheduleData = req.body;

    if (!scheduleData || !scheduleData.scheduleItems) {
      throw new ValidationError('Invalid schedule data');
    }

    const result = await schedulingService.applySchedule(scheduleData);
    res.json(result);
  } catch (error) {
    console.error('Apply schedule error:', error);
    next(error);
  }
};

/**
 * Get user's schedule
 */
exports.getMySchedule = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { semester, year } = req.query;

    if (!semester || !year) {
      throw new ValidationError('semester and year query parameters are required');
    }

    const schedule = await schedulingService.getMySchedule(userId, userRole, semester, year);
    res.json(schedule);
  } catch (error) {
    console.error('Get my schedule error:', error);
    next(error);
  }
};

/**
 * Export schedule as iCal file
 */
exports.exportICal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { semester, year } = req.query;

    if (!semester || !year) {
      throw new ValidationError('semester and year query parameters are required');
    }

    const schedule = await schedulingService.getMySchedule(userId, userRole, semester, year);

    // Generate iCal content manually (since ical-generator may not be installed)
    let icalContent = 'BEGIN:VCALENDAR\r\n';
    icalContent += 'VERSION:2.0\r\n';
    icalContent += 'PRODID:-//Smart Campus//Schedule//EN\r\n';
    icalContent += 'CALSCALE:GREGORIAN\r\n';
    icalContent += 'METHOD:PUBLISH\r\n';
    icalContent += 'X-WR-CALNAME:Smart Campus Schedule\r\n';

    // Get semester start and end dates (approximate)
    const yearNum = parseInt(year);
    const semesterStart = semester.toLowerCase().includes('fall') 
      ? new Date(yearNum, 8, 1) // September
      : new Date(yearNum, 1, 1); // February
    const semesterEnd = semester.toLowerCase().includes('fall')
      ? new Date(yearNum, 11, 31) // December
      : new Date(yearNum, 5, 30); // June

    // Add events for each scheduled class
    for (const [day, classes] of Object.entries(schedule)) {
      for (const classItem of classes) {
        // Find first occurrence of this day in semester
        const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].indexOf(day);
        if (dayIndex === -1) continue;

        // Find first Monday of semester
        const firstMonday = new Date(semesterStart);
        const dayOfWeek = firstMonday.getDay();
        const diff = dayIndex - (dayOfWeek === 0 ? 7 : dayOfWeek) + 1;
        firstMonday.setDate(firstMonday.getDate() + diff);

        // Create recurring event for each week
        const [startHour, startMinute] = classItem.startTime.split(':').map(Number);
        const [endHour, endMinute] = classItem.endTime.split(':').map(Number);

        const startDate = new Date(firstMonday);
        startDate.setHours(startHour, startMinute, 0, 0);

        const endDate = new Date(firstMonday);
        endDate.setHours(endHour, endMinute, 0, 0);

        // Format dates for iCal (YYYYMMDDTHHMMSSZ)
        const formatICalDate = (date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        // Create recurring event
        icalContent += 'BEGIN:VEVENT\r\n';
        icalContent += `DTSTART:${formatICalDate(startDate)}\r\n`;
        icalContent += `DTEND:${formatICalDate(endDate)}\r\n`;
        icalContent += `RRULE:FREQ=WEEKLY;UNTIL=${formatICalDate(semesterEnd)}\r\n`;
        icalContent += `SUMMARY:${classItem.courseCode} - Section ${classItem.sectionNumber}\r\n`;
        icalContent += `DESCRIPTION:${classItem.courseName}\\nInstructor: ${classItem.instructor}\\nClassroom: ${classItem.classroom || 'TBA'}\r\n`;
        icalContent += `LOCATION:${classItem.classroom || 'TBA'}\r\n`;
        icalContent += `UID:${classItem.sectionId}-${day}-${startDate.getTime()}@smartcampus\r\n`;
        icalContent += 'END:VEVENT\r\n';
      }
    }

    icalContent += 'END:VCALENDAR\r\n';

    // Set response headers
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="schedule-${semester}-${year}.ics"`);

    // Send iCal content
    res.send(icalContent);
  } catch (error) {
    console.error('Export iCal error:', error);
    next(error);
  }
};

