const { DataTypes } = require('sequelize')
const sequelize = require("../lib/sequelize.js")

const { Submission } = require('./submission')


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

    onDelete: "CASCASE",
    onPatch: "CASCADE",
    foreignKey: { allowNull: false }
})
Submission.belongsTo(Assignment)


exports.Assignment = Assignment


exports.AssignmentClientFields = [
    'courseId',
    'title',
    'points',
    'due'
]
