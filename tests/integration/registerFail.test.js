// Integration test registering with an already used email
const expect = require('chai').expect
const request = require('request')

describe("BAD Register", function () {

    const badLoginResult = {
        errors: [
            {
                msg: " User already exists "
            }
        ]
    }

    const url = "http://localhost:3000/register"

    const requestBody = {
        "firstName": "im",
        "lastName": "already",
        "email": "previouslyUsed@email.com",
        "password": "a customer"
    }


    it("Try registering with already used email", function (done) {
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