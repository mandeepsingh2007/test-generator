"use client";

import { useState } from "react";
import {
  FlaskConical,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  ListChecks,
  Download,
} from "lucide-react";
import { API_BASE, apiFetch } from "@/lib/api";

const SCIENCE_SUBJECT_ID = 3;

interface Chapter {
  id: string;
  number: number;
  title: string;
  start_page: number;
  end_page?: number | null;
}

const FORMAT_OPTIONS = [
  { id: "mcq", label: "Multiple Choice Questions (MCQ)" },
  { id: "assertion_reason", label: "Assertion and Reason" },
  { id: "true_false", label: "True / False" },
  { id: "fill_blank", label: "Fill in the Blanks" },
  { id: "word_match", label: "Match the Following — Word to Word", group: "match" as const },
  { id: "picture_match", label: "Match the Following — Picture to Word", group: "match" as const },
  { id: "short_answer", label: "Short Answer (Subjective)" },
];

type Step = "subject" | "chapters" | "format" | "generating" | "complete" | "failed";

export default function SubjectSelector() {
  const [step, setStep] = useState<Step>("subject");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    FORMAT_OPTIONS.map((f) => f.id)
  );
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [testId, setTestId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadChapters = async () => {
    setLoadingChapters(true);
    setErrorMsg("");
    try {
      const res = await apiFetch(`${API_BASE}/subjects/${SCIENCE_SUBJECT_ID}/chapters`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to load chapters");
      }
      const data: Chapter[] = await res.json();
      setChapters(data);
      setSelectedChapterIds([]);
      setStep("chapters");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to load chapters");
    } finally {
      setLoadingChapters(false);
    }
  };

  const toggleChapter = (id: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedChapterIds.length === 0) {
      setErrorMsg("Select at least one chapter.");
      return;
    }
    if (selectedTypes.length === 0) {
      setErrorMsg("Select at least one question format.");
      return;
    }

    setStep("generating");
    setErrorMsg("");
    setProgress(0);
    setCurrentStep("Starting generation…");

    try {
      const res = await apiFetch(`${API_BASE}/generate-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: SCIENCE_SUBJECT_ID,
          total_marks: 50,
          chapter_ids: selectedChapterIds,
          include_types: selectedTypes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to start generation");
      }

      const data = await res.json();
      pollStatus(data.task_id);
    } catch (e) {
      setStep("failed");
      setErrorMsg(e instanceof Error ? e.message : "Generation failed");
    }
  };

  const pollStatus = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`${API_BASE}/status/${taskId}`);
        const data = await res.json();
        setProgress(data.progress);
        if (data.current_step) setCurrentStep(data.current_step);

        if (data.status === "completed") {
          clearInterval(interval);
          if (data.result_id) {
            setTestId(String(data.result_id));
            sessionStorage.setItem("lastGeneratedTestId", String(data.result_id));
          }
          setStep("complete");
        } else if (data.status === "failed") {
          clearInterval(interval);
          setStep("failed");
          setErrorMsg(data.current_step || "Generation failed");
        }
      } catch {
        /* keep polling */
      }
    }, 1000);
  };

  const downloadPdf = async (id: string) => {
    const res = await apiFetch(`${API_BASE}/test/${id}/pdf`);
    if (!res.ok) throw new Error("PDF download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `science_test_${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === "failed") {
    return (
      <div className="w-full max-w-2xl p-12 mx-auto text-center glass-card rounded-3xl">
        <h3 className="mb-4 text-2xl font-bold text-red-400">Generation Failed</h3>
        <p className="mb-8 text-gray-400">{errorMsg}</p>
        <button
          onClick={() => { setStep("format"); setErrorMsg(""); }}
          className="px-8 py-4 font-semibold text-black transition-colors bg-white rounded-xl hover:bg-gray-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (step === "generating" || step === "complete") {
    return (
      <div className="w-full max-w-2xl p-12 mx-auto text-center glass-card rounded-3xl">
        {step === "complete" ? (
          <div className="flex flex-col items-center duration-500 animate-in fade-in zoom-in">
            <div className="flex items-center justify-center w-24 h-24 mb-6 text-green-500 rounded-full bg-green-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h3 className="mb-2 text-3xl font-bold">Test Ready!</h3>
            <p className="mb-8 text-gray-400">
              Your 50-mark exam paper has been generated from selected chapters and formats.
            </p>
            <div className="flex flex-col w-full gap-3 sm:flex-row sm:justify-center">
              <a
                href={`/test/${testId}`}
                className="px-8 py-4 font-semibold text-black transition-colors bg-white rounded-xl hover:bg-gray-200"
              >
                Take Test Online
              </a>
              <button
                onClick={() => testId && downloadPdf(testId)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold text-white transition-colors bg-blue-600 rounded-xl hover:bg-blue-700"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full max-w-md mx-auto">
            <Loader2 className="w-16 h-16 mb-8 text-blue-500 animate-spin" />
            <h3 className="mb-2 text-2xl font-semibold">{currentStep}</h3>
            <div className="w-full h-3 mt-8 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="w-full mt-3 text-right text-gray-400">{progress}%</p>
          </div>
        )}
      </div>
    );
  }

  if (step === "format") {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <button
          onClick={() => setStep("chapters")}
          className="inline-flex items-center mb-6 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Chapters
        </button>
        <div className="p-8 glass-card rounded-3xl">
          <div className="flex items-center gap-3 mb-2">
            <ListChecks className="w-6 h-6 text-blue-400" />
            <h3 className="text-2xl font-bold">Select Test Format</h3>
          </div>
          <p className="mb-6 text-gray-400">
            Choose question types for your 50-mark paper ({selectedChapterIds.length} chapter
            {selectedChapterIds.length !== 1 ? "s" : ""} selected).
          </p>

          <div className="space-y-3">
            {FORMAT_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                  selectedTypes.includes(opt.id)
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10 hover:border-white/20"
                } ${opt.group === "match" ? "ml-4" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(opt.id)}
                  onChange={() => toggleType(opt.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium sm:text-base">{opt.label}</span>
              </label>
            ))}
          </div>

          {errorMsg && <p className="mt-4 text-sm text-red-400">{errorMsg}</p>}

          <button
            onClick={handleGenerate}
            className="w-full px-10 py-4 mt-8 text-lg font-bold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-700"
          >
            Generate 50-Mark Test
          </button>
        </div>
      </div>
    );
  }

  if (step === "chapters") {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <button
          onClick={() => setStep("subject")}
          className="inline-flex items-center mb-6 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <div className="p-8 glass-card rounded-3xl">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-6 h-6 text-green-400" />
            <h3 className="text-2xl font-bold">Select Chapters</h3>
          </div>
          <p className="mb-6 text-gray-400">
            Choose one or more chapters from the Science textbook.
          </p>

          <div className="space-y-2 overflow-y-auto max-h-80">
            {chapters.map((ch) => (
              <label
                key={ch.id}
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                  selectedChapterIds.includes(ch.id)
                    ? "border-green-500 bg-green-500/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedChapterIds.includes(ch.id)}
                  onChange={() => toggleChapter(ch.id)}
                  className="mt-1 w-4 h-4"
                />
                <div>
                  <p className="font-semibold">{ch.title}</p>
                  <p className="text-xs text-gray-500">Pages {ch.start_page}
                    {ch.end_page ? `–${ch.end_page}` : ""}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setSelectedChapterIds(chapters.map((c) => c.id))}
              className="px-4 py-2 text-sm border rounded-lg border-white/10 hover:bg-white/5"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedChapterIds([])}
              className="px-4 py-2 text-sm border rounded-lg border-white/10 hover:bg-white/5"
            >
              Clear
            </button>
          </div>

          <button
            onClick={() => {
              if (selectedChapterIds.length === 0) {
                setErrorMsg("Select at least one chapter.");
                return;
              }
              setErrorMsg("");
              setStep("format");
            }}
            className="flex items-center justify-center w-full gap-2 px-10 py-4 mt-8 text-lg font-bold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-700"
          >
            Continue to Test Format
            <ChevronRight className="w-5 h-5" />
          </button>
          {errorMsg && <p className="mt-3 text-sm text-red-400">{errorMsg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div
        onClick={loadChapters}
        className={`cursor-pointer transition-all duration-300 rounded-2xl p-6 border-2 flex flex-col items-center text-center border-blue-500 bg-blue-500/10 transform -translate-y-2 shadow-[0_10px_30px_rgba(59,130,246,0.3)] ${
          loadingChapters ? "opacity-70 pointer-events-none" : ""
        }`}
      >
        <div className="p-4 mb-4 text-green-400 rounded-2xl bg-green-500/10">
          {loadingChapters ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <FlaskConical className="w-8 h-8" />
          )}
        </div>
        <h3 className="text-xl font-bold">Science</h3>
        <p className="mt-2 text-sm text-gray-400">Click to view chapters</p>
      </div>
      {errorMsg && <p className="mt-4 text-sm text-center text-red-400">{errorMsg}</p>}
    </div>
  );
}
