const jwt = require("jsonwebtoken")
const { User } = require('../models/user')

const secretKey = "SuperSecret"

exports.generateAuthToken = function (user) {
    const payload = { 
        id: user.id, 
        role: user.role 
    }
    return jwt.sign(payload, secretKey, { expiresIn: "24h" })
}

exports.requireAuthentication = function (req, res, next) {
    console.log("== requireAuthentication()")
    const authHeader = req.get("Authorization") || ""
    const authHeaderParts = authHeader.split(" ")
    const token = authHeaderParts[0] === "Bearer" ?
        authHeaderParts[1] : null
    console.log("  -- token:", token)
    try {
        const payload = jwt.verify(token, secretKey)
        console.log("  -- payload:", payload)
        req.user = {
            id: payload.id,
            role: payload.role
        }
        next()
    } catch (err) {
        console.error("== Error verifying token:", err)
        res.status(401).send({
            error: "Invalid authentication token"
        })
    }
}

exports.roleAuthentication = function (req, res, next) {
    console.log("== requireAuthentication()")
    const authHeader = req.get("Authorization") || ""
    const authHeaderParts = authHeader.split(" ")
    const token = authHeaderParts[0] === "Bearer" ?
        authHeaderParts[1] : null
    console.log("  -- token:", token)
    try {
        const payload = jwt.verify(token, secretKey)
        console.log("  -- payload:", payload)
        req.user = {
            id: payload.id,
            role: payload.role
        }
        next()
    } catch (err) {
        req.user = {
            id: null,
            role: null
        }
        next()
    }
}

/*
exports.getUserTokenInfo = function (req, res, next) {
    console.log("== isUserAdmin()")
    const authHeader = req.get("Authorization") || ""
    const authHeaderParts = authHeader.split(" ")
    const token = authHeaderParts[0] === "Bearer" ? authHeaderParts[1] : null
    req.user = {}
    try {
        const payload = jwt.verify(token, secretKey)
        console.log("== payload:", payload)
        const tempUser = User.findByPk(payload.sub)
        console.log("== tempUser:", tempUser)
        if (tempUser) {
            req.user.id = tempUser.id
            req.user.role = tempUser.role
        }
        next()
    } catch (err) {
        req.user = null
        next()
    }
}*/