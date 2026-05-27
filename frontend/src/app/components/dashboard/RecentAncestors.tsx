import { BookOpen } from 'lucide-react';
import type { Person } from '../../../store/treeStore';

interface RecentAncestorsProps {
  ancestors: Person[];
}

export default function RecentAncestors({ ancestors }: RecentAncestorsProps) {
  return (
    <section className="p-6 md:p-8 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-xs flex flex-col justify-between text-left">
      <div>
        <h2 className="text-lg font-serif font-semibold mb-5 flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <BookOpen size={16} className="text-[#7b8e7f]" />
          Recent Ancestor Profiles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ancestors.length > 0 ? (
            ancestors.map((p) => {
              const birth = p.birth_date ? new Date(p.birth_date).getFullYear() : '???';
              const death = p.death_date ? new Date(p.death_date).getFullYear() : p.death_date === null ? 'Present' : '???';
              return (
                <div key={p.id} className="p-4 rounded-xl border border-[#e6e5e0] dark:border-[#2c2c2e] bg-[#faf9f6]/40 dark:bg-white/2 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm truncate">{p.first_name} {p.last_name || ''}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{birth} – {death}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-2 italic font-light mt-2 leading-relaxed">
                      {p.biography ? `"${p.biography}"` : 'No biographical record yet.'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-10 text-center border border-dashed border-[#e6e5e0] dark:border-[#2c2c2e] rounded-xl text-slate-400 italic text-xs font-light">
              Preserve historical ancestors on your canvas to populate dynamic vitals profiles.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
