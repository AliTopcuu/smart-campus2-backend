'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Classroom extends Model {
    static associate(models) {
      Classroom.hasMany(models.CourseSection, { foreignKey: 'classroomId', as: 'sections' });
    }
  }
  Classroom.init({
    building: {
      type: DataTypes.STRING,
      allowNull: false
    },
    roomNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    featuresJson: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Classroom',
    indexes: [
      {
        unique: true,
        fields: ['building', 'roomNumber']
      }
    ]
  });
  return Classroom;
};
