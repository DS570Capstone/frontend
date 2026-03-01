"use client";

import { Activity, Camera, ArrowRight, CheckCircle2, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 sm:p-20">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

      <main className="z-10 flex flex-col items-center text-center max-w-5xl gap-12">
        
        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass px-4 py-1.5 rounded-full flex items-center gap-2 text-sm text-blue-400 font-medium"
        >
          <Zap className="w-4 h-4" />
          <span>Next-Gen Exercise Form Evaluation</span>
        </motion.div>

        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-balance leading-tight">
            Perfect Your Form with <br />
            <span className="text-gradient">AI-Powered Kinematics</span>
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto text-balance">
            Real-time body tracking, waveform analysis, and LLM-driven suggestions to optimize your workout safely and efficiently.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4"
        >
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            Start Evaluation
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="glass hover:bg-white/10 text-white px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
            View Analytics Dashboard
          </button>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-12"
        >
          <div className="glass-card p-8 rounded-2xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100">Live Pose Tracking</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Detect critical body joints continuously to ensure biomechanical precision during movements.
            </p>
          </div>

          <div className="glass-card p-8 rounded-2xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center text-violet-400">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100">Waveform Analysis</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Translate motion data into actionable waveforms that evaluate repetition tempo and stability.
            </p>
          </div>

          <div className="glass-card p-8 rounded-2xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100">LLM Suggestions</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Receive smart, immediate textual feedback powered by LLMs for personalized corrections.
            </p>
          </div>
        </motion.div>

      </main>
    </div>
  );
}
