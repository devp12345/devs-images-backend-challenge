var mongoose = require('mongoose')
    , Schema = mongoose.Schema;

const UserSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    accountType: {
        type: String,
        required: true,
        default: "customer"
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    stripeCustomerID: {
        type: String
    },
    purchasedImages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "images"
    }],

})


module.exports = Users = mongoose.model("user", UserSchema);