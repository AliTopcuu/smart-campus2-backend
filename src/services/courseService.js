const db = require('../models');
const { Course, Department, CoursePrerequisite, CourseSection } = db;

const list = async (queryParams = {}) => {
  const { search, department, page = 1, limit = 50 } = queryParams;
  const offset = (page - 1) * limit;

  const where = {};
  if (search) {
    where[db.Sequelize.Op.or] = [
      { code: { [db.Sequelize.Op.iLike]: `%${search}%` } },
      { name: { [db.Sequelize.Op.iLike]: `%${search}%` } }
    ];
  }
  if (department) {
    where.departmentId = department;
  }

  const courses = await Course.findAndCountAll({
    where,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code']
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['code', 'ASC']]
  });

  // Frontend expects array, so return courses.rows directly
  return courses.rows;
};

const getById = async (courseId) => {
  const course = await Course.findByPk(courseId, {
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code']
      },
      {
        model: CoursePrerequisite,
        as: 'prerequisites',
        include: [
          {
            model: Course,
            as: 'prerequisite',
            attributes: ['id', 'code', 'name']
          }
        ]
      },
      {
        model: CourseSection,
        as: 'sections',
        // Don't specify attributes to get all fields including scheduleJson
        include: [
          {
            model: db.User,
            as: 'instructor',
            attributes: ['id', 'fullName', 'email']
          }
        ]
      }
    ]
  });

  if (!course) {
    throw new Error('Course not found');
  }

  return course;
};

const create = async (courseData) => {
  const { code, name, description, credits, ects, syllabusUrl, departmentId } = courseData;

  const course = await Course.create({
    code,
    name,
    description,
    credits: parseInt(credits),
    ects: parseInt(ects),
    syllabusUrl,
    departmentId: parseInt(departmentId)
  });

  return {
    message: 'Course created successfully',
    course
  };
};

const update = async (courseId, courseData) => {
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  const { code, name, description, credits, ects, syllabusUrl, departmentId } = courseData;

  await course.update({
    code: code || course.code,
    name: name || course.name,
    description: description !== undefined ? description : course.description,
    credits: credits ? parseInt(credits) : course.credits,
    ects: ects ? parseInt(ects) : course.ects,
    syllabusUrl: syllabusUrl !== undefined ? syllabusUrl : course.syllabusUrl,
    departmentId: departmentId ? parseInt(departmentId) : course.departmentId
  });

  return {
    message: 'Course updated successfully',
    course
  };
};

const remove = async (courseId) => {
  const course = await Course.findByPk(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  await course.destroy();

  return {
    message: 'Course deleted successfully'
  };
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove
};
