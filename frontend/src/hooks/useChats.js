import { useCallback, useEffect, useRef, useState } from 'react';
import { chatsAPI } from '../lib/api';

export function useChats() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await chatsAPI.getAll();
      setChats(response.data.chats);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки чатов');
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling: обновляем список чатов каждые 3 секунды
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const response = await chatsAPI.getAll();
        setChats(response.data.chats);
      } catch (err) {
        // Молча игнорируем ошибки при polling
      }
    }, 3000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Автоматически запускаем polling при монтировании
  useEffect(() => {
    fetchChats();
    startPolling();
    return () => stopPolling();
  }, [fetchChats, startPolling, stopPolling]);

  const createChat = useCallback(async () => {
    const response = await chatsAPI.create();
    const newChat = response.data.chat;
    setChats(prev => [newChat, ...prev]);
    return newChat;
  }, []);

  const deleteChat = useCallback(async (chatId) => {
    await chatsAPI.delete(chatId);
    setChats(prev => prev.filter(chat => chat.id !== chatId));
  }, []);

  return {
    chats,
    loading,
    error,
    fetchChats,
    createChat,
    deleteChat,
    setChats,
    startPolling,
    stopPolling
  };
}
