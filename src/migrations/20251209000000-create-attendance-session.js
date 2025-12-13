'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AttendanceSessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      sectionId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      sectionName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      locationLat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      locationLng: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      geofenceRadius: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 250
      },
      startTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      endTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('active', 'closed', 'expired'),
        defaultValue: 'active'
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

    await queryInterface.addIndex('AttendanceSessions', ['code']);
    await queryInterface.addIndex('AttendanceSessions', ['createdBy']);
    await queryInterface.addIndex('AttendanceSessions', ['status']);
    await queryInterface.addIndex('AttendanceSessions', ['startTime', 'endTime']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AttendanceSessions');
  }
};

