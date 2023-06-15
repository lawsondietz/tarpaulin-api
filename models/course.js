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


const CourseStudents = sequelize.define('coursestudents', {
    courseId: {
        type: DataTypes.INTEGER,
        references: {
            model: Course,
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id'
        }
    }
})
Course.belongsToMany(User, { through: CourseStudents })
User.belongsToMany(Course, { through: CourseStudents })


exports.CourseClientFields = [
    'subject',
    'number',
    'title',
    'term',
    'instructorId'
]