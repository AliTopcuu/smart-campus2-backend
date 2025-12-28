'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Faculty extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Faculty.belongsTo(models.User, { foreignKey: 'userId', onDelete: 'CASCADE' });
      Faculty.belongsTo(models.Department, { foreignKey: 'departmentId' });
    }
  }
  Faculty.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    employeeNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    departmentId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Faculty',
  });
  return Faculty;
};