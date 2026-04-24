import React, { useState, useEffect } from 'react';
import { Store, Settings, Info, FolderHeart, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import TitleBar from './components/TitleBar';
import StorePage from './pages/StorePage';
import SkinsManager from './pages/SkinsManager';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';

const navItems = [
  { key: 'store', label: '涂装商店', icon: Store },
  { key: 'manager', label: '皮肤管理', icon: FolderHeart },
  { key: 'settings', label: '设置', icon: Settings },
  { key: 'about', label: '关于', icon: Info },
];

const App: React.FC = () => {
  const [page, setPage] = useState('store');
  const [dark, setDark] = useState(false);
  const [launchMsg, setLaunchMsg] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const handleLaunchGame = async () => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.launchGame();
    if (!res.success) {
      setLaunchMsg(res.error || '启动失败');
      setTimeout(() => setLaunchMsg(''), 3000);
    }
  };

  const pages = [
    { key: 'store', node: <StorePage /> },
    { key: 'manager', node: <SkinsManager /> },
    { key: 'settings', node: <SettingsPage /> },
    { key: 'about', node: <AboutPage /> },
  ];

  return (
    <div className="flex flex-col h-screen">
      <TitleBar dark={dark} onToggleTheme={() => setDark(d => !d)} />
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <div className="w-44 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col shadow-xl">
          <div className="p-4 flex items-center gap-2 border-b border-white/10">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-blue-500/20">
              <img src={logo} alt="logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-xs font-bold leading-tight">War Thunder</div>
              <div className="text-[10px] text-slate-400 leading-tight">涂装下载器</div>
            </div>
          </div>
          <nav className="flex-1 py-3 px-2 space-y-1">
            {navItems.map(item => (
              <button key={item.key} onClick={() => setPage(item.key)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-200',
                  page === item.key
                    ? 'bg-gradient-to-r from-blue-600/80 to-blue-500/60 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}>
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="px-2 pb-2">
            <button onClick={handleLaunchGame}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-gradient-to-r from-orange-500/80 to-amber-500/60 text-white hover:from-orange-500 hover:to-amber-500 transition-all shadow-sm">
              <Gamepad2 size={14} />
              启动游戏
            </button>
            {launchMsg && <div className="text-[10px] text-red-400 text-center mt-1">{launchMsg}</div>}
          </div>
          <div className="p-3 border-t border-white/10 text-[10px] text-slate-500 text-center">v1.0.0</div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          {pages.map(p => (
            <div key={p.key} className="flex-1 flex flex-col overflow-hidden" style={{ display: page === p.key ? 'flex' : 'none' }}>
              {p.node}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
