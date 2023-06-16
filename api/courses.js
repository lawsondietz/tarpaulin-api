const { Router } = require('express')
const { ValidationError } = require('sequelize')
const { Parser } = require('json2csv')

const { UserClientFields, User} = require('../models/user')
const { Course, CourseStudents, CourseClientFields } = require('../models/course')
const { requireAuthentication, getUserTokenInfo } = require('../lib/auth')
const { Assignment } = require('../models/assignment')
const { extractValidFields } = require('../lib/validation')

const router = Router()

//Returns a list of all courses
router.get('/', async function (req, res, next) {

    let page = parseInt(req.query.page) || 1
    page = page < 1 ? 1 : page
    const numPerPage = 10
    const offset = (page - 1) * numPerPage

    try {
        const result = await Course.findAndCountAll({
            attributes: {exclude: ['createdAt', 'updatedAt']},
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

    for (field in CourseClientFields) {
        if(!req.body.hasOwnProperty(CourseClientFields[field])){
            res.status(400).send({ error: "The request body contains an valid field" })
            return
        }
    }

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
            res.status(200).send({
                subject: course.subject,
                number: course.number,
                title: course.title,
                term: course.term,
                instructorId: course.instructorId
            })
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

    if (Object.keys(req.body).length === 0) {
        res.status(400).send({ error: "The request body is empty"})
        return
    }

    var check = false
    for (field in CourseClientFields) {
        if(req.body.hasOwnProperty(CourseClientFields[field])){
            check = true
        }
    }

    if(check == false) {
        res.status(400).send({ error: "The request body contains no valid fields" })
        return
    }


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
                 res.status(404).send({
                    error: "Course does not exist"
                })
            }
        } catch (e) {
            next(e)
        }
    } else {
        res.status(403).send({
            error: "Unauthorized to access the specified resource"
        })
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
    } else {
        res.status(403).send({
            error: "Unauthorized to access the specified resource"
        })
    }
})

//Returns a list of all students ID's currently enrolled in the specified course
//Access restricted to users with role 'admin' or an 'instructor' whose id 
// matches the one for the course
router.get('/:courseId/students', requireAuthentication, async function (req, res, next) {
    const courseId = req.params.courseId
    try {
        var course = await Course.findByPk(courseId)
        if (!course) {
            // 404 Course not found
            res.status(404).send({ error: `No course with id ${courseId} exists`})
            return
        }    
    } catch (err) {
        next(err)
    }

    if ((req.user.role == 'admin') || 
    (req.user.role == 'instructor' && req.user.id == course.instructorId)) {
        try {

            const coursestudents = await CourseStudents.findAll({
                where: { courseId: courseId }
            })
            var studentsFind = []
            for (let i = 0; i < coursestudents.length; i++) {
                studentsFind[i] = coursestudents[i].userId
            }
            const students = await User.findAll({
                where: { id: studentsFind },
                attributes: {exclude: ['password', 'createdAt', 'updatedAt']}
            }) 
            if (students) {
                res.status(200).send(students)
            } else {
                next()
            }
        } catch (e) {
            next(e)
        }
    } else {
        res.status(403).send({
            error: "Unauthorized to access the specified resource"
        })
    }
})

//Updates the course roster to either add or remove students
//Access restricted to users with role 'admin' or an 'instructor' whose id 
// matches the one for the course
router.post('/:courseId/students', requireAuthentication, async function (req, res, next) {
    const courseId = req.params.courseId

    try {
        var course = await Course.findByPk(courseId)
        if (!course) {
            // 404 Course not found
            res.status(404).send({ error: `No course with id ${courseId} exists`})
            return
        }    
    } catch (err) {
        next(err)
    }
    
    if ((req.user.role == 'admin') || 
    (req.user.role == 'instructor' && req.user.id == course.instructorId)) {
        console.log("req.body.add:", req.body.add)
        if (req.body.add != null || req.body.remove != null) {
            try {
                const course = await Course.findByPk(courseId)
                if (course) {
                    if (req.body.add.length > 0) {
                        for(const a of req.body.add) {
                            const student = await User.findByPk(a)
                            if (student.role == 'student'){
                                await course.addUser(parseInt(a))
                            }
                        }
                    }
                    if (req.body.remove.length > 0) {
                        for(const r of req.body.remove) {
                            const student = await User.findByPk(r)
                            if (student.role == 'student'){
                                await course.removeUser(parseInt(r))
                            }
                        }
                    }
                    res.status(200).send()
                } else {
                    res.status(404).send({
                        error: "Specified course does not exist"
                    })
                }
            } catch (e) {
                next(e)
            }
        }
    } else {
        res.status(403).send({
            error: "Unauthorized to access the specified resource"
        })
    }
})

//Returns a CSV file containing information about all students enrolled in course
//Access restricted to users with role 'admin' or 'instructor'
router.get('/:courseId/roster', requireAuthentication, async function (req, res, next) {
    const courseId = req.params.courseId

    try {
        var course = await Course.findByPk(courseId)
        if (!course) {
            // 404 Course not found
            res.status(404).send({ error: `No course with id ${courseId} exists`})
            return
        }    
    } catch (err) {
        next(err)
    }

    if ((req.user.role == 'admin') || 
    (req.user.role == 'instructor' && req.user.id == course.instructorId)) {
        try {
            const coursestudents = await CourseStudents.findAll({
                where: { courseId: courseId }
            })
            var studentsFind = []
            for (let i = 0; i < coursestudents.length; i++) {
                studentsFind[i] = coursestudents[i].userId
            }
            const students = await User.findAll({
                where: { id: studentsFind },
                attributes: {exclude: ['password', 'createdAt', 'updatedAt']}
            })
            if (students) {
                const fields = [{
                    label: 'ID',
                    value: 'id'
                }, {
                    label: 'Name',
                    value: 'name'
                }, {
                    label: 'Email',
                    value: 'email'
                }] 
                const json2csv = new Parser({ fields: fields })
                const csv = json2csv.parse(students)
                res.attachment('students.csv')
                res.status(200).send(csv)
            } else {
                next()
            }
        } catch (e) {
            next(e)
        }
    } else {
        res.status(403).send({
            error: "Unauthorized to access the specified resource"
        })
    }
})

//Returns a list of assignments in course
router.get('/:courseId/assignments', async function (req, res, next) {
    const courseId = req.params.courseId

    try {
        var course = await Course.findByPk(courseId)
        if (!course) {
            // 404 Course not found
            res.status(404).send({ error: `No course with id ${courseId} exists`})
            return
        }    
    } catch (err) {
        next(err)
    }

    try{
        const assignments = await Assignment.findAll({
            where: {courseId: courseId},
            attributes: { exclude: ['createdAt', 'updatedAt']}
        })
        res.status(200).send(assignments)
    } catch (e) {
        next(e)
    }
})


module.exports = router