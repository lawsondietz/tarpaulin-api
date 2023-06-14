const { DataTypes } = require('sequelize')

const sequelize = require('../lib/sequelize')
const bcrypt = require('bcrypt')

const User = sequelize.define('user', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false, set(value) {
        this.setDataValue('password', bcrypt.hashSync(value, 8));
    } },
    role: { type: DataTypes.ENUM('admin', 'instructor', 'student'), allowNull: false }
})

exports.User = User

exports.UserClientFields = [
    'name',
    'email',
    'password',
    'role'
]