const { DataTypes } = require('sequelize')
const sequelize = require("../lib/sequelize.js")

const { Submission } = require('./submissions')
const { Course } = require('./courses')

const Assignment = sequelize.define('assignment', {
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    title: {
        type: DataTypes.STRING,
        allowNull: false
    },

    points: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    due: {
        type: DataTypes.STRING,
        allowNull: false
    }
})

// Create submission relationship and handle delete and patch requests
Assignment.hasMany(Submission, { 
    foreignKey: 'assignmentId',
    onDelete: 'CASCASE',
    onPatch: 'CASCADE'
})
Submission.belongsTo(Assignment)

exports.Assignment = Assignment

exports.AssignmentClientFields = [
    'courseId',
    'title',
    'points',
    'due'
]
