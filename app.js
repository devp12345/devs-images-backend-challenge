var express = require("express");
var mongoose = require("mongoose");
const User = require("./Models/UsersModel");
require('dotenv').config()

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

var PORT = 3000;

// Initialize Express
var app = express();

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Make public static folder
app.use(express.static("public"));

// Routes
app.get("/", function (req, res) {
    res.json("Hello from demo app!, DATABASE STATUS IS: " + mongoose.connection.readyState);
});


app.use("/", require('./Routes/UserRoutes'))
app.use("/", require('./Routes/ImageRoutes'))


app.listen(PORT, function () {
    console.log("Listening on port " + PORT + ".");
});