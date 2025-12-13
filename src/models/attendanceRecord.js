'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AttendanceRecord extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      AttendanceRecord.belongsTo(models.AttendanceSession, { foreignKey: 'sessionId', as: 'session' });
      AttendanceRecord.belongsTo(models.User, { foreignKey: 'studentId', as: 'student' });
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
    checkInLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      comment: 'Student check-in latitude'
    },
    checkInLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      comment: 'Student check-in longitude'
    },
    distance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Distance from classroom in meters'
    },
    isWithinGeofence: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    checkedInAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'AttendanceRecord',
    tableName: 'AttendanceRecords',
    indexes: [
      { fields: ['sessionId'] },
      { fields: ['studentId'] },
      { unique: true, fields: ['sessionId', 'studentId'], name: 'unique_student_session' }
    ]
  });
  return AttendanceRecord;
};

