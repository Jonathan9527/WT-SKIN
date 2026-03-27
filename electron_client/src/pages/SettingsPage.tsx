import React, { useState, useEffect } from 'react';
import { Save, Check, Server, FolderSearch, FolderOpen, CheckCircle2, XCircle, Loader2, Gamepad2, HardDrive, Trash2, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const SettingsPage: React.FC = () => {
  const [url, setUrl] = useState('http://localhost:8080');
  const [saved, setSaved] = useState(false);
  const [gamePath, setGamePath] = useState('');
  const [skinsPath, setSkinsPath] = useState('');
  const [pathValid, setPathValid] = useState<boolean | null>(null);
  const [pathReason, setPathReason] = useState('');
  const [skinsExist, setSkinsExist] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ imageCount: number; imageSize: number; dataCount: number; dataSize: number; totalSize: number } | null>(null);
  const [clearing, setClearing] = useState(false);

  const isElectron = !!window.electronAPI;

  // 启动时自动检测
  useEffect(() => {
    if (isElectron) {
      handleAutoDetect();
      loadCacheStats();
    }
  }, []);

  const loadCacheStats = async () => {
    if (!window.electronAPI) return;
    const stats = await window.electronAPI.cacheStats();
    setCacheStats(stats);
  };

  const handleClearCache = async () => {
    if (!window.electronAPI) return;
    setClearing(true);
    await window.electronAPI.cacheClear();
    await loadCacheStats();
    setClearing(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const handleAutoDetect = async () => {
    if (!window.electronAPI) return;
    setDetecting(true);
    try {
      const result = await window.electronAPI.autoDetectGame();
      if (result.found && result.valid) {
        setGamePath(result.gamePath);
        setSkinsPath(result.skinsPath || '');
        setPathValid(true);
        setSkinsExist(result.skinsExist || false);
        setPathReason('');
      } else if (result.found) {
        setGamePath(result.gamePath);
        setPathValid(false);
        setPathReason(result.reason || '路径无效');
      } else {
        setPathValid(null);
        setPathReason('未自动检测到游戏目录');
      }
    } catch (e) { console.error(e); }
    setDetecting(false);
  };

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.selectGameFolder();
      if (result.canceled) return;
      setGamePath(result.gamePath || '');
      if (result.valid) {
        setPathValid(true);
        setSkinsPath(result.skinsPath || '');
        setSkinsExist(result.skinsExist || false);
        setPathReason('');
      } else {
        setPathValid(false);
        setPathReason(result.reason || '路径无效');
      }
    } catch (e) { console.error(e); }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScrollArea className="flex-1">
    <div className="p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-1">设置</h2>
      <p className="text-xs text-slate-400 mb-5">配置客户端连接和游戏路径</p>

      <div className="space-y-4 max-w-lg">
        {/* 游戏路径设置 */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Gamepad2 size={16} className="text-blue-500" />
            游戏路径设置
          </div>

          {/* 路径输入 */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">War Thunder 安装目录</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input value={gamePath} onChange={e => { setGamePath(e.target.value); setPathValid(null); }}
                  placeholder="请选择或自动检测游戏目录..."
                  className="w-full h-9 border border-slate-200 rounded-lg px-3 pr-8 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 focus:bg-white transition-all" />
                {pathValid === true && <CheckCircle2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500" />}
                {pathValid === false && <XCircle size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-400" />}
              </div>
            </div>
            {pathValid === false && pathReason && (
              <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><XCircle size={10} />{pathReason}</p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button onClick={handleAutoDetect} disabled={!isElectron || detecting}
              className="h-8 px-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-xs font-medium hover:shadow-md hover:shadow-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50">
              {detecting ? <Loader2 size={12} className="animate-spin" /> : <FolderSearch size={12} />}
              自动搜索
            </button>
            <button onClick={handleSelectFolder} disabled={!isElectron}
              className="h-8 px-3 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-all flex items-center gap-1.5 disabled:opacity-50">
              <FolderOpen size={12} />
              手动选择
            </button>
          </div>

          {/* 皮肤目录状态 */}
          {pathValid === true && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs">
                <HardDrive size={11} className="text-slate-400" />
                <span className="text-slate-500">皮肤目录:</span>
                <span className="text-slate-700 font-mono text-[10px]">{skinsPath}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {skinsExist ? (
                  <><CheckCircle2 size={11} className="text-green-500" /><span className="text-green-600">UserSkins 目录已存在</span></>
                ) : (
                  <><XCircle size={11} className="text-amber-500" /><span className="text-amber-600">UserSkins 目录不存在，下载时将自动创建</span></>
                )}
              </div>
            </div>
          )}

          {!isElectron && (
            <p className="text-[10px] text-amber-500 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
              ⚠ 浏览器模式下无法检测游戏目录，请在 Electron 客户端中使用此功能
            </p>
          )}
        </div>

        {/* 服务器设置 */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Server size={16} className="text-blue-500" />
            服务器设置
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">API 服务地址</label>
            <input value={url} onChange={e => setUrl(e.target.value)}
              className="w-full h-9 border border-slate-200 rounded-lg px-3 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 focus:bg-white transition-all" />
            <p className="text-[10px] text-slate-400 mt-1">后端 Go API 服务地址</p>
          </div>
        </div>

        {/* 缓存管理 */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Database size={16} className="text-blue-500" />
            缓存管理
          </div>
          <p className="text-[10px] text-slate-400">图片缓存 7 天，数据缓存 30 分钟，过期自动更新</p>

          {cacheStats && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">图片缓存</span>
                <span className="text-slate-700">{cacheStats.imageCount} 个文件 · {formatBytes(cacheStats.imageSize)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">数据缓存</span>
                <span className="text-slate-700">{cacheStats.dataCount} 条 · {formatBytes(cacheStats.dataSize)}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">总计</span>
                <span className="text-slate-800 font-medium">{formatBytes(cacheStats.totalSize)}</span>
              </div>
            </div>
          )}

          <button onClick={handleClearCache} disabled={!isElectron || clearing}
            className="h-8 px-3 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 transition-all flex items-center gap-1.5 disabled:opacity-50">
            {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            清除所有缓存
          </button>
        </div>

        {/* 保存按钮 */}
        <button onClick={handleSave}
          className="h-9 px-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-md hover:shadow-blue-500/20 transition-all flex items-center gap-1.5">
          {saved ? <><Check size={14} />已保存</> : <><Save size={14} />保存设置</>}
        </button>
      </div>
    </div>
    </ScrollArea>
  );
};

export default SettingsPage;
