'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AttendanceSession extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      AttendanceSession.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      AttendanceSession.hasMany(models.AttendanceRecord, { foreignKey: 'sessionId', as: 'records' });
    }
  }
  AttendanceSession.init({
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    sectionId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Section ID or course identifier'
    },
    sectionName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Section name for display'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    locationLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      comment: 'Latitude of the classroom location'
    },
    locationLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      comment: 'Longitude of the classroom location'
    },
    geofenceRadius: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 250,
      comment: 'Allowed radius in meters'
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'closed', 'expired'),
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'AttendanceSession',
    tableName: 'AttendanceSessions',
    indexes: [
      { fields: ['code'] },
      { fields: ['createdBy'] },
      { fields: ['status'] },
      { fields: ['startTime', 'endTime'] }
    ]
  });
  return AttendanceSession;
};

