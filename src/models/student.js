'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Student extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Student.belongsTo(models.User, { foreignKey: 'userId' });
      Student.belongsTo(models.Department, { foreignKey: 'departmentId' });
    }
  }
  Student.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    studentNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    gpa: DataTypes.DECIMAL,
    cgpa: DataTypes.DECIMAL
  }, {
    sequelize,
    modelName: 'Student',
  });
  return Student;
};