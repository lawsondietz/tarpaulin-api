const { DataTypes } = require('sequelize')
const sequelize = require("../lib/sequelize.js")

const { Student } = require('./users')

const Submission = sequelize.define('submission', {
    studentId: { 
        type: DataTypes.INTEGER,
        allowNull: false
    },

    grade: { 
        type: DataTypes.FLOAT, 
        defaultValue: 0,
        allowNull: true 
    },

    submissionTimestamp: { 
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false 
    },

    file: { 
        type: DataTypes.STRING, 
        allowNull: false 
    }
})


exports.Submission = Submission

exports.SubmissionClientFields = [
    'studentId',
    'file',
]
