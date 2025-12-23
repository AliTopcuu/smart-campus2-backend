const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();
const config = require('../config/config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = (config && config[env]) || {};
const connectionUrl = dbConfig.url || process.env.DATABASE_URL;

if (!connectionUrl) {
  throw new Error(`Database configuration missing for environment: ${env}`);
}

const sequelize = new Sequelize(connectionUrl, {
  ...dbConfig,
  logging: dbConfig.logging ?? false,
});

const db = {};

db.User = require('./user')(sequelize, DataTypes);
db.Student = require('./student')(sequelize, DataTypes);
db.Faculty = require('./faculty')(sequelize, DataTypes);
db.Department = require('./department')(sequelize, DataTypes);
db.Course = require('./course')(sequelize, DataTypes);
db.CoursePrerequisite = require('./courseprerequisite')(sequelize, DataTypes);
db.Classroom = require('./classroom')(sequelize, DataTypes);
db.CourseSection = require('./coursesection')(sequelize, DataTypes);
db.Enrollment = require('./enrollment')(sequelize, DataTypes);
db.AttendanceSession = require('./attendancesession')(sequelize, DataTypes);
db.AttendanceRecord = require('./attendancerecord')(sequelize, DataTypes);
db.ExcuseRequest = require('./excuserequest')(sequelize, DataTypes);
db.Cafeteria = require('./cafeteria')(sequelize, DataTypes);
db.MealMenu = require('./mealmenu')(sequelize, DataTypes);
db.Wallet = require('./wallet')(sequelize, DataTypes);
db.Transaction = require('./transaction')(sequelize, DataTypes);
db.MealReservation = require('./mealreservation')(sequelize, DataTypes);
db.Event = require('./event')(sequelize, DataTypes);
db.EventRegistration = require('./eventregistration')(sequelize, DataTypes);
db.Waitlist = require('./waitlist')(sequelize, DataTypes);
db.EventSurvey = require('./eventsurvey')(sequelize, DataTypes);
db.ClassroomReservation = require('./classroomreservation')(sequelize, DataTypes);

Object.values(db).forEach((model) => {
  if (model.associate) {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

