import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import MessageInput from '../components/MessageInput';
import TechLoader from '../components/TechLoader';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { chatsAPI } from '../lib/api';

export default function ChatPage() {
  const { id } = useParams();
  const location = useLocation();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Загрузка чата
  const fetchChat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await chatsAPI.get(id);
      setChat(response.data.chat);
      setMessages(response.data.messages);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки чата');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  // Обработка начального сообщения (при создании чата с главной страницы)
  useEffect(() => {
    if (location.state?.initialMessage && !loading && messages.length === 0) {
      handleSendMessage(location.state.initialMessage);
      // Очищаем state, чтобы не отправлять повторно
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loading, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Polling сообщений: если чат в статусе generating, проверяем каждые 2 сек
  useEffect(() => {
    let interval = null;
    
    if (chat?.status === 'generating') {
      interval = setInterval(async () => {
        try {
          const response = await chatsAPI.get(id);
          setMessages(response.data.messages);
          
          // Если генерация завершена, обновляем статус чата
          if (response.data.chat.status === 'idle') {
            setChat(response.data.chat);
          }
        } catch (err) {
          // Игнорируем ошибки при polling
        }
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [chat?.status, id]);

  const handleSendMessage = async (content) => {
    setError(null);
    setSending(true);
    
    // Добавляем сообщение пользователя в UI (оптимистичное обновление)
    const tempUserMessage = {
      id: 'temp-user',
      role: 'user',
      content,
      date_created: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);
    scrollToBottom();

    try {
      const response = await chatsAPI.sendMessage(id, content);
      
      // Сервер вернул 202 Accepted — задача в очереди
      if (response.status === 202) {
        // Заменяем временное сообщение на реальное
        setMessages(prev => [
          ...prev.filter(m => m.id !== 'temp-user'),
          response.data.user_message
        ]);
        
        // Обновляем статус чата на "generating" для запуска polling
        setChat(prev => ({ ...prev, status: 'generating' }));
      } else {
        // Старая логика (на случай если бэкенд ещё не обновлён)
        if (response.data.assistant_message) {
          setMessages(prev => [
            ...prev.filter(m => m.id !== 'temp-user'),
            response.data.user_message,
            response.data.assistant_message
          ]);
        }
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Ошибка отправки сообщения';
      setError(errorMessage);
      
      // Если сервер вернул сообщение пользователя, используем его
      if (err.response?.data?.user_message) {
        setMessages(prev => [
          ...prev.filter(m => m.id !== 'temp-user'),
          err.response.data.user_message
        ]);
      } else {
        // Удаляем временное сообщение
        setMessages(prev => prev.filter(m => m.id !== 'temp-user'));
      }
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async () => {
    // Локальная отмена ожидания: перестаём ждать ответа, скрываем лоадер и останавливаем polling
    setSending(false);
    if (chat) {
      setChat(prev => ({ ...prev, status: 'idle' }));
    }
    
    // Серверная отмена: сообщаем бэкенду, что результат не нужен
    try {
      await chatsAPI.cancel(id);
    } catch (err) {
      console.error('Ошибка при отмене генерации:', err);
    }
  };

  const handleRegenerate = async () => {
    setError(null);
    setSending(true);
    
    try {
      const response = await chatsAPI.regenerate(id);
      
      // Заменяем последнее сообщение ассистента
      setMessages(prev => {
        const newMessages = [...prev];
        const lastAssistantIndex = newMessages.findLastIndex(m => m.role === 'assistant');
        if (lastAssistantIndex !== -1) {
          newMessages[lastAssistantIndex] = response.data.assistant_message;
        }
        return newMessages;
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регенерации');
    } finally {
      setSending(false);
    }
  };

  const handleRetry = () => {
    // Находим последнее сообщение пользователя и отправляем повторно
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Удаляем ошибочные сообщения и повторяем
      setMessages(prev => prev.filter(m => m.id !== lastUserMessage.id));
      handleSendMessage(lastUserMessage.content);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Загрузка...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Заголовок */}
        <header className="px-4 py-3 border-b border-gray-200 bg-white">
          <h1 className="text-lg font-semibold text-gray-900 lg:pl-0 pl-12">
            {chat?.title || 'Чат'}
          </h1>
        </header>

        {/* Сообщения */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-3xl mx-auto">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLast={index === messages.length - 1 && message.role === 'assistant'}
                onRegenerate={!sending ? handleRegenerate : undefined}
              />
            ))}
            
            {/* Loading Indicator */}
            {(sending || chat?.status === 'generating') && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full justify-start mb-6"
              >
                 <div className="flex max-w-[70%] gap-4">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-glow">
                      <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      </div>
                    </div>
                    
                    {/* Loader Bubble */}
                    <div className="relative px-5 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm rounded-tl-sm flex items-center gap-3">
                       <TechLoader className="w-6 h-6" />
                       <span className="text-xs font-semibold text-primary uppercase tracking-wider animate-pulse">
                         AI Analyzing...
                       </span>
                    </div>
                 </div>
              </motion.div>
            )}
            
            {error && (
              <div className="flex justify-start mb-4">
                <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-2xl max-w-[85%]">
                  <p className="text-red-600 text-sm mb-2">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Повторить
                  </button>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Поле ввода */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="max-w-3xl mx-auto">
            <MessageInput
              onSend={handleSendMessage}
              onCancel={handleCancel}
              disabled={sending || chat?.status === 'generating'}
              loading={sending || chat?.status === 'generating'}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
