const { Router } = require('express')

const { UserClientFields, User} = require('../models/user')
const { ValidationError } = require('sequelize')
const { generateAuthToken, requireAuthentication } = require('../lib/auth')

const router = Router()
const bcrypt = require('bcrypt')

router.post('/', /*isUserAdmin,*/ async function (req,res,next){

})

router.post('/login', async function (req, res, next) {

})

router.get('/:userId', requireAuthentication, async function (req, res, next) {
    if (req.user == req.params.userId) {
        try{
            const user = await User.findByPk(req.params.userId)
            if (user.role == 'student') {
                res.status(200).json({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                    //implement many to many to display courses they are in
                })
            } else if (user.role == 'instructor') {
                res.status(200).json({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                    //implement many to many to display courses taught
                })
            } else {
                res.status(200).json({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                })
            }
        } catch(e) {
            next(e)
        }
    } else {
        res.status(403).send({
            error: "Unauthorized to access the specified resource"
        })
    }
})