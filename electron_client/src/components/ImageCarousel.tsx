import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageCarouselProps {
  images: string[];
  className?: string;
  imgClassName?: string;
  showArrows?: 'always' | 'hover';
  showDots?: boolean;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

/** 从 Skin 数据中提取所有图片 URL */
export function extractImages(skin: { image_url?: string; images?: string; description?: string }): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (url: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  // 1. images JSON 数组
  if (skin.images) {
    try {
      const arr = JSON.parse(skin.images);
      if (Array.isArray(arr)) arr.forEach((u: string) => add(u));
    } catch {}
  }

  // 2. image_url 主图
  if (skin.image_url) add(skin.image_url);

  // 3. 从 description HTML 中提取嵌入图片
  if (skin.description) {
    const regex = /href="(https?:\/\/images-live\.warthunder\.com\/[^"]+)"/g;
    let match;
    while ((match = regex.exec(skin.description)) !== null) {
      add(match[1]);
    }
  }

  return urls;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images, className, imgClassName, showArrows = 'hover', showDots = true, onError,
}) => {
  const [index, setIndex] = useState(0);
  const [cachedSrcs, setCachedSrcs] = useState<string[]>(images);
  const [loading, setLoading] = useState(false);
  const total = images.length;

  // 缓存图片
  useEffect(() => {
    setCachedSrcs(images);
    setIndex(0);
    if (window.electronAPI && images.length > 0) {
      window.electronAPI.cacheImages(images).then(mapping => {
        setCachedSrcs(images.map(u => mapping[u] || u));
      }).catch(() => {});
    }
  }, [images.join(',')]);

  const handleSwitch = useCallback((newIndex: number) => {
    setLoading(true);
    setIndex(newIndex);
  }, []);

  if (total === 0) return null;

  const prev = (e: React.MouseEvent) => { e.stopPropagation(); handleSwitch((index - 1 + total) % total); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); handleSwitch((index + 1) % total); };

  const arrowBase = 'absolute top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all backdrop-blur-sm';
  const arrowVisibility = showArrows === 'hover' ? 'opacity-0 group-hover:opacity-100' : '';

  return (
    <div className={cn('relative group', className)}>
      <img
        src={cachedSrcs[index] || images[index]}
        alt=""
        className={cn('w-full h-full object-cover transition-opacity duration-200', loading && 'opacity-60', imgClassName)}
        onLoad={() => setLoading(false)}
        onError={e => { setLoading(false); onError?.(e); }}
      />

      {/* 半透明 loading 遮罩 */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <Loader2 size={20} className="text-white animate-spin drop-shadow" />
        </div>
      )}

      {total > 1 && (
        <>
          <button onClick={prev} className={cn(arrowBase, 'left-1', arrowVisibility)}><ChevronLeft size={14} /></button>
          <button onClick={next} className={cn(arrowBase, 'right-1', arrowVisibility)}><ChevronRight size={14} /></button>

          {showDots && (
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-20">
              {images.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); handleSwitch(i); }}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-all',
                    i === index ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'
                  )} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImageCarousel;
