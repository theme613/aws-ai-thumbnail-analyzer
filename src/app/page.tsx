"use client";

import { useState, useRef, useEffect, DragEvent } from "react";
import {
  UploadCloud, Loader2, CheckCircle2, AlertTriangle,
  Type, Tag, ShieldAlert, Image as ImageIcon,
  Sparkles, History, X, ChevronRight, Zap, Eye
} from "lucide-react";

/* ─── Types ─── */
interface Detections {
  labels: any[];
  text: any[];
  moderation: any[];
}

interface HistoryEntry {
  id: string;
  filename: string;
  previewUrl: string;
  score: number;
  results: Detections;
  timestamp: number;
}

type Step = "select" | "upload" | "analyze" | "results";

const STEPS: { key: Step; label: string }[] = [
  { key: "select", label: "Select" },
  { key: "upload", label: "Upload" },
  { key: "analyze", label: "Analyze" },
  { key: "results", label: "Results" },
];

/* ─── Helpers ─── */
function computeScore(results: Detections): number {
  // Label diversity (max 30 pts)
  const labelScore = Math.min(results.labels.length / 10, 1) * 30;

  // Average label confidence (max 25 pts)
  const avgLabelConf = results.labels.length > 0
    ? results.labels.reduce((s: number, l: any) => s + (l.Confidence || 0), 0) / results.labels.length
    : 0;
  const labelConfScore = (avgLabelConf / 100) * 25;

  // Text presence & readability (max 25 pts)
  const textLines = results.text.filter((t: any) => t.Type === "LINE");
  const textScore = Math.min(textLines.length / 3, 1) * 25;

  // Safety bonus (20 pts if clean, less if flagged)
  const safetyScore = results.moderation.length === 0 ? 20 : Math.max(0, 20 - results.moderation.length * 7);

  return Math.round(labelScore + labelConfScore + textScore + safetyScore);
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function getScoreGrade(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Great";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── Components ─── */

function Navbar({ historyCount, onHistoryClick }: { historyCount: number; onHistoryClick: () => void }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Sparkles size={18} />
        <span>Thumbnail AI</span>
      </div>
      <div className="navbar-links">
        <button className="navbar-link" onClick={onHistoryClick}>
          <History size={14} />
          History{historyCount > 0 && ` (${historyCount})`}
        </button>
      </div>
    </nav>
  );
}

function ProgressStepper({ currentStep }: { currentStep: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="stepper animate-fade-in">
      {STEPS.map((step, i) => (
        <div key={step.key} className="stepper-step">
          <div
            className={`stepper-circle ${i < currentIdx ? "completed" : i === currentIdx ? "active" : ""
              }`}
          >
            {i < currentIdx ? <CheckCircle2 size={16} /> : i + 1}
          </div>
          <span
            className={`stepper-label ${i < currentIdx ? "completed" : i === currentIdx ? "active" : ""
              }`}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`stepper-line ${i < currentIdx ? "completed" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ScoreGauge({ score, animated }: { score: number; animated: boolean }) {
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="score-gauge animate-fade-in-scale delay-200">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <circle className="score-gauge-bg" cx="90" cy="90" r={radius} />
        <circle
          className="score-gauge-fill"
          cx="90" cy="90" r={radius}
          stroke="url(#gaugeGrad)"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : circumference}
        />
      </svg>
      <div className="score-gauge-text">
        <span className="score-gauge-value" style={{ color }}>{animated ? score : 0}</span>
        <span className="score-gauge-label">{getScoreGrade(score)}</span>
      </div>
    </div>
  );
}

function ConfidenceBar({ label, confidence, delay }: { label: string; confidence: number; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(confidence), delay);
    return () => clearTimeout(t);
  }, [confidence, delay]);

  return (
    <div className="confidence-bar-item">
      <span className="confidence-bar-label">{label}</span>
      <div className="confidence-bar-track">
        <div className="confidence-bar-fill" style={{ width: `${width}%` }} />
      </div>
      <span className="confidence-bar-value">{Math.round(confidence)}%</span>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", width: "100%", maxWidth: "700px" }}>
      <div className="skeleton" style={{ width: "100%", height: "200px" }} />
      <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
        <div className="skeleton" style={{ flex: 1, height: "120px" }} />
        <div className="skeleton" style={{ flex: 1, height: "120px" }} />
      </div>
      <div className="skeleton" style={{ width: "100%", height: "80px" }} />
    </div>
  );
}

/* ─── Main ─── */
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [results, setResults] = useState<Detections | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scoreAnimated, setScoreAnimated] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("thumbnail-history");
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveHistory = (entry: HistoryEntry) => {
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    try { localStorage.setItem("thumbnail-history", JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
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
    setScoreAnimated(false);
    setStep("upload");
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleProcess = async () => {
    if (!file) return;
    try {
      setError(null);
      setStep("upload");

      // 1. Get Presigned URL
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!uploadRes.ok) throw new Error("Failed to initialize upload.");
      const { url, key } = await uploadRes.json();

      // 2. Upload to S3
      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      setStep("analyze");

      // 3. Analyze with Rekognition
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!analyzeRes.ok) throw new Error("Analysis failed. Please try again.");
      const data: Detections = await analyzeRes.json();
      setResults(data);
      setStep("results");

      // Animate score after short delay
      setTimeout(() => setScoreAnimated(true), 300);

      // Save to history
      const score = computeScore(data);
      saveHistory({
        id: Date.now().toString(),
        filename: file.name,
        previewUrl: previewUrl || "",
        score,
        results: data,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setStep("upload");
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
    setScoreAnimated(false);
    setStep("select");
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setPreviewUrl(entry.previewUrl);
    setResults(entry.results);
    setStep("results");
    setHistoryOpen(false);
    setTimeout(() => setScoreAnimated(true), 300);
  };

  const score = results ? computeScore(results) : 0;

  return (
    <>
      <Navbar historyCount={history.length} onHistoryClick={() => setHistoryOpen(!historyOpen)} />

      {/* History Sidebar */}
      <div className={`history-sidebar ${historyOpen ? "open" : ""}`}>
        <div className="history-sidebar-header">
          <h3>Analysis History</h3>
          <button className="btn btn-ghost" onClick={() => setHistoryOpen(false)} style={{ padding: "0.3rem" }}>
            <X size={18} />
          </button>
        </div>
        <div className="history-sidebar-body">
          {history.length === 0 ? (
            <div className="history-empty">
              <History size={32} />
              <p style={{ fontSize: "0.85rem" }}>No analyses yet</p>
              <p style={{ fontSize: "0.75rem" }}>Your results will appear here</p>
            </div>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="history-card" onClick={() => loadFromHistory(entry)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.previewUrl} alt={entry.filename} />
                <div className="history-card-info">
                  <div className="history-card-name">{entry.filename}</div>
                  <div className="history-card-meta">{timeAgo(entry.timestamp)}</div>
                </div>
                <span className="history-card-score" style={{ color: getScoreColor(entry.score) }}>
                  {entry.score}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* History toggle (desktop) */}
      {history.length > 0 && !historyOpen && (
        <button className="history-toggle" onClick={() => setHistoryOpen(true)}>
          <History size={12} />
          History ({history.length})
        </button>
      )}

      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "6rem 1.5rem 2rem" }}>
        <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto", flex: 1 }}>

          {/* Header */}
          <div className="animate-fade-in" style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1 className="text-gradient" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", marginBottom: "0.75rem", lineHeight: 1.1 }}>
              AI Thumbnail Analyzer
            </h1>
            <p style={{ color: "#71717a", fontSize: "clamp(0.9rem, 2vw, 1.15rem)", maxWidth: "600px", margin: "0 auto" }}>
              Evaluate your video thumbnails instantly. Powered by{" "}
              <span className="text-gradient-primary" style={{ fontWeight: 600 }}>AWS Rekognition</span> to detect objects, text, and ensure content safety.
            </p>
          </div>

          {/* Progress Stepper */}
          <ProgressStepper currentStep={step} />

          {/* ─── Select / Upload Stage ─── */}
          {step !== "results" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem" }}>

              {step === "select" && (
                <div
                  className={`dropzone animate-fade-in ${isDragging ? "dragging" : ""}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="dropzone-icon">
                    <UploadCloud size={36} style={{ color: "var(--primary)" }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <h3 style={{ fontSize: "1.3rem", color: "#fff", marginBottom: "0.5rem" }}>
                      Drop your thumbnail here
                    </h3>
                    <p style={{ color: "#52525b", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
                      Supports JPG, PNG up to 5MB
                    </p>
                    <button
                      className="btn btn-secondary"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      <Eye size={16} />
                      Browse Files
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept="image/jpeg, image/png"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFile(e.target.files[0]);
                    }}
                  />
                </div>
              )}

              {(step === "upload" || step === "analyze") && previewUrl && (
                <div className="glass-panel-static animate-fade-in" style={{ width: "100%", maxWidth: "700px", padding: "1.5rem" }}>
                  <div style={{ width: "100%", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)", marginBottom: "1.5rem", position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Thumbnail Preview" style={{ width: "100%", height: "auto", display: "block" }} />
                    {step === "analyze" && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "rgba(6,6,10,0.6)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem",
                        backdropFilter: "blur(4px)"
                      }}>
                        <Loader2 className="animate-spin" size={40} style={{ color: "var(--primary)" }} />
                        <span style={{ color: "#fff", fontWeight: 600, fontSize: "1rem" }}>Analyzing with AI...</span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div style={{ width: "100%", padding: "0.75rem 1rem", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "var(--radius-sm)", color: "var(--accent)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem", fontSize: "0.9rem" }}>
                      <AlertTriangle size={18} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={reset} disabled={step === "analyze"}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 2 }}
                      onClick={handleProcess}
                      disabled={step === "analyze"}
                    >
                      {step === "upload" ? (
                        <><Zap size={18} /> Analyze Thumbnail</>
                      ) : (
                        <><Loader2 className="animate-spin" size={18} /> Processing...</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Results Stage ─── */}
          {step === "results" && results && (
            <div className="animate-fade-in">
              {/* Score + Actions Row */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", marginBottom: "2.5rem" }}>
                <ScoreGauge score={score} animated={scoreAnimated} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#a1a1aa", fontSize: "0.9rem", marginBottom: "1rem" }}>
                    Your thumbnail scored <strong style={{ color: getScoreColor(score) }}>{score}/100</strong> — {getScoreGrade(score).toLowerCase()}
                  </p>
                  <button className="btn btn-primary" onClick={reset}>
                    <ChevronRight size={16} /> Analyze Another
                  </button>
                </div>
              </div>

              {/* Results Grid */}
              <div className="bento-grid">

                {/* Preview */}
                <div className="glass-panel result-card animate-fade-in delay-100" style={{ gridColumn: "span 1" }}>
                  <div className="result-card-header">
                    <div className="result-card-icon" style={{ background: "rgba(99,102,241,0.15)" }}>
                      <ImageIcon size={20} style={{ color: "var(--primary)" }} />
                    </div>
                    <div>
                      <div className="result-card-title">Uploaded Image</div>
                      <div className="result-card-subtitle">{file?.name || "Preview"}</div>
                    </div>
                  </div>
                  <div style={{ width: "100%", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl!} alt="Thumbnail" style={{ width: "100%", height: "auto", display: "block" }} />
                  </div>
                </div>

                {/* Labels / Objects */}
                <div className="glass-panel result-card animate-fade-in delay-200" style={{ gridColumn: "span 2" }}>
                  <div className="result-card-header">
                    <div className="result-card-icon" style={{ background: "rgba(129,164,249,0.15)" }}>
                      <Tag size={20} style={{ color: "#818cf8" }} />
                    </div>
                    <div>
                      <div className="result-card-title">Detected Objects & Themes</div>
                      <div className="result-card-subtitle">{results.labels.length} labels found</div>
                    </div>
                  </div>

                  {results.labels.length > 0 ? (
                    <div className="confidence-bar-container">
                      {results.labels.slice(0, 8).map((label: any, i: number) => (
                        <ConfidenceBar
                          key={i}
                          label={label.Name}
                          confidence={label.Confidence}
                          delay={200 + i * 100}
                        />
                      ))}
                      {results.labels.length > 8 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                          {results.labels.slice(8).map((label: any, i: number) => (
                            <span key={i} className="tag">
                              {label.Name}
                              <span className="tag-value">{Math.round(label.Confidence)}%</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: "#52525b", fontSize: "0.9rem" }}>No prominent labels detected.</p>
                  )}
                </div>

                {/* Text Detection */}
                <div className="glass-panel result-card animate-fade-in delay-300" style={{ gridColumn: "span 2" }}>
                  <div className="result-card-header">
                    <div className="result-card-icon" style={{ background: "rgba(34,197,94,0.15)" }}>
                      <Type size={20} style={{ color: "#22c55e" }} />
                    </div>
                    <div>
                      <div className="result-card-title">Text Detection</div>
                      <div className="result-card-subtitle">
                        {results.text.filter((t: any) => t.Type === "LINE").length} lines detected
                      </div>
                    </div>
                  </div>

                  {results.text.filter((t: any) => t.Type === "LINE").length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      {results.text.filter((t: any) => t.Type === "LINE").map((text: any, i: number) => (
                        <div key={i} className="text-detection-item">
                          <span style={{ color: "#fff", fontSize: "1rem", fontWeight: 500 }}>
                            &quot;{text.DetectedText}&quot;
                          </span>
                          <p style={{ color: "#71717a", fontSize: "0.75rem", marginTop: "0.35rem" }}>
                            Confidence: {Math.round(text.Confidence)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "1.5rem", background: "var(--surface-2)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                      <p style={{ color: "#52525b" }}>No readable text detected in thumbnail.</p>
                    </div>
                  )}
                </div>

                {/* Content Moderation */}
                <div className="glass-panel result-card animate-fade-in delay-400" style={{ gridColumn: "span 1" }}>
                  <div className="result-card-header">
                    <div className="result-card-icon" style={{ background: "rgba(244,63,94,0.15)" }}>
                      <ShieldAlert size={20} style={{ color: "var(--accent)" }} />
                    </div>
                    <div>
                      <div className="result-card-title">Content Safety</div>
                      <div className="result-card-subtitle">Moderation check</div>
                    </div>
                  </div>

                  {results.moderation.length > 0 ? (
                    <div className="moderation-warning">
                      <AlertTriangle size={20} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <h4 style={{ color: "var(--accent)", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>
                          Flags Found
                        </h4>
                        {results.moderation.map((mod: any, i: number) => (
                          <div key={i} style={{ marginBottom: "0.25rem", fontSize: "0.85rem", color: "#e4e4e7" }}>
                            • {mod.Name} ({Math.round(mod.Confidence)}%)
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="moderation-safe">
                      <CheckCircle2 size={24} style={{ color: "#22c55e", flexShrink: 0 }} />
                      <div>
                        <h4 style={{ color: "#22c55e", fontWeight: 600, fontSize: "0.9rem" }}>All Clear</h4>
                        <p style={{ color: "#71717a", fontSize: "0.8rem", marginTop: "0.15rem" }}>
                          No sensitive content detected.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="footer" style={{ width: "100%", maxWidth: "1100px" }}>
          <div className="footer-badges">
            <span className="footer-badge"><Zap size={12} /> Next.js</span>
            <span className="footer-badge"><ImageIcon size={12} /> AWS S3</span>
            <span className="footer-badge"><Sparkles size={12} /> AWS Rekognition</span>
          </div>
          <p className="footer-text">Built with AWS AI Services &middot; 2025</p>
        </footer>
      </main>
    </>
  );
}
