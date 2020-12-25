var mongoose = require('mongoose')
    , Schema = mongoose.Schema;


const ImageSchema = new Schema({
    photographer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    nameOfImage: {
        type: String,
        required: true
    },
    cost: {
        type: Number,
        required: true
    },
    discount_amount: {
        type: Number,
        required: true,
        default: 0
    },
    in_market: {
        type: Boolean,
        required: true,
        default: true
    },

    has_been_purchased: {
        type: Boolean,
        required: true,
        default: false
    },

    dateTakenOn: {
        type: Date
    }

})

module.exports = Images = mongoose.model("images", ImageSchema);