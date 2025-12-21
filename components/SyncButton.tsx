import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Upload, Download, CheckCircle, AlertCircle, Loader, Users } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { CatalogItem, SavedQuote, LearnedMatch } from '../types';

interface SyncButtonProps {
  catalog: CatalogItem[];
  catalogDate: string | null;
  quoteHistory: SavedQuote[];
  learnedMatches: LearnedMatch[];
  onLoadData: (data: {
    catalogo: CatalogItem[];
    catalogDate: string | null;
    orcamentos: SavedQuote[];
    aprendizado: LearnedMatch[];
  }) => void;
  currentUserId: string | null;
}

type SyncStatus = 'idle' | 'uploading' | 'downloading' | 'success' | 'error';

export const SyncButton: React.FC<SyncButtonProps> = ({
  catalog,
  catalogDate,
  quoteHistory,
  learnedMatches,
  onLoadData,
  currentUserId
}) => {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showMenu, setShowMenu] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("🔐 SyncButton - Auth state:", user?.email || "not logged in");
      setAuthUser(user);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // ✅ UPLOAD - Mescla orçamentos (não sobrescreve)
  const handleUpload = async () => {
    console.log("📤 Upload para DADOS COMPARTILHADOS iniciado");
    
    if (!authReady) {
      alert('⏳ Aguardando autenticação...\n\nTente novamente em alguns segundos.');
      return;
    }

    const user = auth.currentUser;
    
    if (!user) {
      alert('❌ Você precisa estar logado para sincronizar!');
      return;
    }

    if (catalog.length === 0 && quoteHistory.length === 0 && learnedMatches.length === 0) {
      alert('⚠️ Não há dados para enviar para a nuvem.');
      return;
    }

    const confirmUpload = window.confirm(
      `📤 Enviar dados para a nuvem COMPARTILHADA?\n\n` +
      `🏢 Dados da KF Elétrica (todos os vendedores verão)\n\n` +
      `• Catálogo: ${catalog.length} produtos\n` +
      `• Seus orçamentos: ${quoteHistory.length} itens\n` +
      `• Aprendizado: ${learnedMatches.length} correspondências\n\n` +
      `✅ Seus orçamentos serão MESCLADOS com os existentes\n` +
      `✅ Cada orçamento mostrará quem criou\n\n` +
      `Continuar?`
    );

    if (!confirmUpload) return;

    setStatus('uploading');
    setErrorMessage('');

    try {
      console.log("🔥 Acessando Firestore COMPARTILHADO...");
      console.log("📍 Caminho: kf_eletrica/dados_empresa");

      await user.getIdToken(true);
      console.log("✅ Token renovado");

      const empresaDataRef = doc(db, 'kf_eletrica', 'dados_empresa');
      
      // ✅ PRIMEIRO, busca dados existentes
      console.log("📥 Buscando dados existentes...");
      const docSnap = await getDoc(empresaDataRef);
      
      let orcamentosExistentes: SavedQuote[] = [];
      let aprendizadoExistente: LearnedMatch[] = [];
      
      if (docSnap.exists()) {
        const dadosExistentes = docSnap.data();
        orcamentosExistentes = dadosExistentes.orcamentos || [];
        aprendizadoExistente = dadosExistentes.aprendizado || [];
        console.log(`📊 Encontrados ${orcamentosExistentes.length} orçamentos existentes`);
      }

      // ✅ ADICIONA informação de quem criou aos orçamentos LOCAIS
      const orcamentosComAutor = quoteHistory.map(quote => ({
        ...quote,
        criadoPor: quote.criadoPor || user.email, // Mantém se já tem, senão adiciona
        criadoEm: quote.criadoEm || new Date().toISOString(),
        criadoPorUid: quote.criadoPorUid || user.uid
      }));

      // ✅ MESCLA orçamentos (remove duplicatas por ID)
      const todosOrcamentosMap = new Map<string, SavedQuote>();
      
      // Adiciona orçamentos existentes
      orcamentosExistentes.forEach(orc => {
        todosOrcamentosMap.set(orc.id, orc);
      });
      
      // Sobrescreve/adiciona orçamentos locais
      orcamentosComAutor.forEach(orc => {
        todosOrcamentosMap.set(orc.id, orc);
      });
      
      const orcamentosMesclados = Array.from(todosOrcamentosMap.values());
      console.log(`✅ Total após mesclar: ${orcamentosMesclados.length} orçamentos`);

      // ✅ MESCLA aprendizado (remove duplicatas por texto)
      const aprendizadoMap = new Map<string, LearnedMatch>();
      
      aprendizadoExistente.forEach(apr => {
        aprendizadoMap.set(apr.originalText, apr);
      });
      
      learnedMatches.forEach(apr => {
        aprendizadoMap.set(apr.originalText, apr);
      });
      
      const aprendizadoMesclado = Array.from(aprendizadoMap.values());

      const dataToUpload = {
        catalogo: catalog,
        catalogoData: catalogDate,
        orcamentos: orcamentosMesclados, // ✅ Todos os orçamentos mesclados
        aprendizado: aprendizadoMesclado,
        ultimaAtualizacao: new Date().toISOString(),
        atualizadoPor: user.email,
        atualizadoPorUid: user.uid
      };

      console.log("💾 Salvando dados compartilhados...");
      console.log(`📊 Total de orçamentos: ${orcamentosMesclados.length}`);
      
      await setDoc(empresaDataRef, dataToUpload);
      
      console.log("✅ Dados compartilhados salvos!");

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setShowMenu(false);
      }, 2000);

      const novosOrcamentos = orcamentosMesclados.length - orcamentosExistentes.length;

      alert(
        `✅ Dados enviados para a nuvem compartilhada!\n\n` +
        `🏢 KF Elétrica - Dados da Empresa\n\n` +
        `📊 Orçamentos:\n` +
        `• Existentes na nuvem: ${orcamentosExistentes.length}\n` +
        `• Seus locais: ${quoteHistory.length}\n` +
        `• Total na nuvem agora: ${orcamentosMesclados.length}\n` +
        `${novosOrcamentos > 0 ? `• Novos adicionados: ${novosOrcamentos}\n` : ''}\n` +
        `📦 Outros dados:\n` +
        `• Catálogo: ${catalog.length} produtos\n` +
        `• Aprendizado: ${aprendizadoMesclado.length} correspondências\n\n` +
        `👥 Todos os vendedores podem acessar!`
      );
    } catch (error: any) {
      console.error('❌ Erro ao fazer upload:', error);
      console.error('Código:', error.code);
      console.error('Mensagem:', error.message);
      
      setStatus('error');
      setErrorMessage(error.message || 'Erro desconhecido');
      
      alert(
        `❌ Erro ao enviar dados para a nuvem!\n\n` +
        `Código: ${error.code}\n` +
        `Erro: ${error.message}\n\n` +
        `Verifique:\n` +
        `1. Se você está conectado à internet\n` +
        `2. Se as regras do Firestore estão corretas\n` +
        `3. Console (F12) para mais detalhes`
      );
    }
  };

  // ✅ DOWNLOAD - Carrega todos os orçamentos
  const handleDownload = async () => {
    console.log("📥 Download dos DADOS COMPARTILHADOS iniciado");
    
    if (!authReady) {
      alert('⏳ Aguardando autenticação...');
      return;
    }

    const user = auth.currentUser;
    
    if (!user) {
      alert('❌ Você precisa estar logado!');
      return;
    }

    const confirmDownload = window.confirm(
      `📥 Carregar dados da nuvem COMPARTILHADA?\n\n` +
      `🏢 Dados da KF Elétrica\n\n` +
      `Isso irá SUBSTITUIR seus dados locais pelos dados\n` +
      `compartilhados da empresa (incluindo orçamentos\n` +
      `de todos os vendedores).\n\n` +
      `Continuar?`
    );

    if (!confirmDownload) return;

    setStatus('downloading');
    setErrorMessage('');

    try {
      console.log("🔥 Buscando dados compartilhados...");
      
      await user.getIdToken(true);
      
      const empresaDataRef = doc(db, 'kf_eletrica', 'dados_empresa');
      const docSnap = await getDoc(empresaDataRef);

      if (!docSnap.exists()) {
        alert(
          '⚠️ Nenhum dado compartilhado encontrado!\n\n' +
          '🏢 A empresa ainda não tem dados na nuvem.\n\n' +
          'Faça o primeiro upload para criar os dados compartilhados!'
        );
        setStatus('idle');
        return;
      }

      const cloudData = docSnap.data();
      console.log("📦 Dados compartilhados recebidos!");
      console.log(`📊 Orçamentos na nuvem: ${cloudData.orcamentos?.length || 0}`);

      const loadedData = {
        catalogo: cloudData.catalogo || [],
        catalogDate: cloudData.catalogoData || null,
        orcamentos: cloudData.orcamentos || [],
        aprendizado: cloudData.aprendizado || [],
      };

      // ✅ Conta orçamentos por vendedor
      const orcamentosPorVendedor = new Map<string, number>();
      cloudData.orcamentos?.forEach((orc: any) => {
        const vendedor = orc.criadoPor || 'Desconhecido';
        orcamentosPorVendedor.set(vendedor, (orcamentosPorVendedor.get(vendedor) || 0) + 1);
      });

      onLoadData(loadedData);

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setShowMenu(false);
      }, 2000);

      const atualizadoPor = cloudData.atualizadoPor || 'Desconhecido';
      const dataAtualizacao = cloudData.ultimaAtualizacao 
        ? new Date(cloudData.ultimaAtualizacao).toLocaleString('pt-BR')
        : 'Desconhecida';

      let resumoVendedores = '';
      if (orcamentosPorVendedor.size > 0) {
        resumoVendedores = '\n\n📊 Orçamentos por vendedor:\n';
        orcamentosPorVendedor.forEach((count, vendedor) => {
          resumoVendedores += `• ${vendedor}: ${count} orçamentos\n`;
        });
      }

      alert(
        `✅ Dados compartilhados carregados!\n\n` +
        `🏢 KF Elétrica - Dados da Empresa\n\n` +
        `• ${loadedData.catalogo.length} produtos no catálogo\n` +
        `• ${loadedData.orcamentos.length} orçamentos (todos os vendedores)\n` +
        `• ${loadedData.aprendizado.length} correspondências\n` +
        resumoVendedores +
        `\n📅 Última atualização: ${dataAtualizacao}\n` +
        `👤 Por: ${atualizadoPor}`
      );
    } catch (error: any) {
      console.error('❌ Erro ao fazer download:', error);
      console.error('Código:', error.code);
      
      setStatus('error');
      setErrorMessage(error.message || 'Erro desconhecido');
      
      alert(
        `❌ Erro ao carregar dados da nuvem!\n\n` +
        `Erro: ${error.message}\n\n` +
        `Verifique o console (F12) para mais detalhes`
      );
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
      case 'downloading':
        return <Loader className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return authUser ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />;
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'uploading':
        return 'Enviando...';
      case 'downloading':
        return 'Baixando...';
      case 'success':
        return 'Sucesso!';
      case 'error':
        return 'Erro!';
      default:
        return 'Nuvem';
    }
  };

  if (!authReady || !authUser) {
    return (
      <button
        disabled
        className="text-slate-400 flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded cursor-not-allowed opacity-50"
        title="Aguardando autenticação..."
      >
        <CloudOff className="w-4 h-4" />
        {authReady ? 'Nuvem (Offline)' : 'Carregando...'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={status === 'uploading' || status === 'downloading'}
        className={`
          text-slate-300 hover:text-white flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded transition-colors
          ${status === 'success' ? 'bg-green-500/20 text-green-400' : ''}
          ${status === 'error' ? 'bg-red-500/20 text-red-400' : ''}
          ${status === 'uploading' || status === 'downloading' ? 'bg-blue-500/20 text-blue-400' : ''}
          hover:bg-slate-800
        `}
      >
        {getStatusIcon()}
        {getButtonText()}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Nuvem Compartilhada
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              🏢 Dados da KF Elétrica
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Logado: {authUser.email}
            </p>
          </div>

          <div className="p-2">
            <button
              onClick={handleUpload}
              disabled={status !== 'idle'}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-medium">Enviar para Nuvem</div>
                <div className="text-xs text-slate-500">
                  {catalog.length} produtos, {quoteHistory.length} orçamentos
                </div>
                <div className="text-xs text-green-600 font-medium mt-0.5">
                  ✅ Seus orçamentos serão mesclados
                </div>
              </div>
            </button>

            <button
              onClick={handleDownload}
              disabled={status !== 'idle'}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              <Download className="w-4 h-4 text-green-600" />
              <div>
                <div className="font-medium">Baixar da Nuvem</div>
                <div className="text-xs text-slate-500">
                  Todos os orçamentos dos vendedores
                </div>
              </div>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border-t border-red-200">
              <p className="text-xs text-red-700">
                <strong>Erro:</strong> {errorMessage}
              </p>
            </div>
          )}

          <div className="p-3 bg-blue-50 border-t border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>💡 Dica:</strong> Orçamentos são mesclados (não sobrescritos). Cada um mostra quem criou!
            </p>
          </div>

          <div className="p-2 bg-slate-50 border-t border-slate-200">
            <button
              onClick={() => setShowMenu(false)}
              className="w-full text-xs text-slate-500 hover:text-slate-700 py-1"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};