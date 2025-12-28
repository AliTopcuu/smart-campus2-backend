'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class EventRegistration extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      EventRegistration.belongsTo(models.User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
      EventRegistration.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
    }
  }
  EventRegistration.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Events',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('registered', 'checked-in', 'cancelled'),
      allowNull: false,
      defaultValue: 'registered'
    },
    qrCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'qrCode' // Explicitly map to qrCode column
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'checkedInAt' // Map to existing checkedInAt column in database
    }
  }, {
    sequelize,
    modelName: 'EventRegistration',
    tableName: 'EventRegistrations',
    underscored: false,
    timestamps: true
  });
  return EventRegistration;
};

