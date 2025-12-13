'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CourseSection extends Model {
    static associate(models) {
      CourseSection.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
      CourseSection.belongsTo(models.User, { foreignKey: 'instructorId', as: 'instructor' });
      CourseSection.belongsTo(models.Classroom, { foreignKey: 'classroomId', as: 'classroom' });
      CourseSection.hasMany(models.Enrollment, { foreignKey: 'sectionId', as: 'enrollments' });
      CourseSection.hasMany(models.AttendanceSession, { foreignKey: 'sectionId', as: 'attendanceSessions' });
    }
  }
  CourseSection.init({
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Courses',
        key: 'id'
      }
    },
    sectionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    semester: {
      type: DataTypes.STRING,
      allowNull: false
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    instructorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    enrolledCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'enrolledCount' // Match the column name in migration
    },
    scheduleJson: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    classroomId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Classrooms',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'CourseSection',
    indexes: [
      {
        unique: true,
        fields: ['courseId', 'sectionNumber', 'semester', 'year']
      }
    ]
  });
  return CourseSection;
};
