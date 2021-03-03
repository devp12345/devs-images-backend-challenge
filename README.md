## Scope

The inspiration for this was an online image store, where customers can purchase images/wallpapers from me and select people (admins)

The goal of this image repository is to:
- Allow admins to upload images to a reliable service ([AWS S3](https://aws.amazon.com/s3/)) 
- Access control to make sure that only admins can edit/delete the images
- Allow admins to make changes to the images (cost, discounts, name, etc)
- Allow customers to safely and securely purchase images ([Stripe](https://stripe.com/en-ca))
- Allow users to download images they have purchased
- Ensure customers can only access images they have purchased (permissions)
- Allow customers to add/remove/change credit cards in a safe and secure way ([Stripe](https://stripe.com/en-ca)) 
(note: some of the transaction/credit-card/Stripe related routes are experimental)

## Setup 

This project was built using Node.js.
Please visit [Node.js](https://nodejs.org/en/) to download it.

To get started, you need to get the following:

- An [AWS](https://aws.amazon.com/) account
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) database setup
- A [Stripe](https://dashboard.stripe.com/register) account

In order to run the codebase, please perform the following steps:

1. `git clone https://github.com/devp12345/shopify-backend-challenge.git` to clone the repo, then `cd` to the root directory

2. Once you've setup the repository, please create a `.env` file in the root directory.
   Inside the `.env` file, please insert the following and save:

```
MONGO_URI=
JWT_SECRET=
ADMIN_SECRET_KEY=
AWS_ACCESS_KEY=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
AWS_S3_REGION_NAME=
STRIPE_API_KEY=
```
  - JWT_SECRET and ADMIN_SECRET_KEY can be anything you desire
  - Ensure the permissions allow application access to AWS S3
  - Configure public or IP address access to MongoDB
  - Recommended to use the test token for Stripe

3. `npm i` to install all dependencies

4. `npm start` to start the server

5. `npm test` to run the tests

## Endpoints and Application flow

### User/Customer flow
- Customer register at `POST /register` which will return a signed token if successful
- Customer can login at `POST /login` which will return a signed token if successful
- Customer can now access protected routes with their token to adjust their profile:
  - `POST /customer/credit-card/tokenize` which will tokenize a card (for now, this endpoint is hard coded and can only tokenize a test card provided by stripe)
  - `POST /customer/save-credit-card` which will save a credit card to the users customer profile
  - `POST /customer/remove-credit-card/:card_id` will remove a card, where card_id is the stripe tokenized card id
  - `GET /customer/list-all-credit-cards` will return all the users credit cards (as tokenized objects)
  
- They can also purchase and get images with their token:
  - `POST /customer/image/:image_id/purchase` will purchase the image
  - `GET /customer/image/:image_id` will let the user get a link to view/download an image they purchased
  - `GET /customer/images` will list all the images they have purchased (as objects)
  
### Admin/Store owner flow
- Admin register at `POST /admin/register` with the admin secret key, which will return a signed token 
- Admin can login at `POST /login` which will return a signed token 
- Admin can now access protected routes for admins:
  - `POST /admin/upload` to upload a single image
  - `GET /admin/images/:image_id` gets the specified image as an object
  - `GET /admin/images` gets all images as objects
  - `DELETE /admin/images/:image_id` will remove the image from the store. If it has not been purchased, we will remove the image from S3 and delete the object from MongoDB, otherwise just mark it as not available for further purchase so that those who have already bought it dont lose their image
  - `PUT /admin/image/:image_id/set-name` sets the name of the image
  - `PUT /admin/image/:image_id/set-cost` sets the cost for the image
  - `PUT /admin/image/:image_id/discount/amount` sets a discount for the image (caller must remove)
  - `PUT /admin/image/:image_id/discount/remove` removes the discount


## Testing
The server must be running for testing to work

Upon running `npm test`, your output should be similar to this:
Running the tests should give you an image similar to this:
![testing photo](https://user-images.githubusercontent.com/42615089/103162365-a9514a00-47bd-11eb-9f34-e6c0280eba21.png)
indicating the unit test and integration test have passed

## Next steps
- Complete all unit and integration tests to ensure 100% coverage
- Implement a safe and secure way to send credit card info over an http request (righ now, I am using hard coded test cards provided by Stripe) to allow real functionallity
- Allow users to safely and securely pay using other methods (Debit, bitcoin, etc)
- Enable refunds on transactions
- Allow for Bulk operations, such as uploading, deleting, and setting discounts to multiple images at once
- Enable timed discounts so that discounts are automaitcally removed 
- Convert to an online "marketplace" by onboarding vendors so that customer purchases will pay out to the person who took the image
- Containerize this server with Docker and host to allow for a reliable CI/CD pipeline
- Create documentation to outline all the features, endpoints, requests/responses from the endpoints and to provide sample calls to endpoints
