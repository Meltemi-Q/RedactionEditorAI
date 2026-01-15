import React, { useState } from 'react';
import { Shield, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { ImageUploader } from './components/ImageUploader';
import { RedactionEditor } from './components/RedactionEditor';
import { detectSensitiveData } from './services/geminiService';
import { AppState, BoundingBox } from './types';

const SUGGESTIONS = [
  "隐藏所有姓名和头像",
  "遮住账户余额和转账金额",
  "隐藏地址和电话号码",
  "遮盖所有人脸",
  "打码对方的昵称"
];

function App() {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelected = (base64: string) => {
    setImageBase64(base64);
    setState(AppState.READY);
    setError(null);
  };

  const handleRedact = async () => {
    if (!imageBase64 || !prompt.trim()) return;

    setState(AppState.ANALYZING);
    setError(null);

    try {
      const detectedBoxes = await detectSensitiveData(imageBase64, prompt);
      
      if (detectedBoxes.length === 0) {
        setError("AI 未发现符合描述的内容，请尝试换一种描述方式。");
        setState(AppState.READY);
      } else {
        setBoxes(detectedBoxes);
        setState(AppState.READY); // We stay in ready, but now we have boxes to show
      }
    } catch (e: any) {
      setError(e.message || "发生未知错误，请重试。");
      setState(AppState.ERROR);
    }
  };

  const resetApp = () => {
    setState(AppState.IDLE);
    setImageBase64(null);
    setBoxes([]);
    setPrompt('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">智能隐私打码</span>
          </div>
          <div className="text-xs font-mono text-slate-500 flex items-center gap-1">
            <span>Powered by</span>
            <span className="text-blue-400 font-bold">Qwen-VL</span>
            <span className="text-slate-600">@ModelScope</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        
        {state === AppState.IDLE && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-white bg-clip-text text-transparent">
                截图隐私，智能守护
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                上传截图并描述需要隐藏的内容。我们接入了 ModelScope 强大的 Qwen-VL 中文视觉模型，能精准识别各类国内 APP 截图内容。
              </p>
            </div>
            <ImageUploader onImageSelected={handleImageSelected} />
          </div>
        )}

        {(state === AppState.READY || state === AppState.ANALYZING || state === AppState.ERROR) && imageBase64 && (
          <div className="max-w-4xl mx-auto">
            
            {/* Control Panel (Only show if we haven't generated boxes yet, or we want to try again) */}
            {boxes.length === 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8 shadow-2xl">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    需要打码什么内容？
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="例如：隐藏所有金额和用户头像..."
                      className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                      disabled={state === AppState.ANALYZING}
                      onKeyDown={(e) => e.key === 'Enter' && handleRedact()}
                    />
                    <button
                      onClick={handleRedact}
                      disabled={state === AppState.ANALYZING || !prompt.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 min-w-[120px] justify-center"
                    >
                      {state === AppState.ANALYZING ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>分析中...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>一键打码</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Suggestions Tags */}
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPrompt(s)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-1.5 rounded-full transition-colors border border-slate-700/50"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-900/50 rounded-xl flex items-center gap-3 text-red-200">
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Results Editor */}
            {boxes.length > 0 ? (
               <RedactionEditor 
                  base64Image={imageBase64} 
                  boxes={boxes} 
                  onReset={resetApp} 
               />
            ) : (
              // Preview Image before redaction
              state !== AppState.ANALYZING && (
                <div className="relative rounded-lg overflow-hidden border border-slate-800 shadow-xl opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                    <img 
                      src={`data:image/png;base64,${imageBase64}`} 
                      alt="预览" 
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <p className="bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-sm">
                         图片预览
                       </p>
                    </div>
                </div>
              )
            )}
          </div>
        )}

      </main>
    </div>
  );
}

export default App;