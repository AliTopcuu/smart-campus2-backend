'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class MealMenu extends Model {
        static associate(models) {
            MealMenu.belongsTo(models.Cafeteria, {
                foreignKey: 'cafeteriaId',
                as: 'cafeteria',
            });
            MealMenu.hasMany(models.MealReservation, {
                foreignKey: 'menuId',
                as: 'reservations',
            });
        }
    }
    MealMenu.init(
        {
            cafeteriaId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            mealType: {
                type: DataTypes.ENUM('LUNCH', 'DINNER'),
                allowNull: false,
            },
            itemsJson: {
                type: DataTypes.JSONB,
                defaultValue: [],
            },
            nutritionJson: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
            isPublished: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
        },
        {
            sequelize,
            modelName: 'MealMenu',
            tableName: 'MealMenus'
        }
    );
    return MealMenu;
};
