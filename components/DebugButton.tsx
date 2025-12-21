import React, { useState } from 'react';
import { Bug } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const DebugButton: React.FC = () => {
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runTests = async () => {
    const logs: string[] = [];
    
    logs.push("=== 🔍 TESTE DE DEBUG ===\n");

    // TESTE 1: Verificar Auth
    logs.push("📋 TESTE 1: Autenticação");
    const user = auth.currentUser;
    
    if (!user) {
      logs.push("❌ NENHUM USUÁRIO LOGADO!");
      logs.push("➡️ Faça login e rode o teste novamente\n");
    } else {
      logs.push("✅ Usuário logado!");
      logs.push(`📧 Email: ${user.email}`);
      logs.push(`🆔 UID: ${user.uid}`);
      logs.push(`✅ Email verificado: ${user.emailVerified}\n`);

      // TESTE 2: Obter Token
      logs.push("📋 TESTE 2: Token de Autenticação");
      try {
        const token = await user.getIdToken();
        logs.push("✅ Token obtido com sucesso!");
        logs.push(`Token: ${token.substring(0, 50)}...\n`);
      } catch (error: any) {
        logs.push("❌ ERRO ao obter token:");
        logs.push(`Código: ${error.code}`);
        logs.push(`Mensagem: ${error.message}\n`);
      }

      // TESTE 3: Testar Firestore
      logs.push("📋 TESTE 3: Acesso ao Firestore");
      try {
        const testRef = doc(db, 'usuarios', user.uid);
        
        logs.push("💾 Tentando escrever no Firestore...");
        await setDoc(testRef, { 
          testeDebug: true, 
          timestamp: new Date().toISOString() 
        }, { merge: true });
        
        logs.push("✅ ESCRITA funcionou!");

        logs.push("📖 Tentando ler do Firestore...");
        const docSnap = await getDoc(testRef);
        
        if (docSnap.exists()) {
          logs.push("✅ LEITURA funcionou!");
          logs.push(`Dados: ${JSON.stringify(docSnap.data())}\n`);
        } else {
          logs.push("⚠️ Documento não encontrado após escrita\n");
        }
      } catch (error: any) {
        logs.push("❌ ERRO ao acessar Firestore:");
        logs.push(`Código: ${error.code}`);
        logs.push(`Mensagem: ${error.message}`);
        logs.push(`Stack: ${error.stack}\n`);
      }
    }

    logs.push("=== FIM DOS TESTES ===");
    
    setResults(logs);
    setShowResults(true);

    // Também logar no console
    console.clear();
    logs.forEach(log => console.log(log));
  };

  return (
    <>
      <button
        onClick={runTests}
        className="text-slate-300 hover:text-white flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded hover:bg-slate-800 transition-colors border border-red-500"
        title="Debug Firebase"
      >
        <Bug className="w-4 h-4" />
        Debug
      </button>

      {showResults && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="p-4 bg-red-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5" />
                <h2 className="font-bold">Resultados do Debug</h2>
              </div>
              <button
                onClick={() => setShowResults(false)}
                className="text-white hover:bg-red-700 px-3 py-1 rounded"
              >
                Fechar
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] bg-slate-900 text-green-400 font-mono text-sm">
              {results.map((line, idx) => (
                <div key={idx} className="mb-1 whitespace-pre-wrap">
                  {line}
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-100 border-t flex justify-between items-center">
              <p className="text-xs text-slate-600">
                Os resultados também foram exibidos no Console (F12)
              </p>
              <button
                onClick={() => {
                  const text = results.join('\n');
                  navigator.clipboard.writeText(text);
                  alert('✅ Resultados copiados!');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              >
                Copiar Resultados
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};