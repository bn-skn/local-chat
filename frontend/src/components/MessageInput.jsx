import { useRef, useState } from 'react';
import { ArrowUp, X, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export default function MessageInput({ onSend, onCancel, disabled, loading }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e) => {
    setMessage(e.target.value);
    // Auto-resize
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto z-20">
      <form 
        onSubmit={handleSubmit} 
        className={cn(
          "relative flex items-end gap-2 p-2 rounded-[26px] bg-[#F0F2F5] transition-all duration-300 outline-none",
          "focus-within:bg-white focus-within:shadow-glow focus-within:ring-2 focus-within:ring-primary/20",
          !disabled && "hover:bg-white/50"
        )}
      >
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            disabled={disabled}
            rows={1}
            className="w-full pl-5 py-3.5 max-h-[200px] bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-[var(--text-main)] placeholder:text-gray-400 disabled:opacity-50 text-[15px] leading-relaxed"
            style={{ minHeight: '48px' }}
          />
        </div>
        
        <div className="flex items-center gap-1 pr-1 pb-1.5">
          {loading ? (
             <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
              title="Отменить"
            >
              <X size={20} className="animate-in zoom-in duration-200" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className={cn(
                "w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center",
                message.trim() && !disabled
                  ? "bg-[image:var(--primary-gradient)] text-white shadow-lg shadow-primary/20 hover:shadow-glow hover:scale-105 active:scale-95" 
                  : "bg-gray-300 text-white cursor-not-allowed"
              )}
              title="Отправить"
            >
              <ArrowUp size={20} />
            </button>
          )}
        </div>
      </form>
      
      {/* Disclaimer */}
      <div className="absolute -bottom-7 left-0 w-full text-center">
        <p className="text-[10px] text-gray-400/80 font-medium tracking-wide">
          AI может ошибаться. Проверяйте факты.
        </p>
      </div>
    </div>
  );
}
