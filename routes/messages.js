var express = require('express');
var router = express.Router();
let { checkLogin } = require('../utils/authHandler.js')
let messageModel = require('../schemas/messages')
let userModel = require('../schemas/users')

router.get('/', checkLogin, async function (req, res, next) {
    try {
        let userId = req.userId;
        let id = userId.toString();
        let messages = await messageModel.find({
            $or: [
                { from: userId },
                { to: userId }
            ]
        }).sort({ createdAt: -1 })

        let latestMessages = [];
        let checkedUsers = [];

        messages.forEach(function (item) {
            let partnerId = item.from.toString() === id ? item.to.toString() : item.from.toString();
            if (!checkedUsers.includes(partnerId)) {
                checkedUsers.push(partnerId)
                latestMessages.push(item)
            }
        })

        res.send(latestMessages)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

router.get('/:id', checkLogin, async function (req, res, next) {
    try {
        let userId = req.userId;
        let id = req.params.id;

        let messages = await messageModel.find({
            $or: [
                {
                    from: userId,
                    to: id
                },
                {
                    from: id,
                    to: userId
                }
            ]
        }).sort({ createdAt: 1 })

        res.send(messages)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

router.post('/', checkLogin, async function (req, res, next) {
    try {
        let from = req.userId;
        let { to, messageContent } = req.body;

        let getUser = await userModel.findOne({
            _id: to,
            isDeleted: false
        })

        if (!getUser) {
            res.status(404).send({ message: 'nguoi nhan khong ton tai' })
            return;
        }

        let newMessage = new messageModel({
            from: from,
            to: to,
            messageContent: messageContent
        })

        let result = await newMessage.save()

        res.send(result)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

module.exports = router;
