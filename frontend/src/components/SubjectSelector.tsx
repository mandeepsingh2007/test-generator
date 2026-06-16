"use client";

import { useState } from "react";
import { FlaskConical, CheckCircle2, Loader2 } from "lucide-react";
import { API_BASE, apiFetch } from "@/lib/api";

const SCIENCE_SUBJECT_ID = 3;

export default function SubjectSelector() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(SCIENCE_SUBJECT_ID);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");

  const subjects = [
    { id: SCIENCE_SUBJECT_ID, name: "Science", icon: <FlaskConical className="w-8 h-8" />, color: "text-green-400", bg: "bg-green-500/10" },
  ];

  const handleGenerate = async () => {
    if (!selectedSubjectId) return;
    setIsGenerating(true);
    setStatus("processing");

    try {
      const res = await apiFetch(`${API_BASE}/generate-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject_id: selectedSubjectId
        })
      });

      if (!res.ok) {
        throw new Error("Failed to start generation");
      }

      const data = await res.json();
      const taskId = data.task_id;
      
      pollStatus(taskId);
      
    } catch (error) {
      console.error(error);
      setStatus("failed");
      setIsGenerating(false);
    }
  };

  const pollStatus = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`${API_BASE}/status/${taskId}`);
        const data = await res.json();
        
        setProgress(data.progress);
        if (data.current_step) {
          setCurrentStep(data.current_step);
        }

        if (data.status === "completed") {
          setStatus("completed");
          setIsGenerating(false);
          clearInterval(interval);
          // Assuming result_id is the test_id
          if (data.result_id) {
             // Store the generated test ID to redirect later
             sessionStorage.setItem("lastGeneratedTestId", data.result_id.toString());
          }
        } else if (data.status === "failed") {
          setStatus("failed");
          setCurrentStep(data.current_step || "Generation failed");
          setIsGenerating(false);
          clearInterval(interval);
        }
      } catch (e) {
        console.error(e);
      }
    }, 1000);
  };

  if (status === "failed") {
    return (
      <div className="w-full max-w-2xl mx-auto p-12 text-center glass-card rounded-3xl">
        <h3 className="mb-4 text-2xl font-bold text-red-400">Generation Failed</h3>
        <p className="mb-8 text-gray-400">{currentStep}</p>
        <button
          onClick={() => { setStatus("idle"); setProgress(0); setCurrentStep(""); }}
          className="px-8 py-4 font-semibold text-black transition-colors bg-white rounded-xl hover:bg-gray-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (status === "processing" || status === "completed") {
    return (
      <div className="w-full max-w-2xl mx-auto p-12 text-center glass-card rounded-3xl">
        {status === "completed" ? (
             <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
               <div className="flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-green-500/20 text-green-500">
                  <CheckCircle2 className="w-12 h-12" />
               </div>
               <h3 className="mb-2 text-3xl font-bold">Test Ready!</h3>
               <p className="mb-8 text-gray-400">Your balanced 50-mark exam paper has been generated successfully.</p>
               <a 
                 href={`/test/${sessionStorage.getItem("lastGeneratedTestId")}`}
                 className="px-8 py-4 font-semibold text-black transition-colors bg-white rounded-xl hover:bg-gray-200"
               >
                  View Test Paper
               </a>
             </div>
          ) : (
            <div className="flex flex-col items-center w-full max-w-md mx-auto">
              <div className="w-16 h-16 mb-8">
                <Loader2 className="w-full h-full text-blue-500 animate-spin" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold">{currentStep}</h3>
              <div className="w-full h-3 mt-8 overflow-hidden rounded-full bg-white/10">
                <div 
                  className="h-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="w-full mt-3 text-right text-gray-400">{progress}%</p>
              {progress <= 35 && (
                <p className="mt-4 text-sm text-gray-500">
                  Calling Gemini for each question type — usually 2-4 minutes. Please wait…
                </p>
              )}
            </div>
          )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="grid grid-cols-1 gap-6">
        {subjects.map((sub) => (
          <div 
            key={sub.id}
            onClick={() => setSelectedSubjectId(sub.id)}
            className={`cursor-pointer transition-all duration-300 rounded-2xl p-6 border-2 flex flex-col items-center text-center ${
              selectedSubjectId === sub.id 
                ? "border-blue-500 bg-blue-500/10 transform -translate-y-2 shadow-[0_10px_30px_rgba(59,130,246,0.3)]" 
                : "border-white/5 glass-card hover:border-white/20 hover:-translate-y-1"
            }`}
          >
            <div className={`p-4 rounded-2xl mb-4 ${sub.bg} ${sub.color}`}>
              {sub.icon}
            </div>
            <h3 className="text-xl font-bold">{sub.name}</h3>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-12">
        <button 
          onClick={handleGenerate}
          disabled={!selectedSubjectId}
          className={`px-10 py-4 text-lg font-bold rounded-xl transition-all ${
            selectedSubjectId 
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
              : "bg-white/5 text-gray-500 cursor-not-allowed border border-white/10"
          }`}
        >
          Generate 50-Mark Test
        </button>
      </div>
    </div>
  );
}
