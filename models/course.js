const { DataTypes } = require('sequelize')

const sequelize = require('../lib/sequelize')
const { User } = require('./user')
const { Assignment } = require('./assignment')

const Course = sequelize.define('course', {
    subject: { type: DataTypes.STRING, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    term: { type: DataTypes.STRING, allowNull: false},
    instructorId: { type: DataTypes.INTEGER, allowNull: false}
})

exports.Course = Course


//need to implement many to many relationship with users(students)
Course.hasMany(Assignment, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    foreignKey: { allowNull: false }
})
Assignment.belongsTo(Course)

Course.hasMany(User, {
    foreignKey: { allowNull: false }
})
User.belongsToMany(Course)


exports.CourseClientFields = [
    'subject',
    'number',
    'title',
    'term',
    'instructorId'
]