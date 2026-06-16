"use client";

import { useEffect, useState, useMemo, useCallback, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Award } from "lucide-react";
import { API_BASE, apiFetch } from "@/lib/api";

interface QuestionDisplay {
  id: number;
  type: string;
  marks: number;
  section: string;
  display: Record<string, unknown>;
}

interface GradeResult {
  total_score: number;
  max_score: number;
  percentage: number;
  results: Array<{
    question_id: number;
    section: string;
    type: string;
    marks_awarded: number;
    max_marks: number;
    is_correct: boolean;
    user_answer: unknown;
    correct_answer: string;
    correction: string;
    pdf_excerpt: string;
    pdf_page_number?: number | null;
  }>;
}

type Answers = Record<string, string>;

function collectQuestions(testData: Record<string, QuestionDisplay[]>): QuestionDisplay[] {
  const keys = [
    "section_A_MCQs",
    "section_B_AssertionReason",
    "section_C_Objective",
    "section_D_Subjective",
  ];
  const all: QuestionDisplay[] = [];
  for (const key of keys) {
    if (testData[key]) all.push(...testData[key]);
  }
  return all;
}

export default function TestPaperPage() {
  const { id } = useParams();
  const [testMeta, setTestMeta] = useState<{
    title: string;
    subject_name: string;
    total_marks: number;
    total_questions: number;
    test_data: Record<string, QuestionDisplay[]>;
  } | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState("");

  const allQuestions = useMemo(
    () => (testMeta ? collectQuestions(testMeta.test_data) : []),
    [testMeta]
  );

  const answeredCount = useMemo(
    () => allQuestions.filter((q) => {
      const a = answers[String(q.id)];
      return a !== undefined && a !== "";
    }).length,
    [allQuestions, answers]
  );

  const gradeMap = useMemo(() => {
    if (!gradeResult) return new Map();
    return new Map(gradeResult.results.map((r) => [r.question_id, r]));
  }, [gradeResult]);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await apiFetch(`${API_BASE}/test/${id}/attempt`);
        if (!res.ok) throw new Error("Failed to load test");
        const data = await res.json();
        setTestMeta(data);
      } catch (err) {
        console.error(err);
        setError("Could not load test. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTest();
  }, [id]);

  const submitAnswers = useCallback(async () => {
    if (grading || gradeResult) return;
    setGrading(true);
    setError("");
    try {
      const res = await apiFetch(`${API_BASE}/test/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Grading failed");
      setGradeResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Grading failed");
    } finally {
      setGrading(false);
    }
  }, [answers, grading, gradeResult, id]);

  const setAnswer = (questionId: number, value: string) => {
    if (gradeResult) return;
    setAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-3 text-gray-600">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading Test Paper...
      </div>
    );
  }

  if (!testMeta) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {error || "Test not found"}
      </div>
    );
  }

  const content = testMeta.test_data;

  return (
    <div className="min-h-screen p-8 bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/upload" className="inline-flex items-center text-gray-500 hover:text-blue-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Subjects
          </Link>
          {!gradeResult && (
            <span className="text-sm font-medium text-gray-500">
              Answered: {answeredCount} / {allQuestions.length}
            </span>
          )}
        </div>

        {gradeResult && (
          <div className="p-8 mb-8 bg-white border-2 border-blue-200 shadow-lg rounded-2xl">
            <div className="flex flex-col items-center text-center">
              <Award className="w-16 h-16 mb-4 text-blue-600" />
              <h2 className="text-3xl font-bold">Your Score</h2>
              <p className="mt-2 text-5xl font-extrabold text-blue-600">
                {gradeResult.total_score}
                <span className="text-2xl text-gray-400"> / {gradeResult.max_score}</span>
              </p>
              <p className="mt-2 text-lg text-gray-500">{gradeResult.percentage}%</p>
              <p className="mt-4 text-sm text-gray-400">
                Graded against {testMeta.subject_name} textbook (PDF)
              </p>
            </div>
          </div>
        )}

        {grading && (
          <div className="flex items-center justify-center gap-3 p-6 mb-8 bg-blue-50 border border-blue-200 rounded-2xl">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="font-medium text-blue-700">
              Checking answers against textbook…
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 mb-8 text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <div className="p-8 mb-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold uppercase tracking-widest">{testMeta.title}</h1>
            <h2 className="mt-2 text-xl font-medium text-gray-600">FINAL EXAMINATION</h2>
            <div className="flex justify-between mt-8 text-sm font-bold text-gray-500 uppercase border-b-2 border-gray-200 pb-4">
              <span>Time Allowed: 2 Hours</span>
              <span>Max Marks: {testMeta.total_marks}</span>
            </div>
          </div>
          <div className="mt-8 text-sm text-gray-600">
            <p className="mb-2"><strong>Instructions:</strong></p>
            <ul className="space-y-1 list-decimal list-inside">
              <li>Answer all questions below.</li>
              <li>Click <strong>Submit Test</strong> when finished — answers are not sent until you submit.</li>
              <li>Answers are verified against your subject textbook (PDF).</li>
            </ul>
          </div>
        </div>

        {content?.section_A_MCQs?.length > 0 && (
          <Section
            title="SECTION A: Multiple Choice Questions"
            questions={content.section_A_MCQs}
            renderQuestion={(q, i) => {
              const d = q.display as { question_text: string; options: string[] };
              const result = gradeMap.get(q.id);
              return (
                <QuestionCard
                  key={q.id}
                  number={i + 1}
                  marks={q.marks}
                  result={result}
                >
                  <p className="mb-4 text-lg">{d.question_text}</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {d.options.map((opt, j) => (
                      <label
                        key={j}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          answers[String(q.id)] === opt
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        } ${gradeResult ? "pointer-events-none" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={answers[String(q.id)] === opt}
                          onChange={() => setAnswer(q.id, opt)}
                          disabled={!!gradeResult}
                          className="mr-3"
                        />
                        <span className="mr-2 font-bold text-gray-400">
                          {String.fromCharCode(65 + j)}.
                        </span>
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </QuestionCard>
              );
            }}
          />
        )}

        {content?.section_B_AssertionReason?.length > 0 && (
          <Section
            title="SECTION B: Assertion and Reason"
            subtitle="Direction: Choose the correct option for each Assertion-Reason pair."
            questions={content.section_B_AssertionReason}
            renderQuestion={(q, i) => {
              const d = q.display as {
                assertion: string;
                reason: string;
                options: { code: string; label: string }[];
              };
              const result = gradeMap.get(q.id);
              return (
                <QuestionCard key={q.id} number={i + 1} marks={q.marks} result={result}>
                  <p className="mb-2">
                    <span className="font-bold">Assertion (A):</span> {d.assertion}
                  </p>
                  <p className="mb-4">
                    <span className="font-bold">Reason (R):</span> {d.reason}
                  </p>
                  <div className="space-y-2 text-sm">
                    {d.options.map((opt) => (
                      <label
                        key={opt.code}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer ${
                          answers[String(q.id)] === opt.code
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        } ${gradeResult ? "pointer-events-none" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt.code}
                          checked={answers[String(q.id)] === opt.code}
                          onChange={() => setAnswer(q.id, opt.code)}
                          disabled={!!gradeResult}
                          className="mt-1 mr-3"
                        />
                        <span>
                          <strong>{opt.code}.</strong> {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </QuestionCard>
              );
            }}
          />
        )}

        {content?.section_C_Objective?.length > 0 && (
          <Section
            title="SECTION C: Objective Questions"
            questions={content.section_C_Objective}
            renderQuestion={(q, i) => {
              const d = q.display as { statement?: string; sentence_with_blank?: string };
              const result = gradeMap.get(q.id);
              return (
                <QuestionCard key={q.id} number={i + 1} marks={q.marks} result={result}>
                  {q.type === "true_false" && (
                    <>
                      <p className="mb-4 text-lg">
                        State whether True or False: {d.statement}
                      </p>
                      <div className="flex gap-4">
                        {["true", "false"].map((val) => (
                          <label
                            key={val}
                            className={`flex items-center px-6 py-3 border rounded-lg cursor-pointer capitalize ${
                              answers[String(q.id)] === val
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200"
                            } ${gradeResult ? "pointer-events-none" : ""}`}
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={val}
                              checked={answers[String(q.id)] === val}
                              onChange={() => setAnswer(q.id, val)}
                              disabled={!!gradeResult}
                              className="mr-2"
                            />
                            {val}
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                  {q.type === "fill_blank" && (
                    <>
                      <p className="mb-4 text-lg">{d.sentence_with_blank}</p>
                      <input
                        type="text"
                        value={answers[String(q.id)] || ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        disabled={!!gradeResult}
                        placeholder="Type your answer"
                        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </>
                  )}
                </QuestionCard>
              );
            }}
          />
        )}

        {content?.section_D_Subjective?.length > 0 && (
          <Section
            title="SECTION D: Subjective Questions"
            questions={content.section_D_Subjective}
            renderQuestion={(q, i) => {
              const d = q.display as { question: string };
              const result = gradeMap.get(q.id);
              return (
                <QuestionCard key={q.id} number={i + 1} marks={q.marks} result={result}>
                  <p className="mb-4 text-lg">{d.question}</p>
                  <textarea
                    value={answers[String(q.id)] || ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    disabled={!!gradeResult}
                    placeholder="Write your answer here..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </QuestionCard>
              );
            }}
          />
        )}

        {!gradeResult && (
          <div className="sticky bottom-6 z-10 p-4 mb-8 bg-white border border-gray-200 shadow-lg rounded-2xl">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-gray-600">
                Answered <strong>{answeredCount}</strong> of <strong>{allQuestions.length}</strong> questions
              </p>
              <button
                onClick={submitAnswers}
                disabled={grading || answeredCount < allQuestions.length}
                className={`px-8 py-3 text-lg font-bold rounded-xl transition-all ${
                  answeredCount === allQuestions.length && !grading
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                {grading ? "Checking…" : "Submit Test"}
              </button>
            </div>
            {answeredCount < allQuestions.length && (
              <p className="mt-2 text-xs text-center text-gray-400">
                Submit button will activate when all questions are answered.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  questions,
  renderQuestion,
}: {
  title: string;
  subtitle?: string;
  questions: QuestionDisplay[];
  renderQuestion: (q: QuestionDisplay, index: number) => ReactNode;
}) {
  return (
    <div className="p-8 mb-8 bg-white border border-gray-200 shadow-sm rounded-2xl">
      <h3 className="pb-2 mb-6 text-xl font-bold border-b">{title}</h3>
      {subtitle && <p className="mb-6 text-sm italic text-gray-600">{subtitle}</p>}
      <div className="space-y-8">
        {questions.map((q, i) => renderQuestion(q, i))}
      </div>
    </div>
  );
}

function QuestionCard({
  number,
  marks,
  result,
  children,
}: {
  number: number;
  marks: number;
  result?: GradeResult["results"][0];
  children: ReactNode;
}) {
  return (
    <div
      className={`flex gap-4 p-4 rounded-xl ${
        result
          ? result.is_correct
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
          : ""
      }`}
    >
      <span className="font-bold">{number}.</span>
      <div className="flex-1">
        {children}
        {result && (
          <div className="pt-4 mt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              {result.is_correct ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span
                className={`font-semibold ${
                  result.is_correct ? "text-green-700" : "text-red-700"
                }`}
              >
                {result.marks_awarded} / {result.max_marks} marks
              </span>
            </div>
            {!result.is_correct && (
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Your answer:</strong>{" "}
                  {String(result.user_answer ?? "(no answer)")}
                </p>
                <p>
                  <strong>Correct answer:</strong> {result.correct_answer}
                </p>
                {result.correction && (
                  <p className="p-3 text-gray-700 bg-white rounded-lg border">
                    {result.correction}
                  </p>
                )}
                {result.pdf_excerpt && (
                  <div className="p-3 text-sm text-gray-700 bg-gray-50 rounded-lg border">
                    <strong>Textbook reference</strong>
                    {result.pdf_page_number != null && (
                      <span className="ml-1 text-blue-600">(Page {result.pdf_page_number})</span>
                    )}
                    <p className="mt-1 text-gray-600">{result.pdf_excerpt}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <span className="font-semibold text-gray-400 whitespace-nowrap">[{marks}]</span>
    </div>
  );
}
