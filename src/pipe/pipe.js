const { Sequelize,DataTypes } = require('sequelize');

const sequelize = new Sequelize('espider', 'root', '1234', {
    host: 'localhost',
    dialect: 'mysql',
});

const Recruit = sequelize.define("recruit", {
    companyName: DataTypes.STRING,
    logoUrl: DataTypes.STRING,
    companyAddress: DataTypes.STRING,
    employeeCount: DataTypes.STRING,
    industryName: DataTypes.STRING,
    position: DataTypes.STRING,
    businessType: DataTypes.STRING,
    lastPositionTime: DataTypes.STRING,
    positionNumber: DataTypes.STRING,
});
Recruit.sync()
module.exports = {
    Recruit
}
