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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl bg-surface-container border border-outline p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-outline/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-md3/10 border border-primary-md3/30 flex items-center justify-center text-primary-md3">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-on-surface">Asistente IA (BYOK)</h3>
              <p className="text-[11px] text-on-surface-variant">Bring Your Own Key · Privacidad Zero-Backend</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de proveedor */}
        <div className="grid grid-cols-2 gap-2 bg-surface p-1 rounded-xl border border-outline/50">
          <button
            type="button"
            onClick={() => handleProviderChange('gemini')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              settings.provider === 'gemini'
                ? 'bg-primary-md3 text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Google Gemini
          </button>
          <button
            type="button"
            onClick={() => handleProviderChange('openai')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              settings.provider === 'openai'
                ? 'bg-primary-md3 text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
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
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  API Key de Google Gemini
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-outline text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-md3 font-mono text-xs pr-8"
                  />
                  <KeyRound className="w-4 h-4 text-on-surface-variant absolute right-2.5 top-2.5" />
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">
                  Podés obtener una clave gratuita en{' '}
                  <a
                    href="https://aistudio.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-md3 underline hover:text-primary-md3/80"
                  >
                    Google AI Studio
                  </a>. Tu clave reside 100% en tu navegador.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  Modelo de Gemini
                </label>
                <input
                  type="text"
                  value={settings.modelName}
                  onChange={(e) => setSettings((s) => ({ ...s, modelName: e.target.value }))}
                  placeholder="gemini-1.5-flash"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-md3 font-mono text-xs"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  Base URL del Endpoint
                </label>
                <input
                  type="text"
                  value={settings.baseUrl}
                  onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
                  placeholder="https://api.openai.com/v1 o http://localhost:11434/v1"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-md3 font-mono text-xs"
                />
                <p className="text-[10px] text-on-surface-variant mt-1">
                  Compatible con OpenAI, Ollama local (`http://localhost:11434/v1`), LM Studio o vLLM.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  API Key (Opcional en Ollama local)
                </label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-md3 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  Nombre del Modelo
                </label>
                <input
                  type="text"
                  value={settings.modelName}
                  onChange={(e) => setSettings((s) => ({ ...s, modelName: e.target.value }))}
                  placeholder="gpt-4o-mini o llama3"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-md3 font-mono text-xs"
                />
              </div>
            </>
          )}

          {/* Resultado de prueba */}
          {testResult && (
            <div
              className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                testResult.success
                  ? 'bg-status-emerald/10 border-status-emerald/30 text-status-emerald'
                  : 'bg-status-rose/10 border-status-rose/30 text-status-rose'
              }`}
            >
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-2 border-t border-outline/40">
          <button
            type="button"
            disabled={testing}
            onClick={handleTest}
            className="flex-1 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-high/80 text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-primary-md3" />
            )}
            <span>Probar Conexión</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 rounded-xl bg-primary-md3 hover:bg-primary-md3/90 text-on-primary font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary-md3/20 active:scale-[0.98] transition-all"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Guardar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
