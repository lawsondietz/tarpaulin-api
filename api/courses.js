const { Router } = require('express')
const { ValidationError } = require('sequelize')

const { Course, CourseClientFields } = require('../models/course')
const { requireAuthentication } = require('../lib/auth')



const router = Router()

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

