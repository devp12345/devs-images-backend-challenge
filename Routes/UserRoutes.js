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
        if (!customer) {
            return res.json("error in creating customer in stripe")
        }

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
                res.json({ token, });
            }
        );


    } catch (error) {
        console.error(error)
        res.status(500).send('server error')
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
        } catch (err) {
            console.error(err.message);
            return res.status(500).send("server error");
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
                return res.json("user not found")
            }

            const cardParams = {
                card: {
                    number: '5555555555554444',
                    exp_month: 12,
                    exp_year: 2021,
                    cvc: '314',
                },
            }

            const token = await tokenizeCard(cardParams);
            if (!token) {
                return res.json("error from tokenizing card in stripe")
            }

            const cardToken = token.id

            const card = await saveCreditCardFromToken(customer.stripeCustomerID, cardToken);
            if (!card) {
                return res.json("error from saving card from token in stripe")
            }

            res.json(card)
        } catch (error) {
            console.error(error)
            res.status(500)
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
                return res.json("user not found")
            }

            const { card_id } = req.params

            const card = await getCreditCard(
                customer.stripeCustomerID,
                card_id
            );

            if (!card) {
                return res.json("You dont have that card saved")
            }


            const deleted = await deleteCreditCard(
                customer.stripeCustomerID,
                card_id
            );

            if (!deleted) {
                return res.json("error in deleting card in stripe")
            }

            res.json("removed card")
        } catch (error) {
            console.error(error)
            if (error.code === "resource_missing") {
                return res.status(500).send("you dont have that card saved / invalid card")
            }

            res.status(500).send("an error occured")

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
                return res.json("user not found")
            }

            const { card_id } = req.params

            const card = await getCreditCard(
                customer.stripeCustomerID,
                card_id
            );

            if (!card) {
                return res.json("You dont have that card saved")
            }

            const updatedDefaultCard = await makeDefaultCard(
                customer.stripeCustomerID,
                card_id
            );

            if (!updatedDefaultCard) {
                return res.json("error in updating the default card in stripe")
            }

            res.json("updated card")
        } catch (error) {
            console.error(error)
            if (error.code === "resource_missing") {
                return res.status(500).send("you dont have that card saved / invalid card")
            }

            res.status(500).send("an error occured")
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
                return res.json("user not found")
            }

            const cards = getAllCreditCards(
                customer.stripeCustomerID
            );

            if (!cards) {
                return res.json("you have no cards saved")
            }

            res.json(cards)

        } catch (error) {
            console.error(error)
            res.status(500)
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
                res.json("user not found")
            }

            const tokenizedCard = await tokenizeCard(cardParams);
            if (!tokenizedCard) {
                return res.json("error in stripe")
            }
            const cardToken = tokenizedCard.id
            res.json(cardToken)
        } catch (error) {
            console.error(error)
            res.status(500).send("an error occured")

        }

    })


module.exports = router
