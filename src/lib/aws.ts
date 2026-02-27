import { S3Client } from "@aws-sdk/client-s3";
import { RekognitionClient } from "@aws-sdk/client-rekognition";

const region = process.env.AWS_REGION || "us-east-1";

// Ensure AWS credentials are provided
const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
};

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn("AWS credentials are not fully set in environment configuring AWS SDK.");
}

export const s3Client = new S3Client({
    region,
    credentials,
});

export const rekognitionClient = new RekognitionClient({
    region,
    credentials,
});
