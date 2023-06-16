const { Router } = require('express')

const { UserClientFields, User} = require('../models/user')
const { ValidationError } = require('sequelize')
const { generateAuthToken, requireAuthentication, roleAuthentication } = require('../lib/auth')
const { Course, CourseStudents, CourseClientFields } = require('../models/course')


const router = Router()
const bcrypt = require('bcrypt')

router.post('/', roleAuthentication, async function (req, res, next){

    for (field in UserClientFields) {
        if(!req.body.hasOwnProperty(UserClientFields[field])){
            res.status(400).send({ error: "The request body contains an valid field" })
            return
        }
    }

    try {
        if (((req.body.role == 'admin' || 'instructor') && req.user.role == 'admin') ||
        req.body.role == 'student' ) {
            const user = await User.create(req.body, UserClientFields)
            console.log(" --user:", user)
            res.status(201).send({ id: user.id })
        } else {
            res.status(403).send({
                error: "Invalid authentication permissions for request"
            })
        }
    } catch (e) {
        if (e instanceof ValidationError) {
            res.status(400).send({ error: e.message })
        } else {
            next(e)
        }
    }
})

router.post('/login', async function (req, res, next) {
    if (req.body && req.body.id && req.body.password) {
        try {
            const authUser = await User.findByPk(req.body.id)
            if (authUser) {
                const authPass = await bcrypt.compare(req.body.password, authUser.password)
                if (authPass) {
                    const token = generateAuthToken(authUser)
                    res.status(200).send({
                        token: token
                    })
                } else {
                    res.status(401).send({
                        error: "Invalid password entered"
                    })
                }
            } else {
                res.status(401).send({
                    error: "User does not exist"
                })
            }
        } catch (e) {
            next(e)
        }
    } else {
        res.status(400).send({
            error: "Request body missing required fields"
        })
    }
})

router.get('/:userId', requireAuthentication, async function (req, res, next) {
    if (req.user.id == req.params.userId) {
        try{
            const user = await User.findByPk(req.params.userId)
            if (user.role == 'student') {
                var courses = await CourseStudents.findAll({
                    where: { userId: req.params.userId },
                    attributes: {exclude: ['userId', 'createdAt', 'updatedAt']}
                })
                res.status(200).json({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    courses: courses
                })
            } else if (user.role == 'instructor') {
                const courses = await Course.findAll( 
                    { where: {instructorId: user.id},
                    attributes: ['id']})
                res.status(200).json({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    courses: courses
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

module.exports = router