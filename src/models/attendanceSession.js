'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AttendanceSession extends Model {
    static associate(models) {
      AttendanceSession.belongsTo(models.CourseSection, { foreignKey: 'sectionId', as: 'section' });
      AttendanceSession.belongsTo(models.User, { foreignKey: 'instructorId', as: 'instructor' });
      AttendanceSession.hasMany(models.AttendanceRecord, { foreignKey: 'sessionId', as: 'records' });
      AttendanceSession.hasMany(models.ExcuseRequest, { foreignKey: 'sessionId', as: 'excuseRequests' });
    }
  }
  AttendanceSession.init({
    sectionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'CourseSections',
        key: 'id'
      }
    },
    instructorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    geofenceRadius: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 15.0
    },
    qrCode: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('active', 'closed', 'cancelled'),
      allowNull: false,
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'AttendanceSession',
  });
  return AttendanceSession;
};
