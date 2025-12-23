'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ClassroomReservation extends Model {
    static associate(models) {
      ClassroomReservation.belongsTo(models.Classroom, { foreignKey: 'classroomId', as: 'classroom' });
      ClassroomReservation.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      ClassroomReservation.belongsTo(models.User, { foreignKey: 'approvedBy', as: 'approver' });
    }
  }
  ClassroomReservation.init({
    classroomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Classrooms',
        key: 'id'
      }
    },
    userId: {
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
      allowNull: false
    },
    purpose: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ClassroomReservation',
    tableName: 'ClassroomReservations',
    indexes: [
      {
        fields: ['classroomId', 'date', 'startTime', 'endTime']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      }
    ]
  });
  return ClassroomReservation;
};

