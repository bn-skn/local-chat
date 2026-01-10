import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogOut, Lock, Save } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';
import { profileAPI } from '../lib/api';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await profileAPI.get();
        const profile = response.data.profile;
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await profileAPI.update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null
      });
      
      updateUser({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null
      });
      
      setMessage('Изменения сохранены');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const hasChanges = 
    firstName !== (user?.first_name || '') || 
    lastName !== (user?.last_name || '');

  return (
    <div className="flex h-screen bg-[var(--bg-app)]">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-12 lg:pl-12 pl-20">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">
              Настройки
            </h1>
            <p className="text-[var(--text-muted)] mt-2">
              Управление профилем и аккаунтом
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={32} className="animate-spin text-[var(--text-muted)]" />
            </div>
          ) : (
            <>
              <form onSubmit={handleSave} className="bg-white p-8 rounded-[2rem] shadow-sm mb-8 border border-white/50">
                <div className="space-y-6">
                  {/* Имя */}
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 ml-1"
                    >
                      Имя
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Введите имя"
                      className="w-full px-5 py-3.5 bg-[#F0F2F5] border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-[var(--text-main)]"
                    />
                  </div>

                  {/* Фамилия */}
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 ml-1"
                    >
                      Фамилия
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Введите фамилию"
                      className="w-full px-5 py-3.5 bg-[#F0F2F5] border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium text-[var(--text-main)]"
                    />
                  </div>

                  {/* Логин (readonly) */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 ml-1">
                      Логин
                    </label>
                    <div className="w-full px-5 py-3.5 bg-gray-100 rounded-xl text-gray-500 font-medium flex items-center justify-between border border-transparent">
                      <span>{user?.username}</span>
                      <Lock size={16} className="text-gray-400" />
                    </div>
                  </div>

                  {/* Сообщение */}
                  {message && (
                    <div className={`text-sm text-center py-2 rounded-lg font-medium ${
                      message.includes('Ошибка') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'
                    }`}>
                      {message}
                    </div>
                  )}

                  {/* Кнопка сохранения */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!hasChanges || saving}
                      className={cn(
                        "w-full py-4 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg",
                        !hasChanges || saving 
                          ? "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed" 
                          : "bg-[image:var(--primary-gradient)] hover:shadow-glow-hover hover:scale-[1.01] shadow-primary/25"
                      )}
                    >
                      {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={18} />}
                      Сохранить изменения
                    </button>
                  </div>
                </div>
              </form>

              {/* Кнопка выхода */}
              <button
                onClick={handleLogout}
                className="w-full py-3 text-gray-400 font-medium hover:text-red-500 transition-colors flex items-center justify-center gap-2 group"
              >
                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                Выйти из аккаунта
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Utility for this file since we need cn
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
