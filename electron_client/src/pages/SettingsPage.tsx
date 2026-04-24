import React, { useState, useEffect } from 'react';
import { Save, Check, Server, FolderSearch, FolderOpen, CheckCircle2, XCircle, Loader2, Gamepad2, HardDrive, DatabaseZap, RefreshCw, Database, Search } from 'lucide-react';
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

  // 数据同步状态
  const [dbStats, setDbStats] = useState<{ skinCount: number; vehicleCount: number; version: string | null; fileSize: number; dbPath: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ downloaded: number; total: number; percent: number } | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [remoteVersion, setRemoteVersion] = useState<{ available: boolean; version?: string; skinCount?: number; vehicleCount?: number; size?: number } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const [checkResult, setCheckResult] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const hasUpdate = remoteVersion?.available && dbStats && remoteVersion.version !== dbStats.version;

  const isElectron = !!window.electronAPI;

  // 启动时自动检测 + 加载数据库状态 + 检查更新
  useEffect(() => {
    if (isElectron) {
      handleAutoDetect();
      loadDBStats();
      checkForUpdate();
    }
  }, []);

  // 监听同步进度
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onDbSyncProgress) return;
    const unsub = window.electronAPI.onDbSyncProgress((data) => {
      setSyncProgress(data);
    });
    return unsub;
  }, [isElectron]);

  const loadDBStats = async () => {
    if (!window.electronAPI?.dbGetStats) return;
    const stats = await window.electronAPI.dbGetStats();
    setDbStats(stats);
  };

  const checkForUpdate = async () => {
    setCheckingUpdate(true);
    setCheckResult(null);
    try {
      const res = await fetch(`${url}/client/datapack/version`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.status === 'OK' && data.available && data.data) {
        setRemoteVersion({
          available: true,
          version: data.data.version,
          skinCount: data.data.skin_count,
          vehicleCount: data.data.vehicle_count,
          size: data.data.size,
        });
        const localVer = dbStats?.version;
        if (localVer && localVer === data.data.version) {
          setCheckResult({ type: 'success', message: '已是最新版本' });
        } else {
          setCheckResult({ type: 'info', message: `发现新版本: ${data.data.version}` });
        }
      } else {
        setRemoteVersion({ available: false });
        setCheckResult({ type: 'info', message: data.message || '服务器暂无已发布的数据包' });
      }
    } catch (e) {
      setRemoteVersion(null);
      setCheckResult({ type: 'error', message: '接口繁忙，请稍后再试' });
    }
    setCheckingUpdate(false);
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

  const handleSyncDataPack = async () => {
    if (!window.electronAPI?.dbSyncDatapack) return;
    setSyncing(true);
    setSyncProgress(null);
    setSyncResult(null);
    try {
      const result = await window.electronAPI.dbSyncDatapack(url);
      if (result.success) {
        setSyncResult({ success: true, message: `同步成功！涂装: ${result.skinCount}, 载具: ${result.vehicleCount}` });
        loadDBStats();
      } else {
        setSyncResult({ success: false, message: result.error || '同步失败' });
      }
    } catch (e: any) {
      setSyncResult({ success: false, message: e.message || '同步失败' });
    }
    setSyncing(false);
    setSyncProgress(null);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  return (
    <ScrollArea className="flex-1">
    <div className="p-6">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">设置</h2>
      <p className="text-xs text-slate-400 mb-5">配置客户端连接、游戏路径和数据同步</p>

      <div className="space-y-4 max-w-lg">

        {/* 数据同步设置 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <DatabaseZap size={16} className="text-blue-500" />
            数据同步
          </div>

          {/* 当前数据库状态 */}
          {dbStats && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-1.5 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-xs">
                <Database size={11} className="text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">本地数据库:</span>
                {dbStats.skinCount > 0 ? (
                  <span className="text-green-600 dark:text-green-400">已就绪</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">未同步</span>
                )}
              </div>
              {dbStats.skinCount > 0 && (
                <>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">涂装数量:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{dbStats.skinCount.toLocaleString()}</span>
                    <span className="text-slate-400 mx-1">|</span>
                    <span className="text-slate-500 dark:text-slate-400">载具数量:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{dbStats.vehicleCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">版本:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">{dbStats.version || '未知'}</span>
                    <span className="text-slate-400 mx-1">|</span>
                    <span className="text-slate-500 dark:text-slate-400">大小:</span>
                    <span className="text-slate-700 dark:text-slate-300">{formatSize(dbStats.fileSize)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 检测结果 */}
          {checkResult && (
            <div className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-1.5 ${
              checkResult.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800' :
              checkResult.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-100 dark:border-red-800' :
              'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800'
            }`}>
              {checkResult.type === 'success' ? <CheckCircle2 size={12} /> : checkResult.type === 'error' ? <XCircle size={12} /> : <RefreshCw size={12} />}
              {checkResult.message}
              {hasUpdate && remoteVersion && (
                <span className="ml-1 text-slate-400">（涂装: {remoteVersion.skinCount?.toLocaleString()}, 大小: {formatSize(remoteVersion.size || 0)}）</span>
              )}
            </div>
          )}

          {/* 同步进度 */}
          {syncing && syncProgress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>下载数据包中...</span>
                <span>{syncProgress.percent}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300 rounded-full"
                  style={{ width: `${syncProgress.percent}%` }} />
              </div>
              <div className="text-[10px] text-slate-400">
                {formatSize(syncProgress.downloaded)} / {formatSize(syncProgress.total)}
              </div>
            </div>
          )}

          {/* 同步结果 */}
          {syncResult && (
            <div className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-1.5 ${
              syncResult.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-100 dark:border-red-800'
            }`}>
              {syncResult.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {syncResult.message}
            </div>
          )}

          {/* 同步按钮 */}
          <div className="flex gap-2">
            <button onClick={handleSyncDataPack} disabled={syncing || !isElectron || !hasUpdate}
              className="h-8 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-xs font-medium hover:shadow-md hover:shadow-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50">
              {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {syncing ? '同步中...' : dbStats && dbStats.skinCount > 0 ? '更新数据包' : '同步数据包'}
            </button>
            <button onClick={checkForUpdate} disabled={checkingUpdate}
              className="h-8 px-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 disabled:opacity-50">
              {checkingUpdate ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              检查更新
            </button>
          </div>

          <p className="text-[10px] text-slate-400">
            从服务器下载最新的涂装数据包到本地，下载后可离线浏览涂装
          </p>
        </div>

        {/* 游戏路径设置 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Gamepad2 size={16} className="text-blue-500" />
            游戏路径设置
          </div>

          {/* 路径输入 */}
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">War Thunder 安装目录</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input value={gamePath} onChange={e => { setGamePath(e.target.value); setPathValid(null); }}
                  placeholder="请选择或自动检测游戏目录..."
                  className="w-full h-9 border border-slate-200 dark:border-slate-700 rounded-lg px-3 pr-8 text-xs bg-slate-50 dark:bg-slate-800 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-700 transition-all" />
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
              className="h-8 px-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 disabled:opacity-50">
              <FolderOpen size={12} />
              手动选择
            </button>
          </div>

          {/* 皮肤目录状态 */}
          {pathValid === true && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-1.5 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-xs">
                <HardDrive size={11} className="text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">皮肤目录:</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">{skinsPath}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {skinsExist ? (
                  <><CheckCircle2 size={11} className="text-green-500" /><span className="text-green-600 dark:text-green-400">UserSkins 目录已存在</span></>
                ) : (
                  <><XCircle size={11} className="text-amber-500" /><span className="text-amber-600 dark:text-amber-400">UserSkins 目录不存在，下载时将自动创建</span></>
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
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Server size={16} className="text-blue-500" />
            服务器设置
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">API 服务地址</label>
            <input value={url} onChange={e => setUrl(e.target.value)}
              className="w-full h-9 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-xs bg-slate-50 dark:bg-slate-800 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-700 transition-all" />
            <p className="text-[10px] text-slate-400 mt-1">用于同步数据包的后端服务地址</p>
          </div>
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
