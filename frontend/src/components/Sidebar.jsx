import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Menu, MessageSquarePlus, Trash2, User, X, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChats } from '../hooks/useChats';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ onChatDeleted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { user, logout } = useAuth();
  const { chats, deleteChat } = useChats();
  const location = useLocation();
  const navigate = useNavigate();

  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId);
      setDeleteConfirm(null);
      if (location.pathname === `/chat/${chatId}`) {
        navigate('/');
      }
      onChatDeleted?.();
    } catch (error) {
      console.error('Ошибка удаления чата:', error);
    }
  };

  const formatDateGroup = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    // Reset time for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (checkDate.getTime() === today.getTime()) return 'Сегодня';
    if (checkDate.getTime() === yesterday.getTime()) return 'Вчера';
    
    // Last 7 days
    if (now - date < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('ru-RU', { weekday: 'long' });
    }
    
    return date.toLocaleDateString('ru-RU', { month: 'long' });
  };

  // Group chats by date
  const groupedChats = chats.reduce((acc, chat) => {
    const group = formatDateGroup(chat.date_updated);
    if (!acc[group]) acc[group] = [];
    acc[group].push(chat);
    return acc;
  }, {});

  const getUserDisplayName = () => {
    if (user?.first_name) return user.first_name;
    return user?.username || 'Пользователь';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[var(--bg-sidebar)]/80 backdrop-blur-xl border-r border-gray-100/50">
      {/* Header */}
      <div className="p-4 mb-2">
        <Link 
          to="/" 
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary transition-all group-hover:scale-105 group-hover:shadow-glow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--text-main)]">Local Chat</span>
        </Link>
      </div>

      {/* New Chat Button */}
      <div className="px-3 mb-6">
        <Link
          to="/"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-white bg-[image:var(--primary-gradient)] rounded-xl shadow-lg shadow-primary/25 hover:shadow-glow-hover hover:scale-[1.02] transition-all active:scale-[0.98]"
        >
          <MessageSquarePlus size={18} />
          <span>Новый чат</span>
        </Link>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
        {chats.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            <MessageSquarePlus size={48} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">История пуста</p>
          </div>
        ) : (
          Object.entries(groupedChats).map(([group, groupChats]) => (
            <div key={group}>
              <h3 className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 opacity-70">
                {group}
              </h3>
              <ul className="space-y-1">
                {groupChats.map((chat) => {
                  const isActive = location.pathname === `/chat/${chat.id}`;
                  return (
                    <li key={chat.id} className="group relative">
                      <Link
                        to={`/chat/${chat.id}`}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden",
                          isActive 
                            ? "bg-primary/5 text-primary font-medium" 
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        {/* Active Indicator Strip */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                        )}

                        {/* Status Icon */}
                        {chat.status === 'generating' ? (
                          <Loader2 size={14} className="text-primary animate-spin shrink-0 ml-1" />
                        ) : chat.has_unread ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 ml-1" />
                        ) : (
                          <div className="w-1.5 h-1.5 shrink-0 ml-1" /> 
                        )}
                        
                        <span className="truncate text-sm flex-1 leading-snug ml-1">
                          {chat.title}
                        </span>
                      </Link>
                      
                      {/* Delete Action */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteConfirm(chat.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                        title="Удалить"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* User Profile */}
      <div className="p-3 mt-2 border-t border-gray-100/50">
        <div className="flex items-center justify-between px-2 py-2">
          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 flex-1 min-w-0 group"
          >
            <div className="w-9 h-9 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
              {getUserDisplayName().charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-gray-700 group-hover:text-primary transition-colors truncate">
                {getUserDisplayName()}
              </span>
              <span className="text-[10px] text-gray-400 truncate uppercase tracking-wide">
                Настройки
              </span>
            </div>
          </Link>
          
          <button
            onClick={() => {
                logout();
                navigate('/login');
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Выйти"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2.5 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 text-gray-600 active:scale-95 transition-all"
      >
        <Menu size={20} />
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-[var(--bg-sidebar)] h-screen border-r border-gray-100 flex-col shadow-[1px_0_20px_rgba(0,0,0,0.02)] z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl ring-1 ring-black/5"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto text-red-600">
                <Trash2 size={24} />
              </div>
              
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
                Удалить чат?
              </h3>
              <p className="text-center text-gray-500 mb-6 text-sm">
                История переписки будет безвозвратно удалена.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleDeleteChat(deleteConfirm)}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
