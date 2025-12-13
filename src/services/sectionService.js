const db = require('../models');
const { CourseSection, Course, User, Classroom } = db;

const list = async (queryParams = {}) => {
  const { semester, year, instructorId, courseId } = queryParams;

  const where = {};
  if (semester) where.semester = semester;
  if (year) where.year = parseInt(year);
  if (instructorId) where.instructorId = parseInt(instructorId);
  if (courseId) where.courseId = parseInt(courseId);

  const sections = await CourseSection.findAll({
    where,
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
      },
      {
        model: Classroom,
        as: 'classroom',
        attributes: ['id', 'building', 'roomNumber', 'latitude', 'longitude']
      }
    ],
    order: [['year', 'DESC'], ['semester', 'ASC'], ['sectionNumber', 'ASC']]
  });

  return sections;
};

const getById = async (sectionId) => {
  const section = await CourseSection.findByPk(sectionId, {
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
      },
      {
        model: Classroom,
        as: 'classroom',
        attributes: ['id', 'building', 'roomNumber', 'latitude', 'longitude']
      }
    ]
  });

  if (!section) {
    throw new Error('Section not found');
  }

  return section;
};

const mySections = async (instructorId) => {
  const sections = await CourseSection.findAll({
    where: { instructorId: parseInt(instructorId) },
    // Don't specify attributes to get all fields including scheduleJson
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'code', 'name']
      }
    ],
    order: [['year', 'DESC'], ['semester', 'ASC']]
  });

  // Ensure scheduleJson is properly parsed
  return sections.map(section => {
    // Use toJSON() to get plain object, then get scheduleJson
    const sectionData = section.toJSON ? section.toJSON() : section;
    let scheduleJson = sectionData.scheduleJson;
    
    // If it's a string, try to parse it
    if (typeof scheduleJson === 'string') {
      try {
        scheduleJson = JSON.parse(scheduleJson);
      } catch (e) {
        scheduleJson = null;
      }
    }
    
    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log('Section schedule data:', {
        sectionId: sectionData.id,
        scheduleJson,
        scheduleJsonType: typeof scheduleJson,
        rawScheduleJson: sectionData.scheduleJson
      });
    }
    
    // Return section with parsed scheduleJson
    return {
      ...sectionData,
      scheduleJson
    };
  });
};

const create = async (sectionData) => {
  const { courseId, sectionNumber, semester, year, instructorId, capacity, scheduleJson, classroomId } = sectionData;

  const section = await CourseSection.create({
    courseId: parseInt(courseId),
    sectionNumber: parseInt(sectionNumber),
    semester,
    year: parseInt(year),
    instructorId: instructorId ? parseInt(instructorId) : null,
    capacity: capacity ? parseInt(capacity) : 30,
    scheduleJson: scheduleJson || null,
    classroomId: classroomId ? parseInt(classroomId) : null
  });

  return {
    message: 'Section created successfully',
    section
  };
};

const update = async (sectionId, sectionData) => {
  const section = await CourseSection.findByPk(sectionId);
  if (!section) {
    throw new Error('Section not found');
  }

  const { courseId, sectionNumber, semester, year, instructorId, capacity, scheduleJson, classroomId } = sectionData;

  await section.update({
    courseId: courseId ? parseInt(courseId) : section.courseId,
    sectionNumber: sectionNumber ? parseInt(sectionNumber) : section.sectionNumber,
    semester: semester || section.semester,
    year: year ? parseInt(year) : section.year,
    instructorId: instructorId !== undefined ? (instructorId ? parseInt(instructorId) : null) : section.instructorId,
    capacity: capacity ? parseInt(capacity) : section.capacity,
    scheduleJson: scheduleJson !== undefined ? scheduleJson : section.scheduleJson,
    classroomId: classroomId !== undefined ? (classroomId ? parseInt(classroomId) : null) : section.classroomId
  });

  return {
    message: 'Section updated successfully',
    section
  };
};

module.exports = {
  list,
  getById,
  mySections,
  create,
  update
};
