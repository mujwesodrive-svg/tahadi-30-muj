/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Clock, User, Send, CheckCircle2, XCircle, Timer, Award } from 'lucide-react';
import { getDailyQuestions } from './services/gemini';
import { User as UserType, Question, LeaderboardEntry } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const START_HOUR = 21;
const START_MINUTE = 30;
const END_HOUR = 22;
const END_MINUTE = 30;

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizPhase, setQuizPhase] = useState<'idle' | 'reading' | 'answering' | 'result' | 'finished'>('idle');
  const [timer, setTimer] = useState(5);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hasParticipatedToday, setHasParticipatedToday] = useState(false);
  const [isWithinTime, setIsWithinTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkTime = useCallback(() => {
    const now = new Date();
    const start = new Date();
    start.setHours(START_HOUR, START_MINUTE, 0, 0);
    const end = new Date();
    end.setHours(END_HOUR, END_MINUTE, 0, 0);
    setIsWithinTime(now >= start && now <= end);
  }, []);

  const fetchStatus = useCallback(async (userId: number) => {
    try {
      const res = await fetch(`/api/status/${userId}`);
      const data = await res.json();
      setHasParticipatedToday(data.hasParticipated);
      if (data.hasParticipated) setScore(data.score);
    } catch (err) {
      console.error("Failed to fetch status", err);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('tahadi_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      fetchStatus(parsed.id);
    }
    fetchLeaderboard();
    checkTime();
    const interval = setInterval(checkTime, 10000);
    setLoading(false);
    return () => clearInterval(interval);
  }, [checkTime, fetchStatus, fetchLeaderboard]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() })
      });
      const data = await res.json();
      setUser(data);
      localStorage.setItem('tahadi_user', JSON.stringify(data));
      fetchStatus(data.id);
    } catch (err) {
      setError("حدث خطأ أثناء التسجيل");
    }
  };

  const startQuiz = async () => {
    if (!isWithinTime) {
      setError("المسابقة تبدأ الساعة 9:30 مساءً");
      return;
    }
    if (hasParticipatedToday) {
      setError("لقد شاركت بالفعل اليوم");
      return;
    }
    setLoading(true);
    try {
      const q = await getDailyQuestions();
      setQuestions(q);
      setQuizPhase('reading');
      setTimer(5);
      setScore(0);
      setCurrentQuestionIndex(0);
    } catch (err) {
      setError("فشل تحميل الأسئلة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (quizPhase === 'reading' || quizPhase === 'answering') {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            if (quizPhase === 'reading') {
              setQuizPhase('answering');
              return 5;
            } else {
              handleAnswer(-1); // Timeout
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizPhase, currentQuestionIndex]);

  const handleAnswer = async (index: number) => {
    const isCorrect = index === questions[currentQuestionIndex].correctAnswer;
    if (isCorrect) setScore((prev) => prev + 1);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setQuizPhase('reading');
      setTimer(5);
    } else {
      setQuizPhase('finished');
      submitScore(score + (isCorrect ? 1 : 0));
    }
  };

  const submitScore = async (finalScore: number) => {
    if (!user) return;
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, score: finalScore })
      });
      setHasParticipatedToday(true);
      fetchLeaderboard();
    } catch (err) {
      console.error("Failed to submit score", err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center font-serif">
      <div className="text-2xl text-[#5A5A40] animate-pulse">جاري التحميل...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-[#1a1a1a] font-serif relative overflow-hidden">
      <div className="absolute inset-0 islamic-pattern pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 p-6 border-b border-[#5A5A40]/20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-[#5A5A40] tracking-tight">tahadi 30 muj</h1>
          {user && (
            <div className="flex items-center gap-3 bg-[#5A5A40]/10 px-4 py-2 rounded-full">
              <User size={18} className="text-[#5A5A40]" />
              <span className="font-medium">{user.name}</span>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto p-6 mt-8">
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 rounded-[32px] shadow-xl border border-[#5A5A40]/10 text-center"
            >
              <Award className="mx-auto text-[#d4af37] mb-4" size={64} />
              <h2 className="text-3xl mb-6 text-[#5A5A40]">أهلاً بك في تحدي 30</h2>
              <p className="text-lg mb-8 text-gray-600">أدخل اسمك للمشاركة في المسابقة الدينية اليومية</p>
              <form onSubmit={handleRegister} className="flex flex-col gap-4 max-w-sm mx-auto">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="اسم المتسابق"
                  className="px-6 py-4 rounded-2xl border-2 border-[#5A5A40]/20 focus:border-[#5A5A40] outline-none text-center text-xl"
                  dir="rtl"
                />
                <button
                  type="submit"
                  className="gold-gradient text-white font-bold py-4 rounded-2xl shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                >
                  <Send size={20} />
                  انضم الآن
                </button>
              </form>
            </motion.div>
          ) : quizPhase === 'idle' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid md:grid-cols-2 gap-8"
            >
              {/* Status Card */}
              <div className="bg-white p-8 rounded-[32px] shadow-lg border border-[#5A5A40]/10">
                <h3 className="text-2xl mb-6 flex items-center gap-2 text-[#5A5A40]">
                  <Clock size={24} />
                  حالة المسابقة
                </h3>
                
                <div className="space-y-6">
                  <div className={cn(
                    "p-6 rounded-2xl flex items-center justify-between",
                    isWithinTime ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                  )}>
                    <span className="text-lg font-bold">
                      {isWithinTime ? "المسابقة جارية الآن!" : "المسابقة تبدأ 9:30 مساءً"}
                    </span>
                    <Timer className={isWithinTime ? "animate-pulse" : ""} />
                  </div>

                  {hasParticipatedToday ? (
                    <div className="bg-blue-50 text-blue-700 p-6 rounded-2xl text-center">
                      <CheckCircle2 className="mx-auto mb-2" size={32} />
                      <p className="text-xl font-bold">لقد شاركت اليوم!</p>
                      <p>نتيجتك: {score} / 3</p>
                    </div>
                  ) : (
                    <button
                      onClick={startQuiz}
                      disabled={!isWithinTime}
                      className={cn(
                        "w-full py-6 rounded-2xl text-2xl font-bold transition-all",
                        isWithinTime 
                          ? "gold-gradient text-white shadow-xl hover:scale-[1.02]" 
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      ابدأ التحدي
                    </button>
                  )}
                </div>
              </div>

              {/* Leaderboard Card */}
              <div className="bg-white p-8 rounded-[32px] shadow-lg border border-[#5A5A40]/10">
                <h3 className="text-2xl mb-6 flex items-center gap-2 text-[#5A5A40]">
                  <Trophy size={24} className="text-[#d4af37]" />
                  لوحة الصدارة
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {leaderboard.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-[#f5f2ed] rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#5A5A40] text-white rounded-full text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="font-medium">{entry.name}</span>
                      </div>
                      <span className="font-bold text-[#5A5A40]">{entry.totalScore} نقطة</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-[40px] shadow-2xl border-4 border-[#d4af37]/20 text-center min-h-[500px] flex flex-col justify-center"
            >
              {quizPhase === 'finished' ? (
                <div className="space-y-8">
                  <Trophy className="mx-auto text-[#d4af37]" size={80} />
                  <h2 className="text-4xl text-[#5A5A40]">انتهى التحدي!</h2>
                  <div className="text-6xl font-bold text-[#5A5A40]">{score} / 3</div>
                  <p className="text-xl text-gray-600">تم حفظ نتيجتك في لوحة الصدارة</p>
                  <button
                    onClick={() => setQuizPhase('idle')}
                    className="px-12 py-4 bg-[#5A5A40] text-white rounded-2xl text-xl font-bold hover:bg-[#4a4a35] transition-colors"
                  >
                    العودة للرئيسية
                  </button>
                </div>
              ) : (
                <div className="space-y-12">
                  <div className="flex justify-between items-center">
                    <div className="text-[#5A5A40] font-bold text-xl">السؤال {currentQuestionIndex + 1} من 3</div>
                    <div className={cn(
                      "w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl font-bold",
                      timer <= 2 ? "border-red-500 text-red-500 animate-bounce" : "border-[#5A5A40] text-[#5A5A40]"
                    )}>
                      {timer}
                    </div>
                  </div>

                  <h2 className="text-4xl leading-relaxed text-[#1a1a1a] font-bold" dir="rtl">
                    {questions[currentQuestionIndex]?.text}
                  </h2>

                  {quizPhase === 'answering' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8" dir="rtl">
                      {questions[currentQuestionIndex]?.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleAnswer(i)}
                          className="p-6 text-xl bg-[#f5f2ed] hover:bg-[#5A5A40] hover:text-white rounded-2xl transition-all border-2 border-transparent hover:border-[#d4af37] text-right"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {quizPhase === 'reading' && (
                    <div className="text-xl text-[#5A5A40] italic animate-pulse">
                      استعد... الخيارات ستظهر قريباً
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <XCircle />
            <span className="font-bold">{error}</span>
            <button onClick={() => setError(null)} className="ml-4 underline">إغلاق</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
