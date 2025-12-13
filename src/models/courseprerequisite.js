'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CoursePrerequisite extends Model {
    static associate(models) {
      CoursePrerequisite.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
      CoursePrerequisite.belongsTo(models.Course, { foreignKey: 'prerequisiteCourseId', as: 'prerequisite' });
    }
  }
  CoursePrerequisite.init({
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Courses',
        key: 'id'
      }
    },
    prerequisiteCourseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Courses',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'CoursePrerequisite',
    indexes: [
      {
        unique: true,
        fields: ['courseId', 'prerequisiteCourseId']
      }
    ]
  });
  return CoursePrerequisite;
};
