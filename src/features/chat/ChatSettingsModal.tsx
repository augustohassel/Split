import React, { useState } from 'react';
import { AiProvider, AiSettings } from '../../types';
import { getAiSettings, saveAiSettings } from '../../services/aiSettings';
import { testAiConnection } from '../../services/aiService';
import { Bot, Check, KeyRound, Loader2, Sparkles, X } from 'lucide-react';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [settings, setSettings] = useState<AiSettings>(() => getAiSettings());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleProviderChange = (prov: AiProvider) => {
    setSettings((prev) => ({
      ...prev,
      provider: prov,
      modelName: prov === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini',
      baseUrl: prov === 'openai' ? (prev.baseUrl || 'https://api.openai.com/v1') : '',
    }));
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection(settings);
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    saveAiSettings(settings);
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl shadow-slate-900/20 dark:shadow-slate-950 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Asistente IA (BYOK)</h3>
              <p className="text-[11px] text-slate-400">Bring Your Own Key · Privacidad Zero-Backend</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de proveedor */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => handleProviderChange('gemini')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              settings.provider === 'gemini'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Google Gemini
          </button>
          <button
            type="button"
            onClick={() => handleProviderChange('openai')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              settings.provider === 'openai'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            OpenAI / Ollama
          </button>
        </div>

        {/* Campos de configuración */}
        <div className="space-y-3 text-xs">
          {settings.provider === 'gemini' ? (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  API Key de Google Gemini
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs pr-8"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-2.5 top-2.5" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Podés obtener una clave gratuita en{' '}
                  <a
                    href="https://aistudio.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 underline hover:text-cyan-300"
                  >
                    Google AI Studio
                  </a>. Tu clave reside 100% en tu navegador.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Modelo de Gemini
                </label>
                <input
                  type="text"
                  value={settings.modelName}
                  onChange={(e) => setSettings((s) => ({ ...s, modelName: e.target.value }))}
                  placeholder="gemini-1.5-flash"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Base URL del Endpoint
                </label>
                <input
                  type="text"
                  value={settings.baseUrl}
                  onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
                  placeholder="https://api.openai.com/v1 o http://localhost:11434/v1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Compatible con OpenAI, Ollama local (`http://localhost:11434/v1`), LM Studio o vLLM.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  API Key (Opcional en Ollama local)
                </label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nombre del Modelo
                </label>
                <input
                  type="text"
                  value={settings.modelName}
                  onChange={(e) => setSettings((s) => ({ ...s, modelName: e.target.value }))}
                  placeholder="gpt-4o-mini o llama3"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>
            </>
          )}

          {/* Resultado de prueba */}
          {testResult && (
            <div
              className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            disabled={testing}
            onClick={handleTest}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Probar Conexión</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-[0.98] transition-all"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Guardar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

