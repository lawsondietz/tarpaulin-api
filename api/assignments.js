
const { Router } = require('express')
const fs = require('node:fs')
const crypto = require("node:crypto")
const multer = require('multer')
const express = require('express')

const { User } = require('../models/user')
const { Course, CourseStudents } = require('../models/course')
const { Assignment, AssignmentClientFields } = require('../models/assignment')
const { Submission, SubmissionClientFields } = require('../models/submission')

const { validateAgainstSchema, extractValidFields } = require('../lib/validation')
const { generateAuthToken, requireAuthentication } = require('../lib/auth')
const { ValidationError } = require('sequelize')

const router = Router()


const fileTypes = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/pdf": "pdf",
    "application/json": "json",
    "text/markdown": "md",
    "application/zip": "zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx",
    "text/plain":"txt",
    "text/html":"html"
}

const upload = multer({
    storage: multer.diskStorage({
        destination: `uploads`,
        filename: (req, file, callback) => {
            const filename = crypto.pseudoRandomBytes(16).toString("hex")
            const extension = fileTypes[file.mimetype]
            callback(null, `${filename}.${extension}`)
        }
    }),
    fileFilter: (req, file, callback) => {
        callback(null, !!fileTypes[file.mimetype])
    }
})

router.use("/uploads", express.static("uploads/"))

/*

Create and store a new Assignment with specified data and adds it to the application's database. 
Only an authenticated User with 'admin' role or an authenticated 'instructor' User whose ID matches 
the instructorId of the Course corresponding to the Assignment's courseId can create an Assignment.

*/
router.post('/', requireAuthentication, async function (req, res, next) {

    

    try {

        var course = await Course.findByPk(req.body.courseId)

        if (!course) {

            // 404 Course not found
            res.status(404).send({ error: `No course with id ${req.body.courseId} exists`})
            return
    
        }    

    } catch (err) {

        next(err)

    }

    // Authenticate by admin and instructor with matching instructor id 
    if (req.user.role == 'admin' || (req.user.role == "instructor" && req.user.id == course.instructorId)) {

        try {

            // 201 Assignment successfully created
            const assignment = await Assignment.create(req.body, AssignmentClientFields)
            res.status(201).send({ id: assignment.id})
    
        } catch (err) {
    
            // 400 The request body was either not present or did not contain a valid Assignment object.
            if (err instanceof ValidationError) {

                res.status(400).send({ error: err.message })

            } else {

                next(err)

            }
    
        }
    } else {
        
        // 403 The request was not made by an authenticated User satisfying the authorization criteria described above.
        res.status(403).send({ error: "Unauthorized access to the specified resource"})

    }
})

/*

Create and store a new Submission for an Assignment with specified data and adds it to the application's database. 
Only an authenticated User with 'student' role who is enrolled in the Course corresponding to the Assignment's courseId can create a Submission.

*/
router.post('/:id/submissions', upload.single("file"), requireAuthentication, async function (req, res, next) {

    // Store assignment id
    const id = req.params.id

    if (Object.keys(req.body).length === 0) {
        res.status(400).send({ error: "The request body is empty"})
        return
    }

    var checkAssignmentId = false
    var checkStudentId = false
    for (key in req.body) {
        if(key == 'assignmentId'){
            checkAssignmentId = true
        }
        if(key == 'studentId'){
            checkStudentId = true
        }
    }
    
    if(!checkAssignmentId || !checkStudentId) {
        res.status(400).send({ error: "The request contains invalid information" })
        return
    }


    if (!req.file) {
        res.status(400).send({ error: "The request body is missing a file" })
        return
    }

    if (req.body.studentId != req.user.id) {
        res.status(403).send({ error: "The user token does not match the user in the request"})
        return
    }

    if (req.body.assignmentId != id) {
        res.status(400).send({ error: "The url id does not match the form id"})
        return
    }

    try {

        var assignment = await Assignment.findByPk(id)

        if (!assignment) {
    
            // 400 Assignment does not exist
            res.status(404).send({ error: `No assignment with id ${id} exists`})
            return
    
        }
    

        var studentList = await CourseStudents.findAll({

            where: { 
                courseId: assignment.courseId, 
                userId: req.user.id 
            }
    
        })
    

        if (!studentList) {
    
            // 400 Assignment does not exist
            res.status(404).send({ error: `No student with id ${req.body.studentId} exists in course ${assignment.courseId}`})
            return
    
        }

    } catch (err) {

        next(err)

    }

    if (req.user.role == 'student') {

        try {

            // 201 Submission successfully created
            const submissionBody  = { assignmentId: req.body.assignmentId, studentId: req.body.studentId, file: req.file.path}
            const submission = await Submission.create( submissionBody, SubmissionClientFields )
            console.log("", req.body)
            res.status(201).send({ id: submission.id })
    
        } catch (err) {
            console.log("", req.body)

            // 400 The request body was either not present or did not contain a valid Submission object.
            if (err instanceof ValidationError) {
    
                res.status(400).send({ error: err.message })
            
            } else {
            
                next(err)
            
            }
    
        }

    } else {
        
        // 403 The request was not made by an authenticated User satisfying the authorization criteria described above.
        res.status(403).send({ error: "Unauthorized access to the specified resource"})

    }
    


})


/*

Returns summary data about the Assignment, excluding the list of Submissions.

*/
router.get('/:id', async function (req, res, next) {

    // Store assignment id 
    const id = req.params.id

    try {

        const assignment = await Assignment.findByPk(id, {
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            }
        })

        if (assignment) {

            // 200 Success in creating assignment
            res.status(200).send(assignment)

        } else {

            // 404 Id not found
            next()

        }
    }
    catch (err) {

        next()

    }
})

/*

Returns the list of all Submissions for an Assignment. This list should be paginated. Only an authenticated User with 
'admin' role or an authenticated 'instructor' User whose ID matches the instructorId of the Course corresponding to the 
Assignment's courseId can fetch the Submissions for an Assignment.

*/
router.get('/:id/submissions', requireAuthentication, async function (req, res, next) {
    
    // Store assignment id
    const id = req.params.id
    
    try {

        var assignment = await Assignment.findByPk(id)

        if (!assignment) {
    
            // 400 Assignment does not exist
            res.status(404).send({ error: `No assignment with id ${id} exists`})
            return
    
        }

        var course = await Course.findByPk(assignment.courseId)

    } catch (err) {

        next(err)
        return

    }

    if (req.user.role == 'admin' || (req.user.role == "instructor" && req.user.id == course.instructorId)) {

        // Pagination variables
        let page = parseInt(req.query.page) || 1
        page = page < 1 ? 1 : page
        const numPerPage = 10
        const offset = (page - 1) * numPerPage
    
        try {
    
            // Number of submissions for pagination
            const result = await Submission.findAndCountAll({ limit: numPerPage, offset: offset,
                where: { assignmentId: id},
                attributes: {
                    exclude: ['createdAt', 'updatedAt']
                }})
    
            // Pagination link creation
            const lastPage = Math.ceil(result.count / numPerPage)
            const links = {}
            if (page < lastPage ) {
    
                links.nextPage = `/${id}/submissions?page=${page + 1}`
                links.lastPage = `/${id}/submissions?page=${lastPage}`
    
            } else {
    
                links.prevPage = `/${id}/submissions?page=${page - 1}`
                links.firstPage = `/${id}/submissions?page=1`   
    
            }
    
            // 200 Success in getting list of submissions
            res.status(200).json({
                submissions: result.rows,
                pageNumber: page,
                totalPages: lastPage,
                pageSize: numPerPage,
                totalCount: result.count,
                links: links
            })
    
        } catch (err) {
    
            next(err)
    
        }

    } else {
        
        // 403 The request was not made by an authenticated User satisfying the authorization criteria described above.
        res.status(403).send({ error: "Unauthorized access to the specified resource"})

    }
})

/*

Performs a partial update on the data for the Assignment. Note that submissions cannot be modified via this endpoint. 
Only an authenticated User with 'admin' role or an authenticated 'instructor' User whose ID matches the instructorId 
of the Course corresponding to the Assignment's courseId can update an Assignment.

*/

router.patch('/:id', requireAuthentication, async function (req, res, next) {

    // Store assignment id
    const id = req.params.id

    try {

        var assignment = await Assignment.findByPk(id)

        if (!assignment) {
            // 404 Assignment does not exist   
            res.status(404).send({ error: `No assignment with id ${id} exists`})
            return
    
        }

    } catch (err) {

        next(err)

    }

    if (Object.keys(req.body).length === 0) {
        res.status(400).send({ error: "The request body is empty"})
        return
    }

    var check = false
    for (field in AssignmentClientFields) {
        if(req.body.hasOwnProperty(AssignmentClientFields[field])){
            check = true
        }
    }

    if(check == false) {
        res.status(400).send({ error: "The request body contains no valid fields" })
        return
    }

    try {

        var course = await Course.findByPk(assignment.courseId) 

    } catch (err) {

        next(err)

    }

    if (req.user.role == 'admin' || (req.user.role == "instructor" && req.user.id == course.instructorId)) {
        
        try {

            const result = await Assignment.update(req.body, { 
                where: { id: id },
                fields: AssignmentClientFields
            })
            
            if (result[0] > 0) {
    
                // 200 Success in patching assignment
                res.status(200).send()
    
            } else {
                next()
    
            }
    
        } catch (err) {
    
            next(err)
    
        }

    } else {
        
        // 403 The request was not made by an authenticated User satisfying the authorization criteria described above.
        res.status(403).send({ error: "Unauthorized access to the specified resource"})

    }


})


/*

Completely removes the data for the specified Assignment, including all submissions. Only an authenticated User with 'admin' 
role or an authenticated 'instructor' User whose ID matches the instructorId of the Course corresponding to the Assignment's courseId can delete an Assignment.

*/

router.delete('/:id', requireAuthentication, async function (req, res, next) {
    
    // Store assignment id
    const id = req.params.id

    try {

        var assignment = await Assignment.findByPk(id)

        if (!assignment) {

            // 404 Assignment not found
            res.status(404).send({ error: `No assignment with id ${id} exists`})
            return
    
        } 

        var course = await Course.findByPk(assignment.courseId)   

    } catch (err) {

        next(err)

    }

    if (req.user.role == 'admin' || (req.user.role == "instructor" && req.user.id == course.instructorId)) {

        try {

            const result = await Assignment.destroy({ where: { id: id }})
    
            if (result > 0) {
    
                // 204 Success in deleting assignment
                res.status(204).send()
    
            } else {
    
                next()
    
            }
    
        } catch (err) {
    
            next(err)
    
        }

    } else {
        
        // 403 The request was not made by an authenticated User satisfying the authorization criteria described above.
        res.status(403).send({ error: "Unauthorized access to the specified resource"})

    }
})


module.exports = router

