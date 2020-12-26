// Unit test trying to login without an email present (express validator)
const expect = require('chai').expect
const request = require('request')

describe("BAD Login", function () {

    const badLoginResult = {
        errors: [
            {
                msg: "password is required",
                param: "password",
                location: "body"
            }
        ]
    }
    const url = "http://localhost:3000/login"

    const requestBody = {
        "email": "santa@northpole.com"
    }


    it("Login without password", function (done) {
        request({
            url: url,
            method: "POST",
            headers: {
                'Accept': 'application/json',
                "content-type": "application/json",
            },
            body: JSON.stringify(requestBody)
        }, function (
            error,
            response,
            body
        ) {
            if (error) {
                console.log('error:', error);
            }
            expect(response.statusCode).to.equal(400);
            expect(body).to.equal(JSON.stringify(badLoginResult));
            done();
        });
    })
})