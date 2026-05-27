import { Award, Clock, Heart } from 'lucide-react';

interface MetricsGridProps {
  totalAncestors: number;
  totalGenerations: number;
  avgLifespan: string;
  totalSpousalUnions: number;
}

export default function MetricsGrid({
  totalAncestors,
  totalGenerations,
  avgLifespan,
  totalSpousalUnions,
}: MetricsGridProps) {
  return (
    <section className="p-6 md:p-8 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-xs space-y-6">
      <h2 className="text-lg font-serif font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300 text-left">
        <Award size={16} className="text-[#7b8e7f]" />
        Family Metrics
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-white/2 border border-[#e6e5e0] dark:border-[#2c2c2e] text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Ancestors</span>
          <p className="text-2xl font-serif font-semibold mt-1 text-[#7b8e7f] dark:text-[#9cb2a2]">
            {totalAncestors}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-white/2 border border-[#e6e5e0] dark:border-[#2c2c2e] text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Generations</span>
          <p className="text-2xl font-serif font-semibold mt-1 text-[#7b8e7f] dark:text-[#9cb2a2]">
            {totalGenerations}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-white/2 border border-[#e6e5e0] dark:border-[#2c2c2e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-[#7b8e7f]" />
            <span className="text-xs text-slate-500 font-medium">Average Lifespan</span>
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white">{avgLifespan}</span>
        </div>

        <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-white/2 border border-[#e6e5e0] dark:border-[#2c2c2e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Heart size={16} className="text-[#7b8e7f]" />
            <span className="text-xs text-slate-500 font-medium">Spousal Unions</span>
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white">{totalSpousalUnions}</span>
        </div>
      </div>
    </section>
  );
}
