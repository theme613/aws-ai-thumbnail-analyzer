# AI Thumbnail Analyzer

A modern web application that instantly evaluates video thumbnails using **AWS Rekognition**. Upload any image and get detailed AI-powered analysis including object detection, text recognition, and content moderation -- all through a sleek, dark-themed interface.

---

## Features

- **Object & Scene Detection** -- Identifies objects, themes, and scenes with confidence scores.
- **Text Recognition (OCR)** -- Extracts and displays readable text found in your thumbnail.
- **Content Moderation** -- Flags potentially sensitive or unsafe content automatically.
- **Drag & Drop Upload** -- Intuitive file upload with image preview before analysis.
- **Presigned URL Uploads** -- Secure, direct-to-S3 uploads without exposing credentials to the client.

---

## Tech Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Framework      | Next.js 14 (App Router)             |
| Language       | TypeScript                          |
| Storage        | AWS S3                              |
| AI / Vision    | AWS Rekognition                     |
| Auth / Upload  | S3 Presigned URLs (`@aws-sdk/s3-request-presigner`) |
| Icons          | Lucide React                        |
| Styling        | Vanilla CSS (custom dark theme)     |

---

## Architecture

```
Client (React)
  |
  |-- POST /api/upload   -->  Generates S3 presigned URL
  |-- PUT  (presigned)   -->  Uploads image directly to S3
  |-- POST /api/analyze   -->  Triggers Rekognition analysis
  |
  v
AWS S3 Bucket  <-->  AWS Rekognition
```

1. The client requests a presigned upload URL from the Next.js API.
2. The image is uploaded directly to S3 using the presigned URL.
3. A second API call triggers AWS Rekognition to analyze the uploaded image.
4. Results (labels, text, moderation flags) are returned and rendered in a bento-grid layout.

---

## Getting Started

### Prerequisites

- Node.js 18+
- An AWS account with access to **S3** and **Rekognition**

### 1. Clone the repository

```bash
git clone https://github.com/your-username/aws-ai-thumbnail-analyzer.git
cd aws-ai-thumbnail-analyzer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name
AWS_REGION=ap-southeast-1
```

### 4. Provision AWS resources

A CloudFormation template is included for one-click infrastructure setup:

```bash
aws cloudformation deploy \
  --template-file aws-setup.yaml \
  --stack-name thumbnail-analyzer \
  --capabilities CAPABILITY_NAMED_IAM
```

This creates:
- A private S3 bucket with CORS configured for uploads
- An IAM user with scoped permissions for S3 and Rekognition
- Access keys output for your `.env.local`

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start analyzing thumbnails.

---

## Project Structure

```
src/
  app/
    api/
      upload/route.ts    # Presigned URL generation
      analyze/route.ts   # Rekognition analysis endpoint
    page.tsx             # Main UI (upload, preview, results)
    layout.tsx           # Root layout and metadata
    globals.css          # Design system and dark theme
    page.module.css      # Page-specific styles
  lib/                   # Shared utilities
aws-setup.yaml           # CloudFormation template
```

---

## API Reference

### `POST /api/upload`

Generates a presigned S3 URL for secure client-side upload.

**Request body:**
```json
{ "filename": "thumbnail.jpg", "contentType": "image/jpeg" }
```

**Response:**
```json
{ "url": "https://s3.amazonaws.com/...", "key": "uploads/abc123.jpg" }
```

### `POST /api/analyze`

Runs Rekognition analysis on an uploaded image.

**Request body:**
```json
{ "key": "uploads/abc123.jpg" }
```

**Response:**
```json
{
  "labels": [{ "Name": "Person", "Confidence": 99.2 }],
  "text": [{ "DetectedText": "SUBSCRIBE", "Type": "LINE", "Confidence": 98.1 }],
  "moderation": []
}
```

---

## License

MIT
