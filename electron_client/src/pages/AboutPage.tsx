import React from 'react';
import { Crosshair } from 'lucide-react';

const AboutPage: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-3">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
      <Crosshair size={28} className="text-white" />
    </div>
    <h2 className="text-xl font-bold text-slate-800">War Thunder 涂装下载器</h2>
    <div className="flex gap-2">
      <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">v1.0.0</span>
      <span className="text-[11px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">Electron</span>
      <span className="text-[11px] bg-cyan-50 text-cyan-500 px-2 py-0.5 rounded-full">React</span>
      <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">shadcn/ui</span>
    </div>
    <p className="text-xs text-slate-400 mt-1">基于后端 Go API · Tailwind CSS</p>
  </div>
);

export default AboutPage;
