'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ExcuseRequest extends Model {
    static associate(models) {
      ExcuseRequest.belongsTo(models.User, { foreignKey: 'studentId', as: 'student' });
      ExcuseRequest.belongsTo(models.AttendanceSession, { foreignKey: 'sessionId', as: 'session' });
      ExcuseRequest.belongsTo(models.User, { foreignKey: 'reviewedBy', as: 'reviewer' });
    }
  }
  ExcuseRequest.init({
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'AttendanceSessions',
        key: 'id'
      }
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    documentUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ExcuseRequest',
  });
  return ExcuseRequest;
};
