import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RefreshCw, FolderOpen, Loader2, ImageOff, ThumbsUp, Eye, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InstalledSkin {
  wt_live_id: number;
  title: string;
  author: string;
  vehicle_name: string;
  vehicle_type: string;
  vehicle_country: string;
  likes: number;
  views: number;
  downloads: number;
  file_size: number;
  downloaded_at: string;
  folderName: string;
  coverFile: string;
  dirPath: string;
}

const SkinsManager: React.FC = () => {
  const [skins, setSkins] = useState<InstalledSkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadSkins = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    const res = await window.electronAPI.getInstalledSkins();
    if (res.success) setSkins(res.skins);
    setLoading(false);
  }, []);

  useEffect(() => { loadSkins(); }, [loadSkins]);

  const handleDelete = async (folderName: string) => {
    if (!window.electronAPI) return;
    setDeleting(folderName);
    const res = await window.electronAPI.deleteInstalledSkin(folderName);
    if (res.success) setSkins(prev => prev.filter(s => s.folderName !== folderName));
    setDeleting(null);
  };

  const formatSize = (b: number) => {
    if (!b) return '';
    return b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
  };

  return (
    <>
      {/* 顶栏 */}
      <div className="px-3 py-2 border-b bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">已安装皮肤</span>
          <span className="text-[11px] text-slate-400 ml-2">{skins.length} 个</span>
        </div>
        <button onClick={loadSkins} disabled={loading}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-500 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : skins.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-300">
          <div className="text-center">
            <FolderOpen size={36} className="mx-auto mb-2" />
            <div className="text-sm">暂无已安装的皮肤</div>
            <div className="text-[10px] mt-1">在涂装商店下载皮肤后会显示在这里</div>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-4 gap-2.5 p-3">
            {skins.map(skin => (
              <div key={skin.folderName}
                className="group bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 flex flex-col">
                {/* 封面 */}
                <div className="relative h-[100px] bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 overflow-hidden">
                  {skin.coverFile ? (
                    <img src={skin.coverFile} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={e => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ImageOff size={20} className="text-slate-300" /></div>
                  )}
                  {/* 删除按钮 */}
                  <button onClick={() => handleDelete(skin.folderName)} disabled={deleting === skin.folderName}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10">
                    {deleting === skin.folderName ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                  </button>
                  {/* hover 统计 */}
                  <div className="absolute bottom-1 left-1.5 right-1.5 flex gap-1.5 text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="flex items-center gap-0.5"><ThumbsUp size={8} />{skin.likes}</span>
                    <span className="flex items-center gap-0.5"><Eye size={8} />{skin.views}</span>
                    <span className="flex items-center gap-0.5"><Download size={8} />{skin.downloads}</span>
                  </div>
                </div>
                {/* 信息 */}
                <div className="p-2 flex-1 flex flex-col justify-between min-h-[60px]">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{skin.author}</div>
                    {skin.vehicle_name && (
                      <span className="inline text-[9px] text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-1 py-px rounded border border-blue-200 dark:border-blue-800 mt-0.5">
                        {skin.vehicle_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-slate-300">{formatSize(skin.file_size)}</span>
                    <span className="text-[9px] text-slate-300">{skin.downloaded_at ? new Date(skin.downloaded_at).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </>
  );
};

export default SkinsManager;
