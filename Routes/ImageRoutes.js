const express = require("express");
const router = express.Router();
const auth = require("../Middleware/auth")
const User = require("../Models/UsersModel");
const Images = require("../Models/ImageModel");
const { check, validationResult } = require('express-validator');
const fs = require("fs")
const FileType = require("file-type")
const multiparty = require("multiparty")

const {
    purchaseByCardToken,
    purchaseByCustomer,
    getAllCreditCards
} = require('../Providers/StripeProvider')

const {
    deleteFilesFunction,
    uploadFile,
    getSignedUrl
} = require("../Providers/AWSProvider")

// POST /admin/upload
// Uploads a single photo to the "store"
// Protected route
router.post("/admin/image/upload", auth, async (req, res) => {
    try {
        const form = new multiparty.Form();
        form.parse(req, async (error, fields, files) => {
            if (error) {
                console.error(error);
                return res.status(500).send(error);
            }
            try {

                const formData = JSON.parse(fields["body"][0])

                if (formData['image_name'] === null) {
                    return res.json({ error: "Error, must enter an image name" })
                }

                if (formData['cost'] === null) {
                    return res.json({ error: "Error, cost must be entered" })
                } else if (isNaN(formData['cost'])) {
                    return res.json({ error: "Error, cost must be numeric" })
                }

                const { image_name, cost } = formData

                if (req.user.accountType !== "admin") {
                    return res.error(403).send({ error: "Error, you cant post pictures unless you are an admin" })
                }

                const admin = await User.findById(req.user.id)

                if (!admin) {
                    return res.json({ error: "Error, admin not found" })
                }

                const img = new Images({
                    photographer: admin._id,
                    nameOfImage: image_name,
                    cost: cost
                })

                await img.save()

                const fileUpload = files["null"][0]
                const path = fileUpload.path;
                const buffer = fs.readFileSync(path);
                const type = await FileType.fromBuffer(buffer);
                const fileName = `${img._id}`;
                const data = await uploadFile(buffer, fileName, type);
                return res.status(200).send({ data, img });

            } catch (error) {
                console.error(error);
                if (error.code == "AccessDenied") {
                    return res.status(403).send(error);
                }

                return res.status(500).send(error);
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }
})


// GET /admin/images/:image_id
// GETS the object of the specified image
// Protected route
router.get("/admin/image/:image_id", auth, async (req, res) => {
    try {

        if (req.user.accountType !== "admin") {
            return res.status(403).send({ error: "Error, must be an admin" });
        }

        const { image_id } = req.params
        const img = await Images.findById(image_id)

        if (!img) {
            return res.status(404).send({ error: "Error, image not found" });
        }

        res.json(img)
    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }

})

// GET /admin/images
// GETS all image objects 
// Protected route
router.get("/admin/images", auth, async (req, res) => {
    try {
        if (req.user.accountType !== "admin") {
            return res.status(403).send({ error: "Error, must be an admin" });
        }

        const all = await Images.find({})

        if (!all) {
            return res.status(404).send({ error: "Error, no images found" });
        }

        res.json(all)
    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }
})

// DELETE /admin/images/:image_id
// DELETE a single image if they have posted it to the store. if it has been purchased, we dont remove from S3
// just make it non purchasable (must be in market to purchase, set in market to false). 
// If it hasnt been purchased, we remove it from s3 and mongodb as well
// Protected route
router.delete("/admin/image/:image_id", auth, async (req, res) => {
    try {

        if (req.user.accountType !== "admin") {
            return res.status(403).send({ error: "Error, must be an admin" });
        }

        const { image_id } = req.params
        const img = await Images.findById(image_id)

        if (!img) {
            return res.status(404).send({ error: "Error, image not found" });
        }

        if (img.has_been_purchased) {
            await Images.findByIdAndUpdate(img._id, { in_market: false })
            return res.json(img)
        } else {
            await deleteFilesFunction(img._id)
            await Images.findByIdAndDelete(img._id)
            return res.json(img)
        }

    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }

})


// PUT /admin/image/:image_id/set-name
// sets a name for the image (update)
// Protected route
router.put("/admin/image/:image_id/set-name", auth, [
    check("image_name", "name is required")
        .not()
        .isEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (req.user.accountType !== "admin") {
            return res.status(403).send({ error: "Error, must be an admin" });
        }

        const { image_id } = req.params
        const { image_name } = req.body

        const img = await Images.findById(image_id)

        if (!img) {
            return res.status(404).send({ error: "Error, image not found" });
        }

        if (!img.in_market) {
            return res.status(400).send({ error: "Error, cant change name since this image was deleted" });
        }

        await Images.findByIdAndUpdate(image_id, { nameOfImage: image_name })

        const newImg = await Images.findById(image_id)
        res.json(newImg)

    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }

})

// PUT /admin/image/:image_id/set-cost
// sets a price for the image (update)
// Protected route
router.put("/admin/image/:image_id/set-cost", auth, [
    check("cost", "cost is required")
        .not()
        .isEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (req.user.accountType !== "admin") {
            return res.status(403).send({ error: "Error, must be an admin" });
        }

        const { image_id } = req.params
        const { cost } = req.body

        if (typeof cost !== 'number') {
            return res.status(400).send({ error: "Cost must be numeric" });
        }

        if (cost < 0) {
            return res.status(400).send({ error: "Cost must be non negative" });
        }

        const img = await Images.findById(image_id)

        if (!img) {
            return res.status(404).send({ error: "Error, image not found" });
        }

        if (!img.in_market) {
            return res.status(400).send({ error: "Error, cant change cost since this image was deleted" });
        }

        await Images.findByIdAndUpdate(image_id, { cost: cost })

        const newImg = await Images.findById(image_id)
        res.json(newImg)

    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }

})


// PUT /admin/image/:image_id/discount/amount
// sets a discount for the image by monetary amount
// Protected route
router.put("/admin/image/:image_id/discount/amount", auth, [
    check("discount", "discount is required")
        .not()
        .isEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        if (req.user.accountType !== "admin") {
            return res.status(403).send({ error: "Error, must be an admin" });
        }

        const { image_id } = req.params
        const { discount } = req.body

        if (typeof discount !== 'number') {
            return res.status(400).send({ error: "Error, discount must be numeric" });
        }

        const img = await Images.findById(image_id)

        if (!img) {
            return res.status(404).send({ error: "Error, image not found" });
        }

        if (!img.in_market) {
            return res.status(400).send({ error: "Error, cant change discount since this image was deleted" });
        }

        const discountAmount = discount > img.cost ? img.cost : discount
        await Images.findByIdAndUpdate(image_id, { discount_amount: discountAmount })
        const newImg = await Images.findById(image_id)

        res.json(newImg)

    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }

})

// PUT /admin/image/:image_id/discount/remove
// removes any discount for the image
// Protected route
router.put("/admin/image/:image_id/discount/remove", auth, async (req, res) => {
    try {
        if (req.user.accountType !== "admin") {
            return res.status(403).send({ error: "Error, must be an admin" });
        }

        const { image_id } = req.params

        const img = await Images.findById(image_id)

        if (!img) {
            return res.status(404).send({ error: "Error, image not found" });
        }

        if (!img.in_market) {
            return res.status(409).send({ error: "Error, cant change discount since this image was deleted" });
        }

        await Images.findByIdAndUpdate(image_id, { discount_amount: 0 })

        const newImg = await Images.findById(image_id)
        res.json(newImg)

    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }

})


// POST /customer/image/:image_id/purchase
// Purchases the image if customer has cards saved or pass in a card token
// Protected route
router.post("/customer/image/:image_id/purchase", auth, async (req, res) => {
    try {

        const { image_id } = req.params

        const img = await Images.findById(image_id)
        const customer = await User.findById(req.user.id)

        if (!(img && img.in_market)) {
            return res.status(404).send({ error: "Error, image not purchasable or not found" })
        }

        // handle the payment
        const purchaseAmount = img.cost - img.discount_amount

        if (req.body.card_token) {

            const creditCardToken = req.body.card_token

            const charge = await purchaseByCardToken(
                creditCardToken,
                purchaseAmount,
                img.nameOfImage
            );

        }
        else {
            const cards = await getAllCreditCards(
                customer.stripeCustomerID
            );

            if (!cards) {
                return res.status(402).send({ error: "Error, cards not found" })
            }

            const charge = await purchaseByCustomer(
                customer.stripeCustomerID,
                purchaseAmount,
                img.nameOfImage
            );

        }

        await User.findByIdAndUpdate(customer._id, { $push: { purchasedImages: img._id } })
        await Images.findByIdAndUpdate(img._id, { has_been_purchased: true })

        res.json("purchased")

    } catch (error) {
        console.error(error);
        return res.status(500).send({ error: "Couldnt process a purchase" });
    }
})

// GET /customer/image/:image_id
// GETS the name of the specified image that THEY have purchased from the store
// Protected route
router.get("/customer/image/:image_id", auth, async (req, res) => {
    try {
        const { image_id } = req.params
        const customer = await User.findById(req.user.id)

        if (!customer) {
            return res.status(404).send({ error: "Error, your account could not be found" })
        }

        const purchasedImages = customer.purchasedImages
        const userHasPurchased = purchasedImages.some((image) => {
            return image.equals(image_id);
        });

        if (!userHasPurchased) {
            return res.status(403).send({ error: "Error, you have not purchased this image and cannot access it" })
        }

        const image = await Images.findById(image_id)

        const imageUrl = await getSignedUrl(image._id, 600)

        res.json({ url: imageUrl })

    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }
})

// GET /customer/images
// GETS the name of all images that THEY have purchased from the store
// Protected route
router.get("/customer/images", auth, async (req, res) => {
    try {
        const customer = await User.findById(req.user.id)

        if (!customer) {
            return res.status(404).send({ error: "Error, your account could not be found" })
        }

        const purchasedImages = customer.purchasedImages

        const objectsOfImages = await Promise.all(purchasedImages.map(async (image) => {
            const img = await Images.findById(image)
            if (img) {
                return img //.nameOfImage
            }
            return null

        }))

        if (objectsOfImages.length === 0) {
            return res.status(403).send({ error: "Error, seems like you havent purchased any images" })
        }

        res.json(objectsOfImages)

    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }
})


// #weDontDoRefunds :)

module.exports = router
