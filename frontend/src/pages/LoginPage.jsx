import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const isValid = username.trim() && password.trim();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         {/* Tech Grid Pattern */}
         <div className="absolute inset-0 opacity-[0.03]" 
              style={{ 
                backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', 
                backgroundSize: '24px 24px' 
              }} 
         />
         <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-3xl opacity-60 mix-blend-multiply" />
         <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-400/5 rounded-full blur-3xl opacity-60 mix-blend-multiply" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-lg shadow-primary/10 mb-5 relative overflow-hidden group">
             <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
             <Sparkles className="w-7 h-7 text-primary relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">
            Local Chat
          </h1>
          <p className="text-[var(--text-muted)] mt-2 text-sm uppercase tracking-wider font-medium">
            Personal AI Workspace
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-glow border border-white/50">
          <h2 className="text-xl font-bold text-[var(--text-main)] mb-8 text-center">
            Вход в систему
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Логин */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1">
                Логин
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ваш логин"
                className="w-full px-4 py-3.5 bg-[#F0F2F5] border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-gray-400 font-medium text-[var(--text-main)]"
              />
            </div>

            {/* Пароль */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 bg-[#F0F2F5] border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-gray-400 pr-12 font-medium text-[var(--text-main)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary transition-colors hover:bg-white rounded-md"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Ошибка */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Кнопка */}
            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full py-3.5 bg-[image:var(--primary-gradient)] text-white font-semibold rounded-xl hover:shadow-glow-hover hover:scale-[1.01] transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Продолжить'}
            </button>
          </form>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-8 font-medium">
          Нет аккаунта? Обратитесь к администратору
        </p>
      </motion.div>
    </div>
  );
}
