'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Enrollments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sectionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'CourseSections',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('enrolled', 'dropped', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'enrolled'
      },
      enrollmentDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      midtermGrade: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      finalGrade: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      letterGrade: {
        type: Sequelize.STRING,
        allowNull: true
      },
      gradePoint: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });
    await queryInterface.addIndex('Enrollments', ['studentId', 'sectionId'], {
      unique: true,
      name: 'unique_enrollment'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Enrollments');
  }
};
