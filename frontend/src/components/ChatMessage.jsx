import { Copy, RefreshCw, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ChatMessage({ message, isLast, onRegenerate }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Ошибка копирования:', error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full mb-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[70%] gap-4 group",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold select-none mt-1 shadow-sm",
          isUser 
            ? "bg-gray-200 text-gray-600" 
            : "bg-white border border-gray-100 text-primary shadow-glow"
        )}>
           {isUser ? 'ME' : <div className="w-4 h-4 rounded-full bg-primary" />}
        </div>

        {/* Bubble */}
        <div className={cn(
          "relative px-5 py-4 rounded-2xl shadow-sm leading-relaxed",
          isUser 
            ? "bg-[image:var(--primary-gradient)] text-white rounded-tr-sm shadow-glow" 
            : "bg-white border border-gray-100 text-[#333333] rounded-tl-sm shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="markdown-content prose prose-sm max-w-none prose-p:text-[#333333] prose-headings:text-gray-900 prose-strong:text-gray-900 prose-code:text-primary prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="rounded-lg overflow-hidden my-3 border border-gray-200 shadow-sm bg-gray-50">
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: 0, background: '#1e1e1e' }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className={cn(
                        "px-1.5 py-0.5 rounded font-mono text-[12px] font-medium",
                        "bg-primary/10 text-primary"
                      )} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Action Bar (Assistant Only) */}
          {!isUser && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-gray-400 hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                title="Копировать"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>Copy</span>
              </button>
              {isLast && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-gray-400 hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                  title="Повторить"
                >
                  <RefreshCw size={12} />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
