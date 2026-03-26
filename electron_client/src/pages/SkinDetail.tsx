import React from 'react';
import { X, ThumbsUp, Eye, Download, MessageCircle, ExternalLink, FileType, Gauge } from 'lucide-react';
import { Skin } from '@/api';
import { ScrollArea } from '@/components/ui/scroll-area';

const SkinDetail: React.FC<{ skin: Skin; onClose: () => void }> = ({ skin, onClose }) => {
  const stripHtml = (s: string) => s?.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&') || '';
  const formatSize = (b: number) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b > 1024 ? `${(b / 1024).toFixed(0)} KB` : `${b} B`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[540px] max-h-[480px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
          <span className="text-sm font-medium">涂装详情</span>
          <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
            <X size={14} />
          </button>
        </div>

        <ScrollArea className="max-h-[430px]">
          {/* 图片 */}
          <div className="bg-gradient-to-br from-slate-100 to-slate-50">
            <img src={skin.image_url} alt="" className="w-full max-h-[200px] object-contain" />
          </div>

          <div className="p-4 space-y-3">
            {/* 作者和载具 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-[10px] font-bold">
                  {skin.author?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold">{skin.author}</div>
                  <div className="text-[10px] text-slate-400">ID: {skin.wt_live_id}</div>
                </div>
              </div>
              {skin.vehicle_name && (
                <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                  {skin.vehicle_name}
                </span>
              )}
            </div>

            {/* 统计 */}
            <div className="flex gap-1">
              <StatBadge icon={<ThumbsUp size={11} />} value={skin.likes} color="blue" />
              <StatBadge icon={<Eye size={11} />} value={skin.views} color="green" />
              <StatBadge icon={<Download size={11} />} value={skin.downloads} color="orange" />
              <StatBadge icon={<MessageCircle size={11} />} value={skin.comments} color="purple" />
            </div>

            {/* 描述 */}
            <div className="text-xs text-slate-500 max-h-[60px] overflow-auto bg-slate-50 rounded-lg p-2.5 leading-relaxed border border-slate-100">
              {stripHtml(skin.description) || '暂无描述'}
            </div>

            {/* 文件信息 + 下载 + 链接 */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-3 text-[10px] text-slate-400">
                {skin.file_size > 0 && <span className="flex items-center gap-0.5"><FileType size={10} />{formatSize(skin.file_size)}</span>}
                {skin.pbr_ready && <span className="flex items-center gap-0.5"><Gauge size={10} />PBR</span>}
              </div>
              <div className="flex items-center gap-2">
                {skin.file_url && (
                  <a href={skin.file_url} download={skin.file_name || true} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-md hover:shadow-green-500/20 px-3 py-1 rounded-full transition-all font-medium">
                    <Download size={11} />下载涂装
                  </a>
                )}
                <a href={`https://live.warthunder.com/post/${skin.lang_group}/en/`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors">
                  <ExternalLink size={11} />查看原文
                </a>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-orange-50 text-orange-600', purple: 'bg-purple-50 text-purple-600',
};

const StatBadge: React.FC<{ icon: React.ReactNode; value: number; color: string }> = ({ icon, value, color }) => (
  <div className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium ${colorMap[color]}`}>
    {icon}{value.toLocaleString()}
  </div>
);

export default SkinDetail;
