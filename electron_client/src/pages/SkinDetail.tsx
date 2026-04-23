import React, { useState, useEffect } from 'react';
import { ArrowLeft, ThumbsUp, Eye, Download, MessageCircle, ExternalLink, FileType, Gauge, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Skin } from '@/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import ImageCarousel, { extractImages } from '@/components/ImageCarousel';

const SkinDetail: React.FC<{ skin: Skin; onBack: () => void }> = ({ skin, onBack }) => {
  const stripHtml = (s: string) => s?.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&') || '';
  const formatSize = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b > 1024 ? `${(b / 1024).toFixed(0)} KB` : `${b} B`;
  const allImages = extractImages(skin);

  const [dlState, setDlState] = useState<'idle' | 'downloading' | 'done' | 'error' | 'installed'>('idle');
  const [dlMsg, setDlMsg] = useState('');
  const [progress, setProgress] = useState(0);

  // 检查是否已安装
  useEffect(() => {
    if (!window.electronAPI?.getInstalledSkins) return;
    window.electronAPI.getInstalledSkins().then(res => {
      if (res.success && res.skins.some((s: any) => s.wt_live_id === skin.wt_live_id)) {
        setDlState('installed');
        setDlMsg('已安装');
      }
    });
  }, [skin.wt_live_id]);

  // 监听下载进度
  useEffect(() => {
    if (!window.electronAPI) return;
    const cleanup = window.electronAPI.onDownloadProgress((data) => {
      if (data.skinId === skin.wt_live_id) {
        setProgress(data.percent);
      }
    });
    return cleanup;
  }, [skin.wt_live_id]);

  const handleDownload = async () => {
    if (!window.electronAPI) return;
    setDlState('downloading');
    setDlMsg('');
    setProgress(0);
    try {
      const result = await window.electronAPI.downloadSkin(skin);
      if (result.success) {
        setProgress(100);
        setDlState('installed');
        setDlMsg('已安装');
      } else {
        setDlState('error');
        setDlMsg(result.error || '下载失败');
      }
    } catch {
      setDlState('error');
      setDlMsg('下载失败');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm">
        <button onClick={onBack}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-500 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft size={14} />
          <span>返回列表</span>
        </button>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs text-slate-400">涂装详情</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-[560px] mx-auto p-4 space-y-4 pb-20">
          {/* 主图轮播 */}
          <div className="rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-100 dark:border-slate-800">
            <ImageCarousel images={allImages} className="h-[280px]" imgClassName="object-contain" showArrows="always" />
          </div>

          {/* 作者信息 + 载具标签 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-blue-500/20">
                {skin.author?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{skin.author}</div>
                <div className="text-[11px] text-slate-400">ID: {skin.wt_live_id}</div>
              </div>
            </div>
            {skin.vehicle_name && (
              <span className="text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                {skin.vehicle_name}
              </span>
            )}
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-4 gap-2">
            <StatCard icon={<ThumbsUp size={14} />} label="点赞" value={skin.likes} color="blue" />
            <StatCard icon={<Eye size={14} />} label="浏览" value={skin.views} color="green" />
            <StatCard icon={<Download size={14} />} label="下载" value={skin.downloads} color="orange" />
            <StatCard icon={<MessageCircle size={14} />} label="评论" value={skin.comments} color="purple" />
          </div>

          {/* 描述 */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">描述</div>
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {stripHtml(skin.description) || '暂无描述'}
            </div>
          </div>

          {/* 文件信息 + 查看原文 */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
            <div className="flex gap-4 text-[11px] text-slate-400">
              {skin.file_size > 0 && (
                <span className="flex items-center gap-1"><FileType size={12} />{formatSize(skin.file_size)}</span>
              )}
              {skin.pbr_ready && (
                <span className="flex items-center gap-1"><Gauge size={12} />PBR Ready</span>
              )}
            </div>
            <a href={`https://live.warthunder.com/post/${skin.lang_group}/en/`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-full transition-colors">
              <ExternalLink size={12} />查看原文
            </a>
          </div>
        </div>
      </ScrollArea>

      {/* 固定底栏 - 下载按钮 + 进度条 */}
      {skin.file_url && (
        <div className="border-t bg-white dark:bg-slate-900 dark:border-slate-800 px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <div className="max-w-[560px] mx-auto">
            {/* 进度条 */}
            {dlState === 'downloading' && (
              <div className="mb-2.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>下载中...</span>
                  <span>{progress}%{skin.file_size > 0 ? ` · ${formatSize(skin.file_size)}` : ''}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <button onClick={handleDownload} disabled={dlState === 'downloading' || dlState === 'installed'}
              className={`w-full h-10 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all ${
                dlState === 'installed' ? 'bg-green-500' :
                dlState === 'error' ? 'bg-red-500' :
                dlState === 'downloading' ? 'bg-emerald-600 opacity-80' :
                'bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:shadow-green-500/25 active:scale-[0.98]'
              } disabled:cursor-not-allowed`}>
              {dlState === 'downloading' && <Loader2 size={16} className="animate-spin" />}
              {dlState === 'installed' && <CheckCircle2 size={16} />}
              {dlState === 'error' && <XCircle size={16} />}
              {dlState === 'idle' && <Download size={16} />}
              {dlState === 'downloading' ? `下载中 ${progress}%` : dlState === 'installed' ? '已安装' : dlState === 'error' ? dlMsg : '下载涂装'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
  <div className={`flex flex-col items-center gap-1 py-2.5 rounded-xl ${colorMap[color].bg}`}>
    <div className={`${colorMap[color].text}`}>{icon}</div>
    <div className={`text-sm font-semibold ${colorMap[color].text}`}>{value.toLocaleString()}</div>
    <div className="text-[10px] text-slate-400">{label}</div>
  </div>
);

export default SkinDetail;
