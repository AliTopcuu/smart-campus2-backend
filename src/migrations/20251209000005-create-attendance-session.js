'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'AttendanceSessions';
    const tableExists = await queryInterface.tableExists(tableName);

    if (!tableExists) {
      await queryInterface.createTable(tableName, {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
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
        instructorId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        startTime: {
          type: Sequelize.TIME,
          allowNull: false
        },
        endTime: {
          type: Sequelize.TIME,
          allowNull: true
        },
        latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: false
        },
        longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: false
        },
        geofenceRadius: {
          type: Sequelize.DECIMAL(8, 2),
          allowNull: false,
          defaultValue: 15.0
        },
        qrCode: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        status: {
          type: Sequelize.ENUM('active', 'closed', 'cancelled'),
          allowNull: false,
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
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AttendanceSessions');
  }
};