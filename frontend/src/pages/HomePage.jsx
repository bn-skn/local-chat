import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MessageInput from '../components/MessageInput';
import { chatsAPI } from '../lib/api';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquare } from 'lucide-react';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendMessage = async (content) => {
    setLoading(true);
    try {
      // Создаём новый чат
      const chatResponse = await chatsAPI.create();
      const chat = chatResponse.data.chat;
      
      // Переходим на странице чата с сообщением
      navigate(`/chat/${chat.id}`, { state: { initialMessage: content } });
    } catch (error) {
      console.error('Ошибка создания чата:', error);
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-app)]">
      <Sidebar />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />

        {/* Central Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-lg"
          >
            <div className="w-16 h-16 bg-white rounded-2xl shadow-xl shadow-gray-200/50 flex items-center justify-center mx-auto mb-6 transform rotate-3">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Привет! Чем могу помочь?
            </h1>
            <p className="text-gray-500 mb-8 text-lg">
              Я могу помочь с кодом, текстами или просто поболтать.
            </p>
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-600">
                Модель: qwen3:30b
              </span>
            </div>
          </motion.div>
        </div>

        {/* Input Area */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="p-6 pb-10"
        >
          <div className="max-w-3xl mx-auto">
            <MessageInput
              onSend={handleSendMessage}
              disabled={loading}
              loading={loading}
            />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
