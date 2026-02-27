import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/aws";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(req: NextRequest) {
    try {
        const { filename, contentType } = await req.json();

        if (!filename || !contentType) {
            return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
        }

        const key = `thumbnails/${Date.now()}-${filename.replace(/\s+/g, '-')}`;

        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        return NextResponse.json({
            url,
            method: "PUT",
            key
        });
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
