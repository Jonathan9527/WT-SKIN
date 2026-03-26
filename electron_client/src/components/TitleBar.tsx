import React, { useState } from 'react';
import { Minus, Square, X, Copy, Sun, Moon, ArrowDownToLine } from 'lucide-react';

interface TitleBarProps {
  dark: boolean;
  onToggleTheme: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ dark, onToggleTheme }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = !!window.electronAPI;

  if (!isElectron) return null;

  const handleMinimize = () => window.electronAPI?.winMinimize();
  const handleMaximize = async () => {
    const result = await window.electronAPI?.winMaximize();
    setIsMaximized(!!result);
  };
  const handleHideToTray = () => window.electronAPI?.winHideToTray();
  const handleClose = () => window.electronAPI?.winClose();

  const btnClass = 'w-10 h-full flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors';

  return (
    <div className="h-8 bg-slate-900 flex items-center justify-between select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      {/* 左侧标题 */}
      <div className="pl-3 text-[11px] text-slate-400 font-medium tracking-wide">
        WAR THUNDER SKINS
      </div>

      {/* 右侧控制按钮 */}
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* 主题切换 */}
        <button onClick={onToggleTheme} className={btnClass} title={dark ? '切换亮色' : '切换暗色'}>
          {dark ? <Sun size={14} strokeWidth={2.5} /> : <Moon size={14} strokeWidth={2.5} />}
        </button>
        {/* 最小化到托盘 */}
        <button onClick={handleHideToTray} className={btnClass} title="最小化到托盘">
          <ArrowDownToLine size={13} strokeWidth={2.5} />
        </button>
        {/* 最小化 */}
        <button onClick={handleMinimize} className={btnClass} title="最小化">
          <Minus size={14} strokeWidth={2.5} />
        </button>
        {/* 最大化/还原 */}
        <button onClick={handleMaximize} className={btnClass} title={isMaximized ? '还原' : '最大化'}>
          {isMaximized ? <Copy size={12} strokeWidth={2.5} /> : <Square size={12} strokeWidth={2.5} />}
        </button>
        {/* 关闭（隐藏到托盘） */}
        <button onClick={handleClose} title="关闭"
          className="w-10 h-full flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-colors">
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
