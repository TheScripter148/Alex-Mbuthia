import React, { useState } from 'react';
import { PlusCircle, Upload, LayoutTemplate, Wand2, ArrowRight, BookOpen, Check, Sparkles } from 'lucide-react';
import { CoverType, ProjectState } from '../types';
import { GENRE_PRESETS } from '../constants/genres';

interface StartScreenProps {
  onStartNew: (type: CoverType, details: { title: string; authorName: string; genre: string }) => void;
  onOpenUpload: () => void;
  onSelectTemplateMode: () => void;
  onStartAutoDesignWizard: () => void;
  onSkipToEditor: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartNew,
  onOpenUpload,
  onSelectTemplateMode,
  onStartAutoDesignWizard,
  onSkipToEditor,
}) => {
  const [wizardStep, setWizardStep] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<CoverType>('paperback');
  const [title, setTitle] = useState<string>('The Obsidian Crown');
  const [authorName, setAuthorName] = useState<string>('Alex Vance');
  const [genre, setGenre] = useState<string>('fantasy');

  const handleFinishWizard = () => {
    onStartNew(selectedType, { title, authorName, genre });
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-100">
      {/* Brand Hero */}
      <div className="max-w-3xl w-full text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Professional Book Cover Design Studio by Alex FORGE Studio</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
          AlexForge <span className="text-amber-400 italic">CoverCraft</span>
        </h1>
        <p className="text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
          Intelligent automated book cover creation for ebooks, paperbacks, and hardcovers. Exact Amazon KDP calculations,
          high-impact typography, and photorealistic 3D mockups.
        </p>
      </div>

      {wizardStep === null ? (
        /* 4 Clear Starting Choices */
        <div className="max-w-4xl w-full space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Option 1: Create a New Cover */}
            <div
              onClick={() => setWizardStep(1)}
              className="group p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/60 cursor-pointer transition-all flex flex-col justify-between hover:shadow-xl hover:shadow-amber-500/5 space-y-4"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                  1. Create a New Cover
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Start with a verified canvas, configure book metadata, and build from scratch.
                </p>
              </div>
              <span className="text-xs text-amber-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Start blank →
              </span>
            </div>

            {/* Option 2: Upload an Existing Cover */}
            <div
              onClick={onOpenUpload}
              className="group p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/60 cursor-pointer transition-all flex flex-col justify-between hover:shadow-xl hover:shadow-amber-500/5 space-y-4"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                  2. Upload Existing Cover
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Import JPG, PNG, or full wrap. OCR-assisted text layer reconstruction preserves aspect ratio.
                </p>
              </div>
              <span className="text-xs text-sky-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Upload artwork →
              </span>
            </div>

            {/* Option 3: Use a Template */}
            <div
              onClick={onSelectTemplateMode}
              className="group p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/60 cursor-pointer transition-all flex flex-col justify-between hover:shadow-xl hover:shadow-amber-500/5 space-y-4"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                  3. Use a Template
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Select from 16+ genre-specific bestseller templates with auto-populated typography.
                </p>
              </div>
              <span className="text-xs text-purple-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Browse gallery →
              </span>
            </div>

            {/* Option 4: Create a Cover Automatically */}
            <div
              onClick={() => setWizardStep(1)}
              className="group p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-neutral-900 to-neutral-900 border border-amber-500/40 hover:border-amber-400 cursor-pointer transition-all flex flex-col justify-between hover:shadow-xl hover:shadow-amber-500/10 space-y-4"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center font-bold">
                  <Wand2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-amber-200 group-hover:text-amber-100 transition-colors">
                  4. Create Automatically
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Enter your book details and let our design engine compose balanced layouts instantly.
                </p>
              </div>
              <span className="text-xs text-amber-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Auto-generate →
              </span>
            </div>
          </div>

          {/* Quick Action Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-800/80 text-xs">
            <span className="text-neutral-500">
              Experienced author or designer? You can skip the setup wizard.
            </span>
            <button
              onClick={onSkipToEditor}
              className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 font-medium transition-colors"
            >
              Skip Directly to Studio Editor →
            </button>
          </div>
        </div>
      ) : (
        /* Guided 3-Step Wizard */
        <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
                Guided Setup · Step {wizardStep} of 3
              </span>
              <h3 className="text-base font-semibold text-white mt-0.5">
                {wizardStep === 1
                  ? 'Choose Cover Binding Format'
                  : wizardStep === 2
                  ? 'Enter Book Details'
                  : 'Select Book Genre & Styling'}
              </h3>
            </div>
            <button
              onClick={() => setWizardStep(null)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          {/* Step 1: Cover Type */}
          {wizardStep === 1 && (
            <div className="space-y-3">
              <label className="text-xs text-neutral-300 block">Select the physical format for your book:</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'paperback', title: 'Paperback Wrap', desc: 'Back + Spine + Front' },
                  { id: 'hardcover', title: 'Hardcover Case', desc: 'Case Laminate + Wrap' },
                  { id: 'ebook', title: 'Ebook Front', desc: 'Kindle / E-Pub Front' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedType(t.id as CoverType)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedType === t.id
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-md'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span className="text-xs font-semibold block">{t.title}</span>
                    <span className="text-[10px] text-neutral-400 block mt-1">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Book Details */}
          {wizardStep === 2 && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Book Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Author Name</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Genre */}
          {wizardStep === 3 && (
            <div className="space-y-3 text-xs">
              <label className="block text-neutral-300 font-medium">Select Genre Style Preset</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              >
                {Object.entries(GENRE_PRESETS).map(([k, g]) => (
                  <option key={k} value={k}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
            {wizardStep > 1 ? (
              <button
                onClick={() => setWizardStep(wizardStep - 1)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {wizardStep < 3 ? (
              <button
                onClick={() => setWizardStep(wizardStep + 1)}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-md transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinishWizard}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-neutral-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-lg shadow-amber-500/20 transition-all"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Start Designing Now</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
