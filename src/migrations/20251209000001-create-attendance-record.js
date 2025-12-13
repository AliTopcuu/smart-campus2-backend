'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AttendanceRecords', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sessionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'AttendanceSessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      checkInLat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      checkInLng: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      distance: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      isWithinGeofence: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      checkedInAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
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

    await queryInterface.addIndex('AttendanceRecords', ['sessionId']);
    await queryInterface.addIndex('AttendanceRecords', ['studentId']);
    await queryInterface.addIndex('AttendanceRecords', ['sessionId', 'studentId'], {
      unique: true,
      name: 'unique_student_session'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AttendanceRecords');
  }
};

