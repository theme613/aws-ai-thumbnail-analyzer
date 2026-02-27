import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AWS AI Thumbnail Analyzer",
  description: "Analyze your video thumbnails using AWS Rekognition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
