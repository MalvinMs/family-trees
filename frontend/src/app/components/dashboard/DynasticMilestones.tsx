import { Clock } from 'lucide-react';

interface Milestone {
  year: number;
  description: string;
}

interface DynasticMilestonesProps {
  milestones: Milestone[];
}

export default function DynasticMilestones({ milestones }: DynasticMilestonesProps) {
  return (
    <section className="p-6 md:p-8 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-xs space-y-5 text-left">
      <h2 className="text-lg font-serif font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
        <Clock size={16} className="text-[#7b8e7f]" />
        Dynastic Milestones
      </h2>

      <div className="relative pl-6 border-l border-[#e6e5e0] dark:border-[#2c2c2e] space-y-6 text-xs text-slate-500 font-light ml-2">
        {milestones.length > 0 ? (
          milestones.map((m, idx) => (
            <div key={idx} className="relative">
              <span className="absolute -left-[29.5px] top-1 w-2.5 h-2.5 rounded-full bg-[#7b8e7f] dark:bg-[#9cb2a2] border-2 border-white dark:border-[#1a1a1c]" />
              <span className="font-bold text-slate-700 dark:text-white block font-mono">{m.year}</span>
              <span className="text-[11px] block mt-0.5 leading-relaxed">{m.description}</span>
            </div>
          ))
        ) : (
          <div className="py-6 text-slate-400 italic text-xs font-light pl-2">
            Add ancestor birth dates inside your tree canvas to populate dynastic milestones.
          </div>
        )}
      </div>
    </section>
  );
}
