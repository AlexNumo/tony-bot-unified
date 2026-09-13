import { useState } from 'react';
import { 
  FileCode, Copy, Check, Terminal, Shield, Database, Cpu, 
  BookOpen, Lock, Server, AlertTriangle
} from 'lucide-react';
import { codeSnippets } from '../data/codeSnippets';

export default function CodeExplorer() {
  const [activeTab, setActiveTab] = useState<string>('server.ts');
  const [copied, setCopied] = useState(false);

  const currentFile = codeSnippets.find(f => f.name === activeTab) || codeSnippets[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="code-explorer-container" className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
      {/* File Tree & Architecture Column */}
      <div id="file-tree-sidebar" className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-display font-semibold text-sm text-white">Структура проєкту</h3>
              <span className="text-[10px] text-slate-400 font-mono">Node.js / TypeScript / grammY</span>
            </div>
          </div>

          {/* File Selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase block">Файли бекенду</span>
            {codeSnippets.map((file) => (
              <button
                key={file.name}
                onClick={() => { setActiveTab(file.name); setCopied(false); }}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-mono flex items-center justify-between border transition-all ${
                  activeTab === file.name
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border-slate-850'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCode className={`w-4 h-4 ${activeTab === file.name ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span>{file.name}</span>
                </div>
                <span className="text-[8px] bg-sky-950 text-sky-400 px-1.5 py-0.5 rounded font-sans">v1.0</span>
              </button>
            ))}
          </div>

          {/* Architecture info block */}
          <div className="space-y-3">
            <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase block">Технологічний стек</span>
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-850 text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold text-[11px]">Database:</span>
                <span className="text-[11px] font-mono text-slate-400">Supabase DB</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-[11px]">Engine:</span>
                <span className="text-[11px] font-mono text-slate-400">grammY (TG)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Server className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-semibold text-[11px]">Server:</span>
                <span className="text-[11px] font-mono text-slate-400">Express / Render</span>
              </div>
            </div>
          </div>
        </div>

        {/* CEO Message card */}
        <div className="bg-gradient-to-br from-indigo-950/30 to-slate-900 border border-indigo-500/10 rounded-xl p-4 mt-4">
          <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Єдиний бекенд</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            "Об'єднавши Python-бот та Node.js адмін-панель в один сервіс на Render, ми зменшили витрати з 14$ до 7$/міс та прибрали необхідність синхронізації між двома окремими серверами."
          </p>
        </div>
      </div>

      {/* Code Editor Column */}
      <div id="code-editor-panel" className="xl:col-span-2 bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-[#1c262f] px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-xs font-bold text-white font-mono">{currentFile.name}</span>
              <span className="text-[10px] text-slate-400 block font-sans">{currentFile.description}</span>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Скопійовано!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Копіювати код</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content View */}
        <div className="flex-1 overflow-auto p-4 bg-[#0e1621] font-mono text-xs select-text">
          <pre className="text-slate-100 overflow-x-auto whitespace-pre">
            <code>{currentFile.code}</code>
          </pre>
        </div>
      </div>

      {/* Security & Backend Design Notes Column */}
      <div id="security-notes-sidebar" className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 overflow-y-auto">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="font-display font-semibold text-base text-white">Рішення та Безпека</h3>
          <p className="text-xs text-slate-400">Єдина архітектура платформи «Точка переходу».</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Lock className="w-4 h-4 shrink-0" />
              <h4 className="text-xs font-semibold text-white">1. Захист матеріалів (Anti-Piracy)</h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Усі матеріали розсилаються з прапорцем <code>protect_content: true</code>, що блокує пересилання повідомлень та зняття запису екрана.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sky-400">
              <Database className="w-4 h-4 shrink-0" />
              <h4 className="text-xs font-semibold text-white">2. Supabase Integration</h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Єдина база даних PostgreSQL у Supabase, куди автоматично пишуться реєстрації, результати тесту, статуси оплат та логи розсилок.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Cpu className="w-4 h-4 shrink-0" />
              <h4 className="text-xs font-semibold text-white">3. GrammY Webhook</h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              На Render бот працює у режимі Webhook на ендпоінті <code>/api/telegram-webhook</code>, що забезпечує миттєву обробку запитів без постійного полінгу.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
