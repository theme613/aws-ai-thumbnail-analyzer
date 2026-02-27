"use client";

import { useState, useRef, DragEvent } from "react";
import { UploadCloud, Loader2, CheckCircle2, AlertTriangle, Type, Tag, ShieldAlert, Image as ImageIcon } from "lucide-react";

interface Detections {
  labels: any[];
  text: any[];
  moderation: any[];
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<Detections | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError("Please upload a valid image file (JPG, PNG).");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB.");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError(null);
    setResults(null);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);

      // 1. Get Presigned URL
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });

      if (!uploadRes.ok) throw new Error("Failed to initialize upload");

      const { url, key } = await uploadRes.json();

      // 2. Upload to S3
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      setIsUploading(false);
      setIsAnalyzing(true);

      // 3. Analyze with Rekognition
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });

      if (!analyzeRes.ok) throw new Error("Failed to analyze image");

      const data = await analyzeRes.json();
      setResults(data);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem' }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1.1 }}>
            AI Thumbnail Analyzer
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
            Instantly evaluate your video thumbnails. Powered by AWS Rekognition to detect text, objects, and ensure content moderation.
          </p>
        </div>

        {/* Upload & Preview Section */}
        {!results && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>

            {!previewUrl ? (
              <div
                className={`glass-panel delay-100 animate-fade-in ${isDragging ? 'dragging' : ''}`}
                style={{
                  padding: '4rem 2rem',
                  width: '100%',
                  maxWidth: '700px',
                  border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: isDragging ? 'var(--surface-3)' : 'var(--surface-2)'
                }}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <UploadCloud size={40} style={{ color: 'var(--primary)' }} />
                  </div>
                  <h3 style={{ fontSize: '1.5rem', color: '#fff' }}>Drag & drop your thumbnail</h3>
                  <p style={{ color: '#71717a', fontSize: '1rem' }}>Supports JPG, PNG up to 5MB</p>
                  <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    Browse Files
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/jpeg, image/png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '700px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Thumbnail Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>

                {error && (
                  <div style={{ width: '100%', padding: '1rem', background: 'rgba(255, 71, 126, 0.1)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <AlertTriangle size={20} />
                    <span>{error}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={reset} disabled={isUploading || isAnalyzing}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    onClick={handleProcess}
                    disabled={isUploading || isAnalyzing}
                  >
                    {isUploading ? (
                      <><Loader2 className="animate-spin" size={20} /> Uploading...</>
                    ) : isAnalyzing ? (
                      <><Loader2 className="animate-spin" size={20} /> Analyzing AI...</>
                    ) : (
                      <><CheckCircle2 size={20} /> Analyze Thumbnail</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', color: '#fff' }}>Analysis Results</h2>
              <button className="btn btn-secondary" onClick={reset}>Analyze Another</button>
            </div>

            <div className="bento-grid">
              {/* Preview Box */}
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gridColumn: 'span 1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                  <ImageIcon size={24} />
                  <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Uploaded Image</h3>
                </div>
                <div style={{ width: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl!} alt="Thumbnail Preview" style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }} />
                </div>
              </div>

              {/* Labels/Tags Box */}
              <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#8ba4f9' }}>
                  <Tag size={24} />
                  <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Detected Objects & Themes</h3>
                </div>

                {results.labels.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {results.labels.map((label: any, i: number) => (
                      <div key={i} style={{ padding: '0.5rem 1rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#fff', fontSize: '0.9rem' }}>{label.Name}</span>
                        <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}>{Math.round(label.Confidence)}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#71717a' }}>No prominent labels detected.</p>
                )}
              </div>

              {/* Text Detection Box */}
              <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#4ade80' }}>
                  <Type size={24} />
                  <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Text Detection</h3>
                </div>

                {results.text.filter(t => t.Type === 'LINE').length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {results.text.filter(t => t.Type === 'LINE').map((text: any, i: number) => (
                      <div key={i} style={{ padding: '1rem', background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 500, fontFamily: 'Outfit, sans-serif' }}>&quot;{text.DetectedText}&quot;</span>
                        <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginTop: '0.5rem' }}>Confidence: {Math.round(text.Confidence)}%</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1.5rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <p style={{ color: '#71717a' }}>No readable text detected in thumbnail.</p>
                  </div>
                )}
              </div>

              {/* Content Moderation Box */}
              <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gridColumn: 'span 1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent)' }}>
                  <ShieldAlert size={24} />
                  <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Content Safety</h3>
                </div>

                {results.moderation.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(255, 71, 126, 0.1)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <AlertTriangle size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem', fontWeight: 600 }}>Moderation Flags Found</h4>
                        {results.moderation.map((mod: any, i: number) => (
                          <div key={i} style={{ marginBottom: '0.25rem', fontSize: '0.9rem', color: '#fff' }}>
                            • {mod.Name} ({Math.round(mod.Confidence)}%)
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1.5rem', background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle2 size={24} style={{ color: '#4ade80' }} />
                    <div>
                      <h4 style={{ color: '#4ade80', fontWeight: 600 }}>All Clear</h4>
                      <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>No sensitive content detected.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Required AWS Rekognition Spin Animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}} />
    </main>
  );
}
