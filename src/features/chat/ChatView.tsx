import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveTab,
  ChatMessage,
  DraftGoalData,
  DraftMarkData,
  SwimGoal,
  SwimMark,
  SwimmerProfile,
} from '../../types';
import { parseQuickSwimCommand } from '../../utils/commandParser';
import { sendChatMessage } from '../../services/aiService';
import { getAiSettings } from '../../services/aiSettings';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { DraftMarkCard } from './DraftMarkCard';
import { DraftGoalCard } from './DraftGoalCard';
import { ChatSettingsModal } from './ChatSettingsModal';
import {
  AlertCircle,
  Bot,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';

const CHAT_STORAGE_KEY = 'split_chat_messages_v1';

interface ChatViewProps {
  profile: SwimmerProfile;
  marks: SwimMark[];
  goals: SwimGoal[];
  onSaveMark: (markData: Omit<SwimMark, 'id'>) => Promise<SwimMark | void>;
  onSaveGoal: (goalData: Omit<SwimGoal, 'id'>) => Promise<SwimGoal | void>;
  onNavigate?: (tab: ActiveTab) => void;
}

function createWelcomeMessage(profile: SwimmerProfile): ChatMessage {
  return {
    id: 'welcome-msg',
    role: 'assistant',
    content: `¡Hola ${profile.name || 'Nadador'}! 🏊‍♂️ Soy tu asistente inteligente de natación.

Podés interactuar de dos formas:
1. **Comandos Rápidos 100% Offline**: Escribí o dictá marcas y metas sin conexión ni configuración previa:
   - *«50 libre 26.40 en 25m»*
   - *«100 mariposa 1:02.15 torneo CENARD»*
   - *«entrenamiento 200 pecho 2:25.80 sensación 4»*
   - *«objetivo 100 libre 54.50 en 50m»*
2. **Asistente Guiado por IA (BYOK)**: Conversá libremente sobre tus sensaciones, series de entrenamiento o torneos, configurando tu API Key propia en Ajustes de IA.
3. **Dictado por Voz**: Tocá el micrófono para dictar con las manos libres al salir del agua.`,
    timestamp: new Date().toISOString(),
  };
}

function readStoredMessages(profile: SwimmerProfile): ChatMessage[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [createWelcomeMessage(profile)];
    }
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [createWelcomeMessage(profile)];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [createWelcomeMessage(profile)];
  } catch {
    return [createWelcomeMessage(profile)];
  }
}

function writeStoredMessages(messages: ChatMessage[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Ignorar errores de cuota
  }
}

export const ChatView: React.FC<ChatViewProps> = ({
  profile,
  marks,
  goals,
  onSaveMark,
  onSaveGoal,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredMessages(profile));
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showResetSuggestion, setShowResetSuggestion] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const baseTextRef = useRef<string>('');

  // Persistir mensajes al actualizarse
  useEffect(() => {
    writeStoredMessages(messages);
  }, [messages]);

  // Scroll automático hacia el último mensaje
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, scrollToBottom]);

  // Hook de reconocimiento de voz con el fix de duplicación de issue #13
  const {
    isSupported: isSpeechSupported,
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: 'es-AR',
    onResult: (transcript) => {
      const base = baseTextRef.current ? `${baseTextRef.current.trim()} ` : '';
      setInputText(`${base}${transcript}`);
    },
  });

  const handleToggleMic = () => {
    setErrorMessage(null);
    if (isListening) {
      stopListening();
    } else {
      baseTextRef.current = inputText;
      startListening();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Si el usuario edita con teclado, detener el micrófono para no colisionar
    if (isListening) {
      stopListening();
    }
    setInputText(e.target.value);
  };

  const handleClearChat = () => {
    if (window.confirm('¿Deseas vaciar la conversación e iniciar un nuevo diálogo limpio?')) {
      const fresh = [createWelcomeMessage(profile)];
      setMessages(fresh);
      setShowResetSuggestion(false);
      setErrorMessage(null);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isListening) {
      stopListening();
    }

    const trimmed = inputText.trim();
    if (!trimmed || isGenerating) return;

    setInputText('');
    baseTextRef.current = '';
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const currentHistory = [...messages, userMessage];
    setMessages(currentHistory);

    // 1. Parser Local Offline (determinístico, 0 tokens)
    const quickResult = parseQuickSwimCommand(trimmed, profile.defaultPoolLength);
    if (quickResult.isMatch) {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content:
          quickResult.type === 'mark'
            ? '¡Marca detectada en tu mensaje! Podés revisar y ajustar los datos en la tarjeta a continuación antes de guardarla en tu historial:'
            : '¡Objetivo detectado en tu mensaje! Podés revisar los valores y guardarlo a continuación:',
        timestamp: new Date().toISOString(),
        draftMark: quickResult.draftMark,
        draftGoal: quickResult.draftGoal,
      };

      setMessages([...currentHistory, assistantMessage]);
      return;
    }

    // 2. Asistente Guiado por IA (BYOK)
    const aiSettings = getAiSettings();
    const hasAiConfig = Boolean(
      aiSettings.apiKey || (aiSettings.provider === 'openai' && aiSettings.baseUrl)
    );

    if (!hasAiConfig) {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `No pude reconocer un comando directo de natación (ej. *«50 libre 26.40 en 25m»* o *«meta 100 mariposa sub 55»*).

Si deseas dialogar de forma libre y reflexiva con IA sobre tus entrenamientos y sensaciones, podés activar tu propia API Key (Google Gemini u OpenAI / Ollama) en **Ajustes de IA**.`,
        timestamp: new Date().toISOString(),
      };
      setMessages([...currentHistory, assistantMessage]);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await sendChatMessage(
        currentHistory,
        trimmed,
        profile,
        goals,
        aiSettings
      );

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toISOString(),
        draftMark: response.draftMark,
        draftGoal: response.draftGoal,
      };

      setMessages([...currentHistory, assistantMessage]);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Error al conectar con el proveedor de IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmMark = async (msgId: string, markData: DraftMarkData) => {
    try {
      await onSaveMark({
        eventId: markData.eventId,
        timeSec: markData.timeSec,
        poolLength: markData.poolLength,
        date: markData.date,
        venue: markData.venue || 'Pileta habitual',
        context: markData.context,
        modality: markData.modality,
        timing: markData.timing,
        feel: markData.feel,
        notes: markData.notes,
        splits: markData.splits || [],
        createdAt: new Date().toISOString(),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.draftMark
            ? { ...m, draftMark: { ...m.draftMark, confirmed: true } }
            : m
        )
      );

      setShowResetSuggestion(true);
    } catch (err) {
      setErrorMessage(`Error al guardar la marca: ${(err as Error).message}`);
    }
  };

  const handleConfirmGoal = async (msgId: string, goalData: DraftGoalData) => {
    try {
      await onSaveGoal({
        eventId: goalData.eventId,
        poolLength: goalData.poolLength,
        targetTimeSec: goalData.targetTimeSec,
        label: goalData.label || 'Meta conversacional',
        updatedAt: new Date().toISOString(),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.draftGoal
            ? { ...m, draftGoal: { ...m.draftGoal, confirmed: true } }
            : m
        )
      );

      setShowResetSuggestion(true);
    } catch (err) {
      setErrorMessage(`Error al guardar el objetivo: ${(err as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)] max-w-3xl md:max-w-4xl mx-auto text-on-surface">
      {/* Barra de cabecera de la vista de Chat */}
      <div className="glass-panel rounded-2xl p-3 border border-outline/40 flex items-center justify-between gap-2 shrink-0 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary-md3/10 border border-primary-md3/30 flex items-center justify-center text-primary-md3 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-on-surface leading-tight flex items-center gap-1.5">
              <span>Asistente Conversacional</span>
              <span className="px-1.5 py-0.5 rounded-full bg-primary-md3/20 text-primary-md3 text-[10px] font-mono font-bold">
                BYOK
              </span>
            </h2>
            <p className="text-[11px] text-on-surface-variant truncate">
              Voz · Parser Offline · Gemini & OpenAI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-high/80 text-on-surface-variant hover:text-on-surface transition-colors"
            title="Configuración de IA (BYOK)"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleClearChat}
            className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-high/80 text-on-surface-variant hover:text-on-surface transition-colors"
            title="Iniciar nueva conversación / Limpiar historial"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sugerencia de reinicio tras guardar */}
      {showResetSuggestion && (
        <div className="mb-2 p-2.5 rounded-xl bg-primary-md3/10 border border-primary-md3/30 text-primary-md3 text-xs flex items-center justify-between gap-2 shrink-0">
          <span>¡Registro exitoso! ¿Querés limpiar la sesión para optimizar tokens?</span>
          <button
            type="button"
            onClick={() => {
              setMessages([createWelcomeMessage(profile)]);
              setShowResetSuggestion(false);
            }}
            className="px-2.5 py-1 rounded-lg bg-primary-md3 text-on-primary font-bold text-[11px] hover:bg-primary-md3/90 shrink-0"
          >
            Nueva sesión
          </button>
        </div>
      )}

      {/* Banner de error si ocurrió */}
      {errorMessage && (
        <div className="mb-2 p-2.5 rounded-xl bg-status-rose/10 border border-status-rose/30 text-status-rose text-xs flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-on-surface-variant hover:text-on-surface font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Área de mensajes con scroll */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 pb-2">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-primary-md3/20 border border-primary-md3/30 flex items-center justify-center text-primary-md3 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-primary-md3 text-on-primary rounded-tr-sm shadow-md'
                    : 'bg-surface-container border border-outline/50 text-on-surface rounded-tl-sm shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Tarjetas interactivas de borrador */}
                {msg.draftMark && (
                  <div className="mt-2.5">
                    <DraftMarkCard
                      draft={msg.draftMark}
                      profile={profile}
                      onConfirm={(finalData) => handleConfirmMark(msg.id, finalData)}
                    />
                  </div>
                )}

                {msg.draftGoal && (
                  <div className="mt-2.5">
                    <DraftGoalCard
                      draft={msg.draftGoal}
                      profile={profile}
                      marks={marks}
                      onConfirm={(finalData) => handleConfirmGoal(msg.id, finalData)}
                    />
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-surface-container-high border border-outline/50 flex items-center justify-center text-on-surface-variant shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-lg bg-primary-md3/20 border border-primary-md3/30 flex items-center justify-center text-primary-md3 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="rounded-2xl p-3 bg-surface-container border border-outline/50 text-on-surface-variant text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-md3 animate-pulse" />
              <span>Analizando y redactando respuesta...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Barra de entrada de texto y micrófono */}
      <form
        onSubmit={handleSend}
        className="glass-panel rounded-2xl p-2 border border-outline/40 flex items-center gap-2 shrink-0 mt-2"
      >
        {isSpeechSupported && (
          <button
            type="button"
            onClick={handleToggleMic}
            className={`p-2.5 rounded-xl transition-all ${
              isListening
                ? 'bg-status-rose text-white animate-pulse shadow-lg shadow-status-rose/40'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/80'
            }`}
            title={isListening ? 'Detener dictado por voz' : 'Iniciar dictado por voz'}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={
            isListening
              ? 'Escuchando tu voz...'
              : 'Escribí o dictá: "50 libre 26.40 en 25m"...'
          }
          className="flex-1 bg-transparent border-0 text-on-surface placeholder:text-on-surface-variant/50 text-xs px-2 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isGenerating}
          className="p-2.5 rounded-xl bg-primary-md3 hover:bg-primary-md3/90 text-on-primary font-bold transition-all disabled:opacity-40 disabled:hover:bg-primary-md3 shadow-md shadow-primary-md3/20 active:scale-95"
          title="Enviar mensaje"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      <ChatSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

