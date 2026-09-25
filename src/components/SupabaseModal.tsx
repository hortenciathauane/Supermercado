import React, { useState } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Terminal,
  UploadCloud
} from 'lucide-react';
import { 
  getSavedCredentials, 
  saveCredentials, 
  clearCredentials, 
  testSupabaseConnection, 
  SUPABASE_SQL_SCHEMA 
} from '../lib/supabase.ts';
import { dbService } from '../services/db.ts';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChanged: () => void;
  isConnected: boolean;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConnectionChanged,
  isConnected,
}) => {
  const creds = getSavedCredentials();
  const [url, setUrl] = useState(creds.url || '');
  const [anonKey, setAnonKey] = useState(creds.anonKey || '');
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'sql' | 'sync'>('config');
  
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ produtos: number; vendas: number; erro?: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    saveCredentials(url, anonKey);
    onConnectionChanged();
    setTestResult({
      success: true,
      message: 'Configurações salvas com sucesso! Testando conexão...',
    });
    handleTestConnection();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(url, anonKey);
      setTestResult(res);
      if (res.success) {
        onConnectionChanged();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Falha ao testar conexão.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    clearCredentials();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    onConnectionChanged();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await dbService.sincronizarComSupabase();
      setSyncResult({
        produtos: res.produtosEnviados,
        vendas: res.vendasEnviadas,
        erro: res.erro,
      });
    } catch (err: any) {
      setSyncResult({ produtos: 0, vendas: 0, erro: err.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Conexão com o Supabase</h2>
              <p className="text-xs text-slate-300">
                Guarde todos os seus produtos, vendas e estoque em nuvem com segurança
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveSubTab('config')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition -mb-[2px] ${
              activeSubTab === 'config'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg border-t border-l border-r border-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Configuração
          </button>
          <button
            onClick={() => setActiveSubTab('sql')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition -mb-[2px] ${
              activeSubTab === 'sql'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg border-t border-l border-r border-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Script SQL (Criar Tabelas)
          </button>
          <button
            onClick={() => setActiveSubTab('sync')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition -mb-[2px] ${
              activeSubTab === 'sync'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg border-t border-l border-r border-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sincronização
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeSubTab === 'config' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isConnected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {isConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs">
                  <p className="font-bold text-sm">
                    {isConnected ? 'Supabase Conectado e Ativo' : 'Armazenamento Pronto para Supabase'}
                  </p>
                  <p className="mt-0.5 text-slate-600">
                    {isConnected
                      ? 'Todas as novas operações de estoque e vendas são salvas diretamente no seu projeto Supabase.'
                      : 'O sistema está pronto para receber suas credenciais. Enquanto não configurado, os dados que você cadastrar serão guardados com segurança no navegador e poderão ser sincronizados com 1 clique.'}
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL do Projeto Supabase (Project URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-slate-800"
                  />
                  <span className="text-[11px] text-slate-500">
                    Encontrado no painel do Supabase em: <b>Project Settings → API → Project URL</b>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chave Anônima Pública (Anon Key)
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-slate-800"
                  />
                  <span className="text-[11px] text-slate-500">
                    Encontrado em: <b>Project Settings → API → Project API Keys (anon public)</b>
                  </span>
                </div>
              </div>

              {/* Test feedback */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs border flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing || !url || !anonKey}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {testing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Testar Conexão
                      </>
                    )}
                  </button>

                  {isConnected && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition"
                    >
                      Desconectar
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!url || !anonKey}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-700/40 disabled:opacity-50"
                >
                  Salvar e Conectar
                </button>
              </div>
            </div>
          )}

          {activeSubTab === 'sql' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2.5">
                <Terminal className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">Como criar as tabelas no Supabase:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-600">
                    <li>Abra seu projeto no <b>Supabase</b> (app.supabase.com)</li>
                    <li>No menu lateral, clique em <b>SQL Editor</b></li>
                    <li>Clique em <b>New Query</b>, cole o script abaixo e clique em <b>Run</b></li>
                  </ol>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-slate-600">Script SQL DDL:</span>
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Script SQL
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-60 border border-slate-800 leading-relaxed">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          )}

          {activeSubTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-3">
                <UploadCloud className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Sincronização de Dados com Supabase</p>
                  <p className="mt-1 text-slate-600">
                    Se você já cadastrou produtos ou realizou vendas neste computador, use o botão abaixo para enviar todos os registros para a sua base de dados do Supabase.
                  </p>
                </div>
              </div>

              {syncResult && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    syncResult.erro
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  {syncResult.erro ? (
                    <p><b>Falha:</b> {syncResult.erro}</p>
                  ) : (
                    <p>
                      🎉 <b>Sincronização concluída com sucesso!</b><br />
                      Produtos sincronizados: <b>{syncResult.produtos}</b><br />
                      Vendas sincronizadas: <b>{syncResult.vendas}</b>
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || !isConnected}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Enviando dados para o Supabase...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Sincronizar Dados Locais para o Supabase
                  </>
                )}
              </button>
              {!isConnected && (
                <p className="text-[11px] text-amber-700 text-center">
                  * Conecte suas credenciais do Supabase na aba anterior para habilitar a sincronização.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
