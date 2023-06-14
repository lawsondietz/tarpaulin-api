const { DataTypes } = require('sequelize')
const sequelize = require("../lib/sequelize.js")

const { Student } = require('./users')
const { Assignment } = require('./assignments')

const Submission = sequelize.define('submission', {
    assignmentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    studentId: { 
        type: DataTypes.INTEGER,
        allowNull: false
    },

    timestamp: { 
        type: DataTypes.STRING,
        // Generate timestamp in ISO 8601 format
        defaultValue: () => new Date().toISOString(),
        allowNull: true 
    },

    grade: { 
        type: DataTypes.FLOAT, 
        defaultValue: 0,
        allowNull: true 
    },

    file: { 
        type: DataTypes.STRING, 
        allowNull: false 
    }
})

exports.Submission = Submission

exports.SubmissionClientFields = [
    'assignmentId',
    'studentId',
    'file',
]
