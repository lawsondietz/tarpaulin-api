const { Router } = require('express')
const fs = require('node:fs')
const multer = require('multer')

const { User } = require('../models/user')
const { Course } = require('../models/course')
const { Assignment, AssignmentClientFields } = require('../models/assignment')
const { Submission, SubmissionClientFields } = require('../models/submission')

const { validateAgainstSchema } = require('../lib/validation')
const { generateAuthToken, requireAuthentication } = require('../lib/auth')
const { ValidationError } = require('sequelize')
const e = require('express')
const { resourceLimits } = require('node:worker_threads')

const router = Router()

/*

Create and store a new Assignment with specified data and adds it to the application's database. 
Only an authenticated User with 'admin' role or an authenticated 'instructor' User whose ID matches 
the instructorId of the Course corresponding to the Assignment's courseId can create an Assignment.

*/
router.post('/', async function (req, res, next) {
    console.log("", req.user.userId)
    test = 1

    if (test) {
        // TODO authenticate user with admin role or instructor id that matches instructor id of corresponding course
        /*
        var course = await Course.findByPK(req.body.courseId) || -1

        if (course == -1) {
         res.status()
        }
        */

        try {

            // 201 if new Assignment successfully created
            const assignment = await Assignment.create(req.body, AssignmentClientFields)
            res.status(201).send({ id: assignment.id})
    
        } catch (err) {
    
            // 400 if The request body was either not present or did not contain a valid Assignment object.
            if (e instanceof ValidationError) {

                res.status(400).send({ error: e.message })

            } else {

                next(err)

            }
    
        }
    }
    else {
        
        // 403 if The request was not made by an authenticated User satisfying the authorization criteria described above.
        res.status(403).send({ error: "Unauthorized access to the specified resource"})

    }
})

/*

Create and store a new Assignment with specified data and adds it to the application's database. 
Only an authenticated User with 'student' role who is enrolled in the Course corresponding to the Assignment's courseId can create a Submission.

*/
router.post('/:id/submissions', async function (req, res, next) {

    // Store assignment id
    const id = req.params.id

    //TODO authenticate student enrolled in course

    try {

        // 201 if new Submission successfully created
        const submission = await Submission.create( req.body, SubmissionClientFields )
        res.status(201).send({ id: submission.id })

    } catch (err) {

        // 400 if The request body was either not present or did not contain a valid Submission object.
        if (e instanceof ValidationError) {

            res.status(400).send({ error: e.message })
        
        } else {
        
            next(err)
        
        }

    }

})

/*

Returns summary data about the Assignment, excluding the list of Submissions.

*/
router.get('/:id', async function (req, res, next) {

    // Store assignment id 
    const id = req.params.id

    try {

        const assignment = await Assignment.findByPk(id)

        if (assignment) {

            // 200 Success in creating assignment
            res.status(200).send(assignment)

        }
        else {

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
router.get('/:id/submissions', async function (req, res, next) {
    const id = req.params.id

    // TODO authenticate user with admin role or instructor id that matches instructor id of corresponding course

    let page = parseInt(req.query.page) || 1
    page = page < 1 ? 1 : page
    const numPerPage = 10
    const offset = (page - 1) * numPerPage

    try {

        // Number of submissions for pagination
        const result = await Submission.findAndCountAll({ limit: numPerPage, offset: offset })

        // Pagination link creation
        const lastPage = Math.ceil(result.count / numPerPage)
        const links = {}
        if (page < lastPage ) {

            links.nextPage = `/${id}/submissions?page=${page + 1}`
            links.lastPage = `/${id}/submissions?page=${lastPage}`

        }
        else {

            links.prevPage = `/${id}/submissions?page=${page - 1}`
            links.firstPage = `/${id}/submissions?page=1`   

        }

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
})

/*

Performs a partial update on the data for the Assignment. Note that submissions cannot be modified via this endpoint. 
Only an authenticated User with 'admin' role or an authenticated 'instructor' User whose ID matches the instructorId 
of the Course corresponding to the Assignment's courseId can update an Assignment.

*/
/*
router.patch('/:id')

*/
/*

Completely removes the data for the specified Assignment, including all submissions. Only an authenticated User with 'admin' 
role or an authenticated 'instructor' User whose ID matches the instructorId of the Course corresponding to the Assignment's courseId can delete an Assignment.

*/
/*
router.delete('/:id')
*/

module.exports = router