var express = require("express");
var router = express.Router();
let { uploadImage, uploadExcel } = require('../utils/uploadHandler')
let path = require('path')
let excelJS = require('exceljs')
let fs = require('fs');
let crypto = require('crypto')
let productModel = require('../schemas/products')
let InventoryModel = require('../schemas/inventories')
let cartModel = require('../schemas/cart')
let roleModel = require('../schemas/roles')
let userModel = require('../schemas/users')
let mongoose = require('mongoose')
let slugify = require('slugify')
let userController = require('../controllers/users')
let mailHandler = require('../utils/sendMailHandler')

function normalizeCellValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        if (value.text) {
            return value.text.toString().trim();
        }
        if (value.hyperlink) {
            return value.hyperlink.toString().trim();
        }
        if (value.result) {
            return value.result.toString().trim();
        }
        if (Array.isArray(value.richText)) {
            return value.richText.map(function (item) {
                return item.text;
            }).join('').trim();
        }
    }
    return value.toString().trim();
}

function generateRandomPassword(length) {
    let lower = 'abcdefghijklmnopqrstuvwxyz';
    let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let number = '0123456789';
    let symbol = '!@#$%^&*';
    let allChars = lower + upper + number + symbol;
    let requiredChars = [
        lower[crypto.randomInt(lower.length)],
        upper[crypto.randomInt(upper.length)],
        number[crypto.randomInt(number.length)],
        symbol[crypto.randomInt(symbol.length)]
    ];
    while (requiredChars.length < length) {
        requiredChars.push(allChars[crypto.randomInt(allChars.length)]);
    }
    for (let index = requiredChars.length - 1; index > 0; index--) {
        let randomIndex = crypto.randomInt(index + 1);
        let temp = requiredChars[index];
        requiredChars[index] = requiredChars[randomIndex];
        requiredChars[randomIndex] = temp;
    }
    return requiredChars.join('');
}

function isValidEmail(email) {
    return /^\S+@\S+\.\S+$/.test(email);
}

router.post('/single', uploadImage.single('file'), function (req, res, next) {
    if (!req.file) {
        res.status(404).send({
            message: "file upload rong"
        })
    } else {
        res.send(req.file.path)
    }
})
router.post('/multiple', uploadImage.array('files'), function (req, res, next) {
    if (!req.files) {
        res.status(404).send({
            message: "file upload rong"
        })
    } else {
        let data = req.body;
        console.log(data);
        let result = req.files.map(f => {
            return {
                filename: f.filename,
                path: f.path,
                size: f.size
            }
        })
        res.send(result)
    }
})
router.get('/:filename', function (req, res, next) {
    let fileName = req.params.filename;
    let pathFile = path.join(__dirname, '../uploads', fileName)
    if (!fs.existsSync(pathFile)) {
        res.status(404).send({
            message: 'file khong ton tai'
        })
        return;
    }
    res.sendFile(pathFile)

})

router.post('/excel', uploadExcel.single('file'), async function (req, res, next) {
    if (!req.file) {
        res.status(404).send({
            message: "file upload rong"
        })
    } else {
        //workbook->worksheet-row/column->cell
        let pathFile = path.join(__dirname, '../uploads', req.file.filename)
        let workbook = new excelJS.Workbook();
        await workbook.xlsx.readFile(pathFile);
        let worksheet = workbook.worksheets[0];
        let products = await productModel.find({});
        let getTitle = products.map(p => p.title)
        let getSku = products.map(p => p.sku)
        let result = [];
        let errors = [];
        for (let index = 2; index <= worksheet.rowCount; index++) {
            let errorRow = [];
            const row = worksheet.getRow(index)
            let sku = row.getCell(1).value;//unique
            let title = row.getCell(2).value;
            let category = row.getCell(3).value;
            let price = Number.parseInt(row.getCell(4).value);
            let stock = Number.parseInt(row.getCell(5).value);
            //validate
            if (price < 0 || isNaN(price)) {
                errorRow.push("dinh dang price chua dung " + price)
            }
            if (stock < 0 || isNaN(stock)) {
                errorRow.push("dinh dang stock chua dung " + stock)
            }
            if (getTitle.includes(title)) {
                errorRow.push("title da ton tai")
            }
            if (getSku.includes(sku)) {
                errorRow.push("sku da ton tai")
            }
            if (errorRow.length > 0) {
                result.push({ success: false, data: errorRow })
                continue;
            } else {
                let session = await mongoose.startSession()
                session.startTransaction()
                try {
                    let newObj = new productModel({
                        sku: sku,
                        title: title,
                        slug: slugify(title, {
                            replacement: '-', remove: undefined,
                            locale: 'vi',
                            trim: true
                        }), price: price,
                        description: title,
                        category: category
                    })
                    let newProduct = await newObj.save({ session });
                    let newInv = new InventoryModel({
                        product: newProduct._id,
                        stock: stock
                    })
                    newInv = await newInv.save({ session })
                    await newInv.populate('product')
                    await session.commitTransaction();
                    await session.endSession()
                    getSku.push(sku);
                    getTitle.push(title)
                    result.push({ success: true, data: newInv });
                } catch (error) {
                    await session.abortTransaction();
                    await session.endSession()
                    errorRow.push(error.message)
                    result.push({ success: false, data: errorRow })
                }
            }
        }
        result = result.map(function (e, index) {
            if (e.success) {
                return (index + 1) + ": " + e.data.product.title
            } else {
                return (index + 1) + ": " + e.data
            }
        })
        res.send(result)
        fs.unlinkSync(pathFile);

    }
})

router.post('/users-excel', uploadExcel.single('file'), async function (req, res, next) {
    if (!req.file) {
        res.status(404).send({
            message: 'file upload rong'
        })
        return;
    }

    let pathFile = path.join(__dirname, '../uploads', req.file.filename)
    try {
        let workbook = new excelJS.Workbook();
        await workbook.xlsx.readFile(pathFile);
        let worksheet = workbook.worksheets[0];

        if (!worksheet) {
            res.status(400).send({ message: 'file excel khong co du lieu' })
            return;
        }

        let headerUsername = normalizeCellValue(worksheet.getRow(1).getCell(1).value).toLowerCase();
        let headerEmail = normalizeCellValue(worksheet.getRow(1).getCell(2).value).toLowerCase();

        if (headerUsername !== 'username' || headerEmail !== 'email') {
            res.status(400).send({
                message: 'file excel phai co 2 cot username va email'
            })
            return;
        }

        let userRole = await roleModel.findOne({
            isDeleted: false,
            name: { $regex: /^user$/i }
        })

        if (!userRole) {
            res.status(400).send({
                message: 'khong tim thay role user'
            })
            return;
        }

        let parsedRows = [];
        let duplicateUsernamesInFile = new Set();
        let duplicateEmailsInFile = new Set();
        let seenUsernames = new Set();
        let seenEmails = new Set();

        for (let index = 2; index <= worksheet.rowCount; index++) {
            let row = worksheet.getRow(index)
            let username = normalizeCellValue(row.getCell(1).value);
            let email = normalizeCellValue(row.getCell(2).value).toLowerCase();

            if (!username && !email) {
                continue;
            }

            if (username) {
                if (seenUsernames.has(username)) {
                    duplicateUsernamesInFile.add(username);
                }
                seenUsernames.add(username);
            }
            if (email) {
                if (seenEmails.has(email)) {
                    duplicateEmailsInFile.add(email);
                }
                seenEmails.add(email);
            }

            parsedRows.push({
                rowNumber: index,
                username: username,
                email: email
            })
        }

        let existingUsers = await userController.FindExistingUsersForImport(parsedRows);
        let existingUsernames = new Set(existingUsers.map(function (user) {
            return user.username;
        }));
        let existingEmails = new Set(existingUsers.map(function (user) {
            return user.email;
        }));

        let result = [];
        let createdCount = 0;
        let failedCount = 0;

        for (let index = 0; index < parsedRows.length; index++) {
            let currentRow = parsedRows[index];
            let errorRow = [];

            if (!currentRow.username) {
                errorRow.push('username khong duoc rong');
            }
            if (!currentRow.email) {
                errorRow.push('email khong duoc rong');
            } else if (!isValidEmail(currentRow.email)) {
                errorRow.push('email khong dung dinh dang');
            }
            if (duplicateUsernamesInFile.has(currentRow.username)) {
                errorRow.push('username bi trung trong file');
            }
            if (duplicateEmailsInFile.has(currentRow.email)) {
                errorRow.push('email bi trung trong file');
            }
            if (existingUsernames.has(currentRow.username)) {
                errorRow.push('username da ton tai');
            }
            if (existingEmails.has(currentRow.email)) {
                errorRow.push('email da ton tai');
            }

            if (errorRow.length > 0) {
                failedCount++;
                result.push({
                    success: false,
                    rowNumber: currentRow.rowNumber,
                    data: errorRow
                })
                continue;
            }

            let password = generateRandomPassword(16);
            let newUser = null;

            try {
                newUser = await userController.CreateAnUser(
                    currentRow.username,
                    password,
                    currentRow.email,
                    userRole._id,
                    null
                )
                let newCart = new cartModel({
                    user: newUser._id
                })
                await newCart.save()

                let mailError = null;
                try {
                    await mailHandler.sendImportedPasswordMail(currentRow.email, currentRow.username, password)
                } catch (error) {
                    mailError = error.message;
                }

                existingUsernames.add(currentRow.username);
                existingEmails.add(currentRow.email);
                createdCount++;
                result.push({
                    success: true,
                    rowNumber: currentRow.rowNumber,
                    data: {
                        username: currentRow.username,
                        email: currentRow.email,
                        mailSent: mailError === null,
                        mailError: mailError
                    }
                })
            } catch (error) {
                if (newUser && newUser._id) {
                    await userModel.findByIdAndDelete(newUser._id)
                }
                failedCount++;
                result.push({
                    success: false,
                    rowNumber: currentRow.rowNumber,
                    data: [error.message]
                })
            }
        }

        res.send({
            received: parsedRows.length,
            created: createdCount,
            failed: failedCount,
            result: result.map(function (item) {
                if (item.success) {
                    let message = item.rowNumber + ': ' + item.data.username + ' - ' + item.data.email;
                    if (!item.data.mailSent && item.data.mailError) {
                        message += ' - gui mail that bai: ' + item.data.mailError;
                    }
                    return message;
                }
                return item.rowNumber + ': ' + item.data.join(', ');
            })
        })
    } catch (error) {
        res.status(400).send({ message: error.message })
    } finally {
        if (fs.existsSync(pathFile)) {
            fs.unlinkSync(pathFile);
        }
    }
})


module.exports = router;
