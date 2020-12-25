const AWS = require("aws-sdk")
const S3 = AWS.S3


AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new S3();


const uploadFile = (buffer, name, type) => {
    const params = {
        Body: buffer,
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        ContentType: type.mime,
        Key: `${name}`,
    };
    return s3.upload(params).promise();
};

const deleteFilesFunction = (fileId) => {
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${fileId}`,
    };
    return s3.deleteObject(params).promise();
};


module.exports = {
    uploadFile,
    deleteFilesFunction
}