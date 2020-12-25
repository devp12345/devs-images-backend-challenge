const AWS = require("aws-sdk")
const S3 = AWS.S3


AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new S3();


const uploadFile = async (buffer, name, type) => {

    try {
        const params = {
            Body: buffer,
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            ContentType: type.mime,
            Key: `${name}`,
        };
        const uploadObject = await s3.upload(params).promise()
        return uploadObject
    } catch (error) {
        console.error(error)
        res.status(500).send({ error: error })
    }
};

const deleteFilesFunction = async (fileId) => {
    try {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: `${fileId}`,
        };

        const deleteObject = await s3.deleteObject(params).promise()
        return deleteObject
    } catch (error) {
        console.error(error)
        res.status(500).send({ error: error })
    }

};


module.exports = {
    uploadFile,
    deleteFilesFunction
}