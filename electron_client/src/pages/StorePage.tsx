import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThumbsUp, Eye, Download, Star, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { getSkins, getVehicles, Skin, Vehicle } from '@/api';
import { VEHICLE_TYPES, COUNTRIES, VEHICLE_CLASSES, SORT_OPTIONS, PERIOD_OPTIONS } from '@/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import SkinDetail from './SkinDetail';

const StorePage: React.FC = () => {
  const [skins, setSkins] = useState<Skin[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [detailSkin, setDetailSkin] = useState<Skin | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({
    vehicleType: 'any', vehicleCountry: 'any', vehicleClass: 'any',
    vehicle: 'any', sort: 'created', period: '所有时间', search: '',
  });

  const fetchSkins = useCallback(async (p: number, append = false) => {
    setLoading(true);
    try {
      const res = await getSkins({
        vehicleType: filters.vehicleType, vehicleCountry: filters.vehicleCountry,
        vehicleClass: filters.vehicleClass, vehicle: filters.vehicle,
        sort: filters.sort, period: PERIOD_OPTIONS[filters.period],
        search: filters.search, page: p, pageSize: 9,
      });
      if (res.status === 'OK') {
        const list = res.data.list || [];
        setSkins(prev => append ? [...prev, ...list] : list);
        setHasMore(list.length >= 9);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { setPage(0); fetchSkins(0); }, [fetchSkins]);

  useEffect(() => {
    if (filters.vehicleType === 'any') { setVehicles([]); return; }
    const params: Record<string, string> = { type: filters.vehicleType };
    if (filters.vehicleCountry !== 'any') params.country = filters.vehicleCountry;
    if (filters.vehicleClass !== 'any') params['class'] = filters.vehicleClass;
    getVehicles(params).then(res => { if (res.status === 'OK') setVehicles(res.data || []); });
  }, [filters.vehicleType, filters.vehicleCountry, filters.vehicleClass]);

  // Attach scroll listener to Radix Viewport
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const viewport = root.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport) return;

    let loadingRef = false;
    const onScroll = () => {
      if (loadingRef) return;
      if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 200) {
        loadingRef = true;
        setPage(prev => {
          const next = prev + 1;
          fetchSkins(next, true).then(() => { loadingRef = false; });
          return next;
        });
      }
    };
    viewport.addEventListener('scroll', onScroll);
    return () => viewport.removeEventListener('scroll', onScroll);
  }, [skins, hasMore, loading]);

  const update = (key: string, val: string) => {
    setFilters(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'vehicleType') { next.vehicleClass = 'any'; next.vehicle = 'any'; }
      if (key === 'vehicleCountry' || key === 'vehicleClass') next.vehicle = 'any';
      return next;
    });
  };

  const classOpts = filters.vehicleType !== 'any' ? VEHICLE_CLASSES[filters.vehicleType] || {} : {};
  const stripHtml = (s: string) => s?.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&') || '';

  return (
    <>
      {/* 筛选栏 */}
      <div className="px-3 py-2 border-b bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mr-1">
            <SlidersHorizontal size={12} /><span>筛选</span>
          </div>
          <FilterPill value={filters.vehicleType} options={VEHICLE_TYPES} onChange={v => update('vehicleType', v)} />
          <FilterPill value={filters.vehicleCountry} options={COUNTRIES} onChange={v => update('vehicleCountry', v)} />
          <FilterPill value={filters.vehicleClass} options={{ any: '全部子类型', ...classOpts }} onChange={v => update('vehicleClass', v)}
            disabled={filters.vehicleType === 'any'} />
          <select value={filters.vehicle} onChange={e => update('vehicle', e.target.value)}
            disabled={filters.vehicleType === 'any'}
            className="h-6 text-[11px] border border-slate-200 rounded-full px-2 bg-white disabled:opacity-40 max-w-[130px] focus:outline-none focus:ring-1 focus:ring-blue-400">
            <option value="any">全部载具</option>
            {vehicles.map(v => <option key={v.wt_live_id} value={v.wt_live_id}>{v.name} ({v.skin_count})</option>)}
          </select>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <FilterPill value={filters.sort} options={SORT_OPTIONS} onChange={v => update('sort', v)} />
          <FilterPill value={filters.period} options={Object.fromEntries(Object.keys(PERIOD_OPTIONS).map(k => [k, k]))} onChange={v => update('period', v)} />
          <div className="relative ml-auto">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && fetchSkins(0)}
              placeholder="搜索涂装..."
              className="h-6 text-[11px] border border-slate-200 rounded-full pl-6 pr-2 w-32 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white transition-colors" />
          </div>
        </div>
      </div>

      {/* 加载进度条 */}
      {loading && (
        <div className="h-0.5 bg-slate-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 animate-pulse w-2/3" />
        </div>
      )}

      {/* 状态栏 */}
      <div className="px-3 py-1 text-[11px] text-slate-400 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
        <span>已加载 <span className="text-slate-600 font-medium">{skins.length}</span> 个涂装</span>
        {loading && <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" />加载中...</span>}
      </div>

      {/* 九宫格 - ScrollArea */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="grid grid-cols-3 gap-3 p-3">
          {skins.map(skin => (
            <div key={skin.id} onClick={() => setDetailSkin(skin)}
              className="group bg-white dark:bg-slate-900 rounded-xl overflow-hidden cursor-pointer border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 h-[210px] flex flex-col">
              <div className="relative h-[120px] bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
                <img src={skin.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={e => (e.currentTarget.style.display = 'none')} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-1.5 left-2 right-2 flex gap-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="flex items-center gap-0.5"><ThumbsUp size={9} />{skin.likes}</span>
                  <span className="flex items-center gap-0.5"><Eye size={9} />{skin.views}</span>
                  <span className="flex items-center gap-0.5"><Download size={9} />{skin.downloads}</span>
                </div>
                {skin.featured && (
                  <div className="absolute top-1.5 right-1.5 bg-amber-400/90 rounded-full p-0.5 shadow-sm">
                    <Star size={10} className="text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{skin.author}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{stripHtml(skin.description).slice(0, 50)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5"><ThumbsUp size={9} />{skin.likes}</span>
                    <span className="flex items-center gap-0.5"><Eye size={9} />{skin.views}</span>
                  </div>
                  {skin.vehicle_name && (
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
                      {skin.vehicle_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {loading && (
          <div className="flex justify-center py-6">
            <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" />加载更多涂装...</div>
          </div>
        )}
        {!hasMore && skins.length > 0 && <div className="text-center py-4 text-xs text-slate-300">— 已经到底了 —</div>}
        {!loading && skins.length === 0 && (
          <div className="flex items-center justify-center py-20 text-slate-300">
            <div className="text-center"><Search size={32} className="mx-auto mb-2" /><div className="text-sm">暂无涂装数据</div></div>
          </div>
        )}
      </ScrollArea>

      {detailSkin && <SkinDetail skin={detailSkin} onClose={() => setDetailSkin(null)} />}
    </>
  );
};

const FilterPill: React.FC<{ value: string; options: Record<string, string>; onChange: (v: string) => void; disabled?: boolean }> = ({ value, options, onChange, disabled }) => (
  <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
    className="h-6 text-[11px] border border-slate-200 dark:border-slate-700 rounded-full px-2 bg-white dark:bg-slate-800 dark:text-slate-300 disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-blue-400 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer">
    {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
  </select>
);

export default StorePage;
