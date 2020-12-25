const stripe = require('stripe')(process.env.STRIPE_API_KEY);
// const stripe = require('stripe')('sk_test_51HzQ9CKXcuGMjsGnqKxxOaxfVBBkwki15ACHXWTaipcXj1mRkCI0Gyj85Q7z6yEeMDJOZ30ppA4tX9AG0bdYKLhB004Ei5iv3R');

// Create a customer in stripe
const createCustomer = async (fullName, email) => {
    try {
        const customer = await stripe.customers.create({
            description: `Customer + ${fullName}`,
            email: email,
            name: fullName
        });

        return customer
    } catch (error) {
        console.error(error)
        return null
    }
}

// token a card
const tokenizeCard = async (cardParams) => {
    try {
        const token = await stripe.tokens.create(cardParams);
        return token
    } catch (error) {
        console.error(error)
        return null
    }
}

// get a credit card from a customer (retrieveSource)
const getCreditCard = async (stripeCustomerID, cardID) => {
    try {
        const card = await stripe.customers.retrieveSource(
            stripeCustomerID,
            cardID
        );

        return card
    } catch (error) {
        console.error(error)
        return null
    }
}

// get all credit cards
const getAllCreditCards = async (stripeCustomerID) => {
    try {
        const cards = await stripe.customers.listSources(
            stripeCustomerID,
            { object: 'card' }
        );
        return cards
    } catch (error) {
        console.error(error)
        return null
    }
}

// save a credit card (token) to the users customer 
const saveCreditCardFromToken = async (stripeCustomerID, cardToken) => {
    try {
        const card = await stripe.customers.createSource(
            stripeCustomerID,
            { source: cardToken }
        );

        return card
    } catch (error) {
        console.error(error)
        return null
    }
}

// delete a credit card from a customer
const deleteCreditCard = async (stripeCustomerID, cardID) => {
    try {
        const deletedCard = await stripe.customers.deleteSource(
            stripeCustomerID,
            cardID
        );
        return deletedCard
    } catch (error) {
        console.error(error)
        return null
    }
}

// make a credit card the default
const makeDefaultCard = async (stripeCustomerID, cardID) => {
    try {
        const defaultCard = await stripe.customers.update(
            stripeCustomerID,
            { default_source: cardID }
        );
        return defaultCard
    } catch (error) {
        console.error(error)
        return null
    }
}

// make a purchase by card
const purchaseByCardToken = async (creditCardToken, purchaseAmount, imageName) => {
    try {
        const charge = await stripe.charges.create({
            amount: purchaseAmount * 100,
            currency: 'cad',
            source: creditCardToken,
            description: imageName
        });

        return charge
    } catch (error) {
        console.error(error)
        return null
    }
}

// make a purchase by customer (default)
const purchaseByCustomer = async (stripeCustomerID, purchaseAmount, imageName) => {
    try {
        const charge = await stripe.charges.create({
            amount: purchaseAmount * 100,
            currency: 'cad',
            customer: stripeCustomerID,
            description: imageName,
        });

        return charge
    } catch (error) {
        console.error(error)
        return null
    }
}


module.exports = {
    createCustomer,
    tokenizeCard,
    getCreditCard,
    getAllCreditCards,
    saveCreditCardFromToken,
    deleteCreditCard,
    makeDefaultCard,
    purchaseByCardToken,
    purchaseByCustomer
}

