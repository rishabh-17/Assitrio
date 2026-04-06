import React, { useState } from 'react';
import { Mic, Zap, Search, Target, ChevronRight } from 'lucide-react';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);

  const slides = [
    {
      icon: <Target size={48} className="text-brand-500" />,
      title: 'Welcome to Assistrio',
      desc: 'Your calm, AI-powered memory and task assistant. We remember the details so you don\'t have to.',
      color: 'bg-brand-50'
    },
    {
      icon: <Mic size={48} className="text-emerald-500" />,
      title: 'Just Speak',
      desc: 'Tap "Give Command" to log a quick thought, or "Talk to AI" to have a conversation. We extract tasks automatically.',
      color: 'bg-emerald-50'
    },
    {
      icon: <Zap size={48} className="text-amber-500" />,
      title: 'Smart locker',
      desc: 'Everything is securely stored, summarized, and organized in your Locker. Fully searchable and accessible.',
      color: 'bg-amber-50'
    }
  ];

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[200] flex flex-col sm:border-x sm:border-slate-800 animate-fade-in font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        
        {/* Soft Background Blob */}
        <div className={`absolute top-1/4 -right-16 w-64 h-64 rounded-full blur-3xl opacity-40 transition-colors duration-700 ${slides[step].color}`} />
        <div className={`absolute bottom-1/4 -left-16 w-64 h-64 rounded-full blur-3xl opacity-40 transition-colors duration-700 ${slides[step].color}`} />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full animate-slide-up" key={step}>
          <div className={`w-24 h-24 rounded-full ${slides[step].color} border-4 border-white shadow-xl flex items-center justify-center mb-10 transition-transform hover:scale-105`}>
            {slides[step].icon}
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">
            {slides[step].title}
          </h1>
          
          <p className="text-base text-slate-500 leading-relaxed px-4">
            {slides[step].desc}
          </p>
        </div>
      </div>

      {/* Navigation Area - strictly adheres to 8pt grid with large accessible targets */}
      <div className="bg-white p-8 border-t border-slate-100 flex flex-col items-center gap-6 pb-12">
        {/* Pagination Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-brand-600' : 'w-2 bg-slate-200'}`} 
            />
          ))}
        </div>

        <button 
          onClick={handleNext}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-14 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md mt-2"
          aria-label={step === slides.length - 1 ? 'Get Started' : 'Next Step'}
        >
          {step === slides.length - 1 ? 'Get Started' : 'Continue'} 
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
