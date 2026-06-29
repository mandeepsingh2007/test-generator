import SubjectSelector from "@/components/SubjectSelector";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <Link href="/home" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Link>
      
      <div className="flex flex-col items-center justify-center pt-10">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Science Test Generator</h1>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">
            Select chapters, choose question formats, and generate a custom 50-mark Science exam.
          </p>
        </div>
        
        <SubjectSelector />
      </div>
    </div>
  );
}
