'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CourseSections', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      courseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Courses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sectionNumber: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      semester: {
        type: Sequelize.STRING,
        allowNull: false
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      instructorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      enrolledCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      scheduleJson: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      classroomId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Classrooms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
    await queryInterface.addIndex('CourseSections', ['courseId', 'sectionNumber', 'semester', 'year'], {
      unique: true,
      name: 'unique_section'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CourseSections');
  }
};
