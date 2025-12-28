'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Enrollment extends Model {
    static associate(models) {
      Enrollment.belongsTo(models.User, { foreignKey: 'studentId', as: 'student', onDelete: 'CASCADE' });
      Enrollment.belongsTo(models.CourseSection, { foreignKey: 'sectionId', as: 'section' });
    }
  }
  Enrollment.init({
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    sectionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'CourseSections',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'enrolled', 'dropped', 'completed', 'failed', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    enrollmentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    midtermGrade: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    finalGrade: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    letterGrade: {
      type: DataTypes.STRING,
      allowNull: true
    },
    gradePoint: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Enrollment',
    indexes: [
      {
        unique: true,
        fields: ['studentId', 'sectionId']
      }
    ]
  });
  return Enrollment;
};
