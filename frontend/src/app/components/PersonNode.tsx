import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Person } from '../../store/treeStore';

interface PersonNodeProps {
  id: string;
  selected?: boolean;
  data: {
    person: Person;
    onEdit: (person: Person) => void;
    onDelete: (id: string) => void;
    isDarkMode?: boolean;
    opacity?: number;
  };
}

function PersonNode({ id: _id, selected, data }: PersonNodeProps) {
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
      style={{ opacity: data.opacity ?? 1 }}
      className={`group px-6 py-5 rounded-2xl border ${genderBorder} shadow-xs min-w-[210px] transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
        isDarkMode
          ? 'bg-[#1a1a1c] text-[#f3f3f5] hover:border-[#2e2e30]'
          : 'bg-white text-[#1c1c1e] hover:border-slate-300'
      } ${selected ? 'ring-2 ring-[#7b8e7f] dark:ring-[#9cb2a2] border-transparent' : ''}`}
    >
      {/* Top handles */}
      <Handle type="target" position={Position.Top} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none" id="parent-in" />
      <Handle type="source" position={Position.Top} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none opacity-0" id="parent-in-src" />

      {/* Bottom handles */}
      <Handle type="source" position={Position.Bottom} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none" id="child-out" />
      <Handle type="target" position={Position.Bottom} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none opacity-0" id="child-out-tgt" />

      {/* Left handles */}
      <Handle type="source" position={Position.Left} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none" id="partner-left" />
      <Handle type="target" position={Position.Left} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none opacity-0" id="partner-left-tgt" />

      {/* Right handles */}
      <Handle type="target" position={Position.Right} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none" id="partner-right" />
      <Handle type="source" position={Position.Right} className="!bg-[#7b8e7f] !w-2.5 !h-2.5 !border-none opacity-0" id="partner-right-src" />

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

      {/* Biography snippet */}
      {person.biography && (
        <p className={`text-left italic leading-relaxed text-[10px] line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-light mb-3`}>
          "{person.biography}"
        </p>
      )}

      {/* Dynamic custom fields listing */}
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

      {/* Action menu */}
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

export default memo(PersonNode, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.isDarkMode === nextProps.data.isDarkMode &&
    prevProps.data.opacity === nextProps.data.opacity &&
    prevProps.data.person.first_name === nextProps.data.person.first_name &&
    prevProps.data.person.last_name === nextProps.data.person.last_name &&
    prevProps.data.person.gender === nextProps.data.person.gender &&
    prevProps.data.person.birth_date === nextProps.data.person.birth_date &&
    prevProps.data.person.death_date === nextProps.data.person.death_date &&
    prevProps.data.person.biography === nextProps.data.person.biography &&
    JSON.stringify(prevProps.data.person.dynamic_data) === JSON.stringify(nextProps.data.person.dynamic_data) &&
    prevProps.data.person.ui_metadata?.background_color === nextProps.data.person.ui_metadata?.background_color &&
    prevProps.data.person.ui_metadata?.border_color === nextProps.data.person.ui_metadata?.border_color
  );
});
