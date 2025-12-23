'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasOne(models.Student, { foreignKey: 'userId' });
      User.hasOne(models.Faculty, { foreignKey: 'userId' });
      User.hasOne(models.Wallet, { foreignKey: 'userId', as: 'wallet' });
      User.hasMany(models.MealReservation, { foreignKey: 'userId', as: 'mealReservations' });
      User.hasMany(models.ClassroomReservation, { foreignKey: 'userId', as: 'classroomReservations' });
      User.hasMany(models.ClassroomReservation, { foreignKey: 'approvedBy', as: 'approvedReservations' });
    }
  }
  User.init({
    fullName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending'
    },
    verificationToken: {
      type: DataTypes.STRING
    },
    verificationExpires: {
      type: DataTypes.DATE
    },
    resetToken: {
      type: DataTypes.STRING
    },
    resetExpires: {
      type: DataTypes.DATE
    },
    phone: {
      type: DataTypes.STRING
    },
    profilePictureUrl: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};