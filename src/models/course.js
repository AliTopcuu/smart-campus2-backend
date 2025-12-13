'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      Course.belongsTo(models.Department, { foreignKey: 'departmentId', as: 'department' });
      Course.hasMany(models.CoursePrerequisite, { foreignKey: 'courseId', as: 'prerequisites' });
      Course.hasMany(models.CoursePrerequisite, { foreignKey: 'prerequisiteCourseId', as: 'requiredBy' });
      Course.hasMany(models.CourseSection, { foreignKey: 'courseId', as: 'sections' });
    }
  }
  Course.init({
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    credits: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ects: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    syllabusUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Departments',
        key: 'id'
      }
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Course',
    paranoid: true,
    deletedAt: 'deletedAt'
  });
  return Course;
};
