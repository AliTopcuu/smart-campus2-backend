'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class MealReservation extends Model {
        static associate(models) {
            MealReservation.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user',
            });
            MealReservation.belongsTo(models.MealMenu, {
                foreignKey: 'menuId',
                as: 'menu',
            });
            MealReservation.belongsTo(models.Cafeteria, {
                foreignKey: 'cafeteriaId',
                as: 'cafeteria',
            });
        }
    }
    MealReservation.init(
        {
            userId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            menuId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            cafeteriaId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            mealType: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            amount: {
                type: DataTypes.DECIMAL(10, 2),
                defaultValue: 0.0,
            },
            qrCode: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            status: {
                type: DataTypes.ENUM('RESERVED', 'USED', 'CANCELLED'),
                defaultValue: 'RESERVED',
            },
            usedAt: {
                type: DataTypes.DATE,
            },
        },
        {
            sequelize,
            modelName: 'MealReservation',
            tableName: 'MealReservations'
        }
    );
    return MealReservation;
};
