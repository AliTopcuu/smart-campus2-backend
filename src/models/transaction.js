'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Transaction extends Model {
        static associate(models) {
            Transaction.belongsTo(models.Wallet, {
                foreignKey: 'walletId',
                as: 'wallet',
            });
        }
    }
    Transaction.init(
        {
            walletId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            type: {
                type: DataTypes.ENUM('CREDIT', 'DEBIT'),
                allowNull: false,
            },
            amount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
            },
            balanceAfter: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
            },
            referenceType: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            referenceId: {
                type: DataTypes.STRING,
            },
            description: {
                type: DataTypes.STRING,
            },
        },
        {
            sequelize,
            modelName: 'Transaction',
            tableName: 'Transactions'
        }
    );
    return Transaction;
};
