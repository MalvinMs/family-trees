import { Handle, Position } from '@xyflow/react';
import { User, Sparkles } from 'lucide-react';
import { Person } from '../../store/treeStore';

interface PersonNodeProps {
  data: {
    person: Person;
    onEdit: (person: Person) => void;
    onDelete: (id: string) => void;
    isDarkMode?: boolean;
  };
}

export default function PersonNode({ data }: PersonNodeProps) {
  const { person, onEdit, onDelete } = data;
  const isDarkMode = data.isDarkMode ?? true;
  const isMale = person.gender === 'male';
  const isFemale = person.gender === 'female';

  const genderBorder = isMale
    ? 'border-sky-300/40 dark:border-sky-500/20 shadow-sky-500/2'
    : isFemale
    ? 'border-pink-300/40 dark:border-pink-500/20 shadow-pink-500/2'
    : 'border-slate-200 dark:border-[#2e2e30]';

  const genderDot = isMale
    ? 'bg-sky-400'
    : isFemale
    ? 'bg-pink-400'
    : 'bg-[#7b8e7f]';

  return (
    <div
      className={`group px-6 py-5 rounded-2xl border ${genderBorder} shadow-xs min-w-[210px] transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
        isDarkMode
          ? 'bg-[#1a1a1c] text-[#f3f3f5] hover:border-[#2e2e30]'
          : 'bg-white text-[#1c1c1e] hover:border-slate-300'
      }`}
    >
      {/* React Flow handles for drawing connections */}
      <Handle type="target" position={Position.Top} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none" id="parent-in" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none" id="child-out" />
      <Handle type="source" position={Position.Left} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none" id="partner-left" />
      <Handle type="target" position={Position.Right} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none" id="partner-right" />

      {/* Node Header */}
      <div className="flex items-start justify-between mb-3 text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${genderDot}`} />
            <h4 className={`font-sans font-bold text-[15px] leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {person.first_name} {person.last_name || ''}
            </h4>
          </div>
          {(person.birth_date || person.death_date) && (
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">
              {person.birth_date ? new Date(person.birth_date).getFullYear() : '???'} –{' '}
              {person.death_date ? new Date(person.death_date).getFullYear() : person.death_date === null ? 'Present' : '???'}
            </p>
          )}
        </div>
      </div>

      {/* Biography snippet (Spacious, Minimal) */}
      {person.biography && (
        <p className={`text-left italic leading-relaxed text-[10px] line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-light mb-3`}>
          "{person.biography}"
        </p>
      )}

      {/* Dynamic custom fields listing (Dynamic Schema!) */}
      {person.dynamic_data && Object.keys(person.dynamic_data).length > 0 && (
        <div className={`border-t pt-3 mt-3 space-y-1.5 text-left text-[10px] ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
          {Object.entries(person.dynamic_data).map(([key, val]) => {
            if (!val) return null;
            return (
              <div key={key} className="flex justify-between items-center px-1">
                <span className="font-medium text-slate-400 capitalize">{key.replace('_', ' ')}</span>
                <span className={`font-semibold truncate max-w-[110px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{val}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Premium hover action menu (Invisible by default, reveals on hover) */}
      <div className={`flex items-center justify-end gap-2 border-t pt-3 mt-4 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-350 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(person);
          }}
          className={`px-2 py-0.5 rounded transition-all ${
            isDarkMode
              ? 'bg-white/5 text-slate-300 hover:text-white hover:bg-[#2c2c2e]'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(person.id);
          }}
          className={`px-2 py-0.5 rounded transition-all ${
            isDarkMode
              ? 'bg-white/5 text-red-400 hover:text-white hover:bg-red-950/20'
              : 'bg-red-50 text-red-500 hover:text-white hover:bg-red-500'
          }`}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
