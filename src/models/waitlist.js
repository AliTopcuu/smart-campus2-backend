'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Waitlist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Waitlist.belongsTo(models.User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
      Waitlist.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
    }
  }
  Waitlist.init({
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
    requestDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Waitlist',
  });
  return Waitlist;
};

