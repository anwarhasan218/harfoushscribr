/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  FileAudio, 
  Loader2, 
  Copy, 
  Check, 
  AlertCircle,
  FileText,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface TranscriptionHistory {
  id: string;
  fileName: string;
  text: string;
  timestamp: Date;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<TranscriptionHistory[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.startsWith('audio/') || selectedFile.name.endsWith('.mp3') || selectedFile.name.endsWith('.wav') || selectedFile.name.endsWith('.m4a')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('يرجى اختيار ملف صوتي صالح (MP3, WAV, M4A, etc.)');
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const transcribeAudio = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setTranscription('');

    try {
      const base64Data = await fileToBase64(file);
      
      const model = "gemini-3-flash-preview"; // Using flash for speed and good audio understanding
      
      const response = await genAI.models.generateContent({
        model: model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: file.type || 'audio/mpeg',
                  data: base64Data
                }
              },
              {
                text: "قم بنسخ النص الموجود في هذا الملف الصوتي بدقة متناهية (100%). قم بكتابة النص كما هو منطوق تماماً دون أي تعديل أو تلخيص. إذا كان هناك أكثر من متحدث، حاول تمييزهم إذا أمكن."
              }
            ]
          }
        ],
      });

      const text = response.text || 'لم يتم العثور على نص في الملف الصوتي.';
      setTranscription(text);
      
      // Add to history
      const newEntry: TranscriptionHistory = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        text: text,
        timestamp: new Date()
      };
      setHistory(prev => [newEntry, ...prev]);

    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء معالجة الملف الصوتي. يرجى التأكد من حجم الملف وصيغته.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-black selection:text-white" dir="rtl">
      {/* Header */}
      <header className="max-w-4xl mx-auto pt-12 px-6 pb-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="p-2 bg-black rounded-lg text-white">
            <FileAudio size={24} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">ناسخ الصوت الذكي</h1>
        </motion.div>
        <p className="text-muted text-sm opacity-60">حول ملفاتك الصوتية إلى نصوص بدقة عالية باستخدام تقنيات Gemini AI</p>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24 space-y-8">
        {/* Upload Section */}
        <section className="card p-8 bg-white rounded-[24px] shadow-sm border border-black/5">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative group cursor-pointer border-2 border-dashed rounded-2xl p-12 transition-all duration-300
              ${file ? 'border-black bg-black/5' : 'border-black/10 hover:border-black/30 hover:bg-black/[0.02]'}
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="hidden"
            />
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full transition-colors ${file ? 'bg-black text-white' : 'bg-black/5 text-black/40 group-hover:text-black/60'}`}>
                <Upload size={32} />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {file ? file.name : 'اضغط هنا لرفع ملف صوتي'}
                </p>
                <p className="text-sm text-muted opacity-50 mt-1">
                  يدعم MP3, WAV, M4A وغيرها (بحد أقصى 20 ميجابايت)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={transcribeAudio}
              disabled={!file || isLoading}
              className={`
                px-8 py-3 rounded-full font-medium transition-all duration-300 flex items-center gap-2
                ${!file || isLoading 
                  ? 'bg-black/10 text-black/30 cursor-not-allowed' 
                  : 'bg-black text-white hover:scale-105 active:scale-95 shadow-lg shadow-black/10'}
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <FileText size={20} />
                  استخراج النص
                </>
              )}
            </button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </motion.div>
          )}
        </section>

        {/* Result Section */}
        <AnimatePresence>
          {transcription && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="card p-8 bg-white rounded-[24px] shadow-sm border border-black/5"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText size={20} className="text-black/40" />
                  النص المستخرج
                </h2>
                <button 
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-black/5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  {copied ? 'تم النسخ' : 'نسخ النص'}
                </button>
              </div>
              
              <div className="bg-[#f9f9f9] p-6 rounded-2xl min-h-[200px] whitespace-pre-wrap leading-relaxed text-lg">
                {transcription}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* History Section */}
        {history.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 px-2">
              <History size={20} className="text-black/40" />
              السجل السابق
            </h2>
            <div className="grid gap-4">
              {history.map((item) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm hover:border-black/20 transition-colors cursor-pointer group"
                  onClick={() => setTranscription(item.text)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium truncate max-w-[70%]">{item.fileName}</h3>
                    <span className="text-xs text-muted opacity-40">
                      {item.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-muted opacity-60 line-clamp-2 leading-relaxed">
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 text-center text-xs text-muted opacity-30 border-t border-black/5">
        <p>© {new Date().getFullYear()} ناسخ الصوت الذكي. مدعوم بواسطة Google Gemini AI.</p>
      </footer>
    </div>
  );
}
