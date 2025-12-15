'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'AttendanceRecords';
    const tableExists = await queryInterface.tableExists(tableName);

    if (!tableExists) {
      await queryInterface.createTable(tableName, {
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
        checkInTime: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true
        },
        longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true
        },
        distanceFromCenter: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        isFlagged: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        flagReason: {
          type: Sequelize.TEXT,
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

      // İndeksleri tablonun yeni oluşturulduğu durumda ekle
      // (Eğer tablo zaten varsa indeksler de vardır varsayıyoruz)
      try {
        await queryInterface.addIndex('AttendanceRecords', ['sessionId', 'studentId'], {
          unique: true,
          name: 'unique_attendance_record'
        });
      } catch (e) { console.log('Index already exists, skipping...'); }
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AttendanceRecords');
  }
};