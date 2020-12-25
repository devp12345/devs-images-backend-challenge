const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../Middleware/auth")
const User = require("../Models/UsersModel");
const { check, validationResult } = require('express-validator');

const {
    createCustomer,
    tokenizeCard,
    getCreditCard,
    getAllCreditCards,
    saveCreditCardFromToken,
    deleteCreditCard,
    makeDefaultCard
} = require('../Providers/StripeProvider')


// POST /register
// register an api user
// public route
router.post("/register", [
    check("firstName", "name is required")
        .not()
        .isEmpty(),
    check("lastName", "name is required")
        .not()
        .isEmpty(),
    check("email", "please include valid email").isEmail(),
    check(
        "password",
        "Please enter a password with 8 or more charectars"
    ).isLength({ min: 6 })

], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (user) {
            return res
                .status(400)
                .json({ errors: [{ msg: " User already exists " }] });
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const fullName = firstName + " " + lastName

        const customer = await createCustomer(fullName, email)

        const stripeCustomerID = customer.id

        user = new User(
            { firstName: firstName, lastName: lastName, email: email, passwordHash: hashedPassword, stripeCustomerID: stripeCustomerID }
        );

        await user.save();


        // get payload
        const payload = {
            user: {
                id: user.id,
                accountType: user.accountType
            }
        };

        //sign token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: "10h" },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );


    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }

})


// POST /login
// Login with email and password
// public route
router.post(
    "/login",
    [
        check("email", "please include valid email").isEmail(),
        check("password", "password is required").exists()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            let user = await User.findOne({ email: email });

            if (!user) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: " invalid credentials " }] });
            }

            const isMatch = await bcrypt.compare(password, user.passwordHash);

            if (!isMatch) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: " invalid credentials " }] });
            }

            const payload = {
                user: {
                    id: user.id,
                    accountType: user.accountType
                }
            };

            //sign token
            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: "10h" },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                }
            );
        } catch (error) {
            console.error(error);
            return res.status(500).send(error);
        }
    }
);

// POST /customer/save-credit-card
// saves a credit card to the users customer 
// protected route
router.post("/customer/save-credit-card", auth,
    //     [
    //     check("card_number", "card number is required")
    //         .not()
    //         .isEmpty(),
    //     check("exp_month", "exp month is required")
    //         .not()
    //         .isEmpty(),
    //     check("exp_year", "exp year is required")
    //         .not()
    //         .isEmpty(),
    //     check("cvc", "cvc is required")
    //         .not()
    //         .isEmpty()
    // ],
    async (req, res) => {

        try {
            const customer = await User.findById(req.user.id)

            if (!customer) {
                return res.json({ error: "user not found" })
            }

            // just a test card provided by stripe since the charge and card related endpoints are 
            // experimental
            const cardParams = {
                card: {
                    number: '5555555555554444',
                    exp_month: 12,
                    exp_year: 2021,
                    cvc: '314',
                },
            }

            const token = await tokenizeCard(cardParams);

            const cardToken = token.id

            const card = await saveCreditCardFromToken(customer.stripeCustomerID, cardToken);

            res.json(card)
        } catch (error) {
            console.error(error)
            return res.status(500).send({ error: "Couldnt save credit card in stripe" });
        }

    })


// POST /customer/remove-credit-card/:card_id
// removes a credit card to the users customer 
// protected route
router.post("/customer/remove-credit-card/:card_id", auth,
    async (req, res) => {

        try {
            const customer = await User.findById(req.user.id)

            if (!customer) {
                return res.status(404).send({ error: "user not found" })
            }

            const { card_id } = req.params

            const card = await getCreditCard(
                customer.stripeCustomerID,
                card_id
            );

            if (!card) {
                return res.status(403).send({ error: "You dont have that card saved" })
            }


            const deleted = await deleteCreditCard(
                customer.stripeCustomerID,
                card_id
            );


            res.json("Deleted card")
        } catch (error) {
            console.error(error)
            return res.status(500).send({ error: "Couldnt delete credit card in stripe" });
        }

    })


// POST /customer/make-default-credit-card/:card_id
// makes a credit card the users default 
// protected route
router.post("/customer/make-default-credit-card/:card_id", auth,
    async (req, res) => {

        try {
            const customer = await User.findById(req.user.id)

            if (!customer) {
                return res.status(404).send({ error: "user not found" })
            }

            const { card_id } = req.params

            const card = await getCreditCard(
                customer.stripeCustomerID,
                card_id
            );

            if (!card) {
                return res.status(403).send({ error: "You dont have that card saved" })
            }

            const updatedDefaultCard = await makeDefaultCard(
                customer.stripeCustomerID,
                card_id
            );

            res.json("updated card")
        } catch (error) {
            console.error(error)
            res.status(500).send({ error: "Couldnt make credit card the default for customer in stripe" });
        }

    })



// GET /customer/list-all-credit-cards
// removes a credit card to the users customer 
// protected route
router.get("/customer/list-all-credit-cards", auth,
    async (req, res) => {
        try {
            const customer = await User.findById(req.user.id)

            if (!customer) {
                return res.status(404).send({ error: "user not found" })
            }

            const cards = await getAllCreditCards(
                customer.stripeCustomerID
            );

            if (!cards) {
                return res.status(403).send({ error: "you have no cards saved" })
            }

            res.json(cards)

        } catch (error) {
            console.error(error)
            return res.status(500).send({ error: "Couldnt get all credit cards in stripe" });
        }

    })




// POST /customer/credit-card/tokenize
// tokenize a credit card to the users customer
// protected route
router.post("/customer/credit-card/tokenize", auth,
    async (req, res) => {

        try {
            const customer = await User.findById(req.user.id)

            if (!customer) {
                return res.status(404).send({ error: "user not found" })
            }

            const tokenizedCard = await tokenizeCard(cardParams);
            const cardToken = tokenizedCard.id

            res.json(cardToken)
        } catch (error) {
            console.error(error);
            return res.status(500).send({ error: "Couldnt tokenize the card in stripe" });

        }

    })


module.exports = router
