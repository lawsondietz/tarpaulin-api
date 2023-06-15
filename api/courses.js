const { Router } = require('express')
const { ValidationError } = require('sequelize')

const { Course, CourseClientFields } = require('../models/course')
const { requireAuthentication, getUserTokenInfo } = require('../lib/auth')

const router = Router()

//Returns a list of all courses
router.get('/', async function (req, res, next) {

    let page = parseInt(req.query.page) || 1
    page = pate < 1 ? 1 : page
    const numPerPage = 10
    const offset = (page - 1) * numPerPage

    try {
        const result = await Course.findAndCountAll({
            limit: numPerPage,
            offset: offset
        })

        const lastPage = Math.ceil(result.count / numPerPage)
        const links = {}
        if (page < lastPage) {
            links.nextPage = `/courses?page=${page + 1}`
            links.lastPage = `/courses?page=${lastPage}`
        }
        if (page > 1) {
            links.prevPage = `/courses?page=${page - 1}`
            links.firstPage = `/courses?page=1`
        }

        res.status(200).json({
            courses: result.rows,
            pageNumer: page,
            totalPages: lastPage,
            pageSize: numPerPage,
            totalCount: result.count,
            links: links
        })
    } catch (e) {
        next(e)
    }
})


//Creates a new course
//Access restricted to users with the role 'admin'
router.post('/', requireAuthentication, async function (req, res, next) {
    if (req.user.role == 'admin') {
        try {
            const course = await Course.create(req.body, CourseClientFields)
            res.status(201).send({ id: course.id })
        } catch (e) {
            if (e instanceof ValidationError) {
                res.status(400).send({ error: e.message })
            } else {
                next(e)
            }
        }
    } else {
        res.status(403).send({
            error: "Unauthorized access to the specified resource"
        })
    }
})

//Returns information about a specified course except for the students and assignments
router.get('/:courseId', async function (req, res, next) {
    const courseId = req.params.courseId
    try {
        const course = await Course.findByPk(courseId)
        if (course) {
            res.status(200).send(course)
        } else {
            next()
        }
    } catch (e) {
        next(e)
    }
})

//Updates information about a specified course
//Access restricted to users with role 'admin' or an 'instructor' whose id 
// matches the one for the course
router.patch('/:courseId', requireAuthentication, async function (req, res, next) {
    const courseId = req.params.courseId
    if ((req.user.role == 'admin') || 
    (req.user.role == 'instructor' && req.user.id == req.body.instructorId)) {
        try {
            const course = await Course.findByPk(courseId)
            if (course) {
                const result = await Course.update(req.body, {
                    where: { id: courseId},
                    fields: CourseClientFields
                })
                if (result[0] > 0) {
                    res.status(200).send()
                } else {
                    next()
                }
            } else {
                if (!course) {
                    res.status(404).send({
                        error: "Course does not exist"
                    })
                } else {
                    res.status(403).send({
                        error: "Unauthorized to access the specified resource"
                    })
                }
            }
        } catch (e) {
            next(e)
        }
    }
})


//Removes all data for a specified course
//Access restricted to users with the admin role
router.delete('/:courseId', requireAuthentication, async function (req, res, next) {
    const courseId = req.params.courseId
    if (req.user.role == 'admin') {
        try {
            const course = await Course.findByPk(courseId)
            if (course) {
                const result = await Course.destroy({ where: { id: courseId }})
                if (result > 0) {
                    res.status(204).send()
                } else {
                    next()
                }
            } else {
                res.status(404).send({
                        error: "Course does not exist"
                })
            }
        } catch (e) {
            next(e)
        }
    }
})

//Returns a list of all students ID's currently enrolled in the specified course
//Access restricted to users with role 'admin' or an 'instructor' whose id 
// matches the one for the course
router.get('/:courseId/students', requireAuthentication, async function (req, res, next) {
    const courseId = req.params.courseId
    if ((req.user.role == 'admin') || 
    (req.user.role == 'instructor' && req.user.id == req.body.instructorId)) {

    }
})

//Updates the course roster to either add or remove students
//Access restricted to users with role 'admin' or an 'instructor' whose id 
// matches the one for the course
router.post('/:courseId/students', requireAuthentication, async function (req, res, next) {
    const courseId = req.params.courseId
    if ((req.user.role == 'admin') || 
    (req.user.role == 'instructor' && req.user.id == req.body.instructorId)) {

    }
})

//Returns a CSV file containing information about all students enrolled in course
//Access restricted to users with role 'admin' or 'instructor'
router.get('/:courseId/roster', requireAuthentication, async function (req, res, next) {
    const courseId = req.params.courseId
    if ((req.user.role == 'admin') || 
    (req.user.role == 'instructor' && req.user.id == req.body.instructorId)) {

    }
})

//Returns a list of assignments in course
router.get('/:courseId/assignments', async function (req, res, next) {

})


module.exports = router