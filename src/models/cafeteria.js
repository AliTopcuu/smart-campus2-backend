'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Cafeteria extends Model {
        static associate(models) {
            Cafeteria.hasMany(models.MealMenu, {
                foreignKey: 'cafeteriaId',
                as: 'menus',
            });
            Cafeteria.hasMany(models.MealReservation, {
                foreignKey: 'cafeteriaId',
                as: 'reservations',
            });
        }
    }
    Cafeteria.init(
        {
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            location: {
                type: DataTypes.STRING,
            },
            capacity: {
                type: DataTypes.INTEGER,
            },
        },
        {
            sequelize,
            modelName: 'Cafeteria',
            tableName: 'Cafeterias'
        }
    );
    return Cafeteria;
};
