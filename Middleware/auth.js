const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    //get the token from header
    const token = req.header("x-auth-token");

    //check if token exists
    if (!token) {
        return res.status(401).json({ msg: "No token, authorization denied" });
    }

    //verify the token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded.user;
        next();
    } catch {
        res.status(401).json({ msgh: "token not valid " });
    }
};