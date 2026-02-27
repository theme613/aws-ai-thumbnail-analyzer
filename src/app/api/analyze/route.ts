import { NextRequest, NextResponse } from "next/server";
import { rekognitionClient } from "@/lib/aws";
import { DetectLabelsCommand, DetectTextCommand, DetectModerationLabelsCommand } from "@aws-sdk/client-rekognition";

export async function POST(req: NextRequest) {
    try {
        const { key } = await req.json();

        if (!key) {
            return NextResponse.json({ error: "Missing S3 object key" }, { status: 400 });
        }

        const s3ObjectParams = {
            S3Object: {
                Bucket: process.env.S3_BUCKET_NAME,
                Name: key,
            }
        };

        // Run parallel Rekognition commands for faster response
        const [labelsData, textData, moderationData] = await Promise.all([
            rekognitionClient.send(new DetectLabelsCommand({
                Image: s3ObjectParams,
                MaxLabels: 15,
                MinConfidence: 75
            })),
            rekognitionClient.send(new DetectTextCommand({
                Image: s3ObjectParams
            })),
            rekognitionClient.send(new DetectModerationLabelsCommand({
                Image: s3ObjectParams,
                MinConfidence: 70
            }))
        ]);

        return NextResponse.json({
            labels: labelsData.Labels || [],
            text: textData.TextDetections || [],
            moderation: moderationData.ModerationLabels || []
        });
    } catch (error) {
        console.error("Error analyzing image:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
