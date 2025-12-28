'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AttendanceRecord extends Model {
    static associate(models) {
      AttendanceRecord.belongsTo(models.AttendanceSession, { foreignKey: 'sessionId', as: 'session' });
      AttendanceRecord.belongsTo(models.User, { foreignKey: 'studentId', as: 'student', onDelete: 'CASCADE' });
    }
  }
  AttendanceRecord.init({
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'AttendanceSessions',
        key: 'id'
      }
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    distanceFromCenter: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    isFlagged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    flagReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AttendanceRecord',
    indexes: [
      {
        unique: true,
        fields: ['sessionId', 'studentId']
      }
    ]
  });
  return AttendanceRecord;
};
