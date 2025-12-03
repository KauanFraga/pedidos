import React, { useState } from 'react';
import { LogIn, UserPlus, X, Mail, Lock, User, Loader } from 'lucide-react';
import { registerUser, loginUser } from '../services/firebaseAuthService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!displayName.trim()) {
          throw new Error('Por favor, preencha seu nome');
        }
        await registerUser(email, password, displayName);
      } else {
        await loginUser(email, password);
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 text-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mode === 'login' ? (
                <LogIn className="w-8 h-8" />
              ) : (
                <UserPlus className="w-8 h-8" />
              )}
              <div>
                <h2 className="text-2xl font-bold">
                  {mode === 'login' ? 'Entrar' : 'Criar Conta'}
                </h2>
                <p className="text-sm opacity-80">KF Elétrica</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-yellow-600 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {mode === 'register' && (
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
                required
                minLength={6}
              />
            </div>
            {mode === 'register' && (
              <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 font-medium">❌ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
              </>
            ) : (
              <>
                {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                {mode === 'login' ? 'Entrar' : 'Criar Conta'}
              </>
            )}
          </button>

          <div className="text-center pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={switchMode}
              className="text-sm text-slate-600 hover:text-yellow-600 font-medium transition-colors"
            >
              {mode === 'login' 
                ? '✨ Não tem conta? Registre-se' 
                : '👈 Já tem conta? Faça login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
