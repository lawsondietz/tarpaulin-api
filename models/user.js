const { DataTypes } = require('sequelize')

const sequelize = require('../lib/sequelize')
const bcrypt = require('bcrypt')

const User = sequelize.define('user', {
    name: {},
    email {},
    password {},
    role {}
})