import React, { useState } from 'react';
import { Zap, FileText, Edit3, BarChart3, Clock, Brain, Settings, LogOut, User, ChevronDown, Menu, X, Bug } from 'lucide-react';
import { SyncButton } from './SyncButton';
import { CatalogItem, SavedQuote, LearnedMatch } from '../types';

interface ModernHeaderProps {
  currentUser: any;
  matchStats: any[];
  onOpenManualQuote: () => void;
  onOpenProfessionalQuote: () => void;
  onOpenDashboard: () => void;
  onOpenHistory: () => void;
  onOpenLearning: () => void;
  onOpenSettings: () => void;
  onOpenDebug: () => void;
  onLogout: () => void;
  // ✅ PROPS PARA SYNC
  catalog: CatalogItem[];
  catalogDate: string | null;
  quoteHistory: SavedQuote[];
  learnedMatches: LearnedMatch[];
  onLoadData: (data: any) => void;
  currentUserId: string | null;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  currentUser,
  matchStats,
  onOpenManualQuote,
  onOpenProfessionalQuote,
  onOpenDashboard,
  onOpenHistory,
  onOpenLearning,
  onOpenSettings,
  onOpenDebug,
  onLogout,
  // ✅ RECEBE AS PROPS DO SYNC
  catalog,
  catalogDate,
  quoteHistory,
  learnedMatches,
  onLoadData,
  currentUserId
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isOrcamentosMenuOpen, setIsOrcamentosMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl sticky top-0 z-50 print:hidden border-b border-slate-700">
      <div className="container mx-auto px-4">
        
        {/* Desktop Header */}
        <div className="h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 p-2 rounded-xl shadow-lg">
              <Zap className="text-slate-900 w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
                KF Elétrica
              </h1>
              <p className="text-xs text-slate-400">Sistema de Orçamentos v2.0</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            
            {/* Dropdown Orçamentos */}
            <div className="relative">
              <button
                onClick={() => setIsOrcamentosMenuOpen(!isOrcamentosMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all"
              >
                <FileText className="w-4 h-4" />
                Orçamentos
                <ChevronDown className={`w-4 h-4 transition-transform ${isOrcamentosMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOrcamentosMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      onOpenManualQuote();
                      setIsOrcamentosMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left border-b border-slate-700"
                  >
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <Edit3 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Orçamento Manual</p>
                      <p className="text-xs text-slate-400">Criar orçamento do zero</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenProfessionalQuote();
                      setIsOrcamentosMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="bg-yellow-500/20 p-2 rounded-lg">
                      <FileText className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm flex items-center gap-2">
                        Orçamento Profissional
                        <span className="text-xs bg-yellow-500 text-slate-900 px-2 py-0.5 rounded-full font-bold">PRO</span>
                      </p>
                      <p className="text-xs text-slate-400">Formato completo para impressão</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Botões diretos */}
            <button
              onClick={onOpenDashboard}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </button>

            <button
              onClick={onOpenHistory}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all"
            >
              <Clock className="w-4 h-4" />
              Histórico
            </button>

            <button
              onClick={onOpenLearning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all"
            >
              <Brain className="w-4 h-4" />
              Aprendizados
            </button>

            <button
              onClick={onOpenDebug}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-yellow-400 hover:bg-slate-700/50 transition-all"
            >
              <Bug className="w-4 h-4" />
            </button>
          </nav>

          {/* Stats + Sync + User Menu */}
          <div className="hidden lg:flex items-center gap-4">
            
            {/* Stats */}
            {matchStats && matchStats.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-bold text-sm">{matchStats[0]?.value || 0}</span>
                  <span className="text-slate-400 text-xs">encontrados</span>
                </div>
                <div className="w-px h-4 bg-slate-700"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-red-400 font-bold text-sm">{matchStats[1]?.value || 0}</span>
                  <span className="text-slate-400 text-xs">pendentes</span>
                </div>
              </div>
            )}

            {/* ✅ SYNC BUTTON */}
            <SyncButton
              catalog={catalog}
              catalogDate={catalogDate}
              quoteHistory={quoteHistory}
              learnedMatches={learnedMatches}
              onLoadData={onLoadData}
              currentUserId={currentUserId}
            />

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-all"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center font-bold text-slate-900 text-sm">
                  {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="text-left hidden xl:block">
                  <p className="text-sm font-semibold text-white leading-tight">
                    {currentUser?.displayName || 'Usuário'}
                  </p>
                  <p className="text-xs text-slate-400 leading-tight">
                    {currentUser?.email}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-700">
                    <p className="font-semibold text-white text-sm">
                      {currentUser?.displayName || 'Usuário'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {currentUser?.email}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onOpenSettings();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left border-b border-slate-700"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-white">Configurações</span>
                  </button>

                  <button
                    onClick={() => {
                      onLogout();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400 font-semibold">Sair</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-700 animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onOpenManualQuote();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
              >
                <Edit3 className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold">Orçamento Manual</span>
              </button>

              <button
                onClick={() => {
                  onOpenProfessionalQuote();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
              >
                <FileText className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-semibold">Orçamento Profissional</span>
                <span className="text-xs bg-yellow-500 text-slate-900 px-2 py-0.5 rounded-full font-bold ml-auto">PRO</span>
              </button>

              <button
                onClick={() => {
                  onOpenDashboard();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
              >
                <BarChart3 className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-semibold">Dashboard</span>
              </button>

              <button
                onClick={() => {
                  onOpenHistory();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
              >
                <Clock className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-semibold">Histórico</span>
              </button>

              <button
                onClick={() => {
                  onOpenLearning();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
              >
                <Brain className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-semibold">Aprendizados</span>
              </button>

              {/* ✅ SYNC BUTTON MOBILE */}
              <div className="px-4 py-2">
                <SyncButton
                  catalog={catalog}
                  catalogDate={catalogDate}
                  quoteHistory={quoteHistory}
                  learnedMatches={learnedMatches}
                  onLoadData={onLoadData}
                  currentUserId={currentUserId}
                />
              </div>

              <div className="h-px bg-slate-700 my-2"></div>

              <button
                onClick={() => {
                  onOpenSettings();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
              >
                <Settings className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-semibold">Configurações</span>
              </button>

              <button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 transition-colors text-left"
              >
                <LogOut className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold text-red-400">Sair</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};