'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Wallet extends Model {
        static associate(models) {
            Wallet.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user',
            });
            Wallet.hasMany(models.Transaction, {
                foreignKey: 'walletId',
                as: 'transactions',
            });
        }
    }
    Wallet.init(
        {
            userId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                unique: true,
            },
            balance: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                defaultValue: 0.0,
            },
            currency: {
                type: DataTypes.STRING(3),
                allowNull: false,
                defaultValue: 'TRY',
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
        },
        {
            sequelize,
            modelName: 'Wallet',
            tableName: 'Wallets'
        }
    );
    return Wallet;
};
