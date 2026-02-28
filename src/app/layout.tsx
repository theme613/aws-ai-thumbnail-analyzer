import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Thumbnail Analyzer — Powered by AWS Rekognition",
  description: "Instantly evaluate your video thumbnails with AI. Detect objects, text, and content safety using AWS Rekognition.",
  keywords: ["thumbnail analyzer", "AWS Rekognition", "AI image analysis", "content moderation", "video thumbnail"],
  openGraph: {
    title: "AI Thumbnail Analyzer",
    description: "Evaluate your video thumbnails with AI-powered analysis.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#06060a" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
