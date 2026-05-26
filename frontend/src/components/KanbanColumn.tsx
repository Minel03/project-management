import React from 'react';
import { Card } from '@/components/ui/card';
import { cn, getInitials } from '@/lib/utils';
import { Edit3, UserCheck, Clock } from 'lucide-react';

interface KanbanColumnProps {
  title: string;
  status: 'Todo' | 'In Progress' | 'Done';
  tasks: any[];
  onDragOver: (
    e: React.DragEvent<HTMLDivElement>,
    status: 'Todo' | 'In Progress' | 'Done',
  ) => void;
  onDragLeave: () => void;
  onDrop: (
    e: React.DragEvent<HTMLDivElement>,
    status: 'Todo' | 'In Progress' | 'Done',
  ) => void;
  onEditTask: (task: any) => void;
  canEditTask?: boolean;
}

export function KanbanColumn({
  title,
  status,
  tasks,
  onDragOver,
  onDragLeave,
  onDrop,
  onEditTask,
  canEditTask,
}: KanbanColumnProps) {
  return (
    <div
      onDragOver={(e) => onDragOver(e, status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, status)}
      className={cn(
        'kanban-dropzone p-4 rounded-2xl bg-slate-900/20 border border-slate-900 min-h-100 flex flex-col',
      )}>
      <div className='flex items-center justify-between mb-4 pb-2 border-b border-slate-900/60'>
        <div className='flex items-center gap-2'>
          <span
            className='w-2 h-2 rounded-full'
            style={{ backgroundColor: statusColor(status) }}
          />
          <h3 className='text-xs font-bold text-slate-300 uppercase tracking-wider'>
            {title}
          </h3>
        </div>
        <span className='text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5'>
          {tasks.length}
        </span>
      </div>

      <div className='flex-1 space-y-3 overflow-y-auto'>
        {tasks.map((task) => (
          <Card
            key={task.id}
            draggable
            onDragStart={(e) =>
              e.dataTransfer.setData('text/plain', String(task.id))
            }
            className='group relative p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/60 active:scale-[0.98] transition-all cursor-grab active:cursor-grabbing shadow-lg'>
            {canEditTask ? (
              <button
                onClick={() => onEditTask(task)}
                className='absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-all cursor-pointer'>
                <Edit3 className='w-3.5 h-3.5' />
              </button>
            ) : null}
            <h4
              className='text-xs font-bold text-slate-200 mb-1 pr-6 truncate'
              style={
                status === 'Done'
                  ? { textDecoration: 'line-through', color: '#6b7280' }
                  : {}
              }>
              {task.title}
            </h4>
            <p className='text-[11px] text-slate-400 line-clamp-2 mb-3'>
              {task.description || 'No description.'}
            </p>
            <div className='flex items-center justify-between text-[9px] text-slate-600'>
              {task.assignees && task.assignees.length > 0 ? (
                <div className='flex items-center gap-1.5 min-w-0'>
                  <div className='flex -space-x-1.5'>
                    {task.assignees.slice(0, 2).map((assignee) => (
                      <div
                        key={assignee.id}
                        className='w-5 h-5 rounded-full bg-indigo-950 border border-indigo-500/20 flex items-center justify-center uppercase text-[8px] font-bold text-indigo-300'
                        title={assignee.username}>
                        {getInitials(assignee.username)}
                      </div>
                    ))}
                  </div>
                  <span className='truncate max-w-22.5'>
                    {task.assignees.map((a) => a.username).join(', ')}
                  </span>
                </div>
              ) : task.assignee_name ? (
                <div className='flex items-center gap-1.5'>
                  <div
                    className='w-5 h-5 rounded-full bg-indigo-950 border border-indigo-500/20 flex items-center justify-center uppercase text-[8px] font-bold text-indigo-300'
                    title={`Assigned to ${task.assignee_name}`}>
                    {getInitials(task.assignee_name)}
                  </div>
                  <span className='truncate max-w-20'>
                    {task.assignee_name}
                  </span>
                </div>
              ) : (
                <div className='flex items-center gap-1'>
                  <UserCheck className='w-3.5 h-3.5' />
                  <span>Unassigned</span>
                </div>
              )}
              <span className='flex items-center gap-1'>
                <Clock className='w-2.5 h-2.5' />
                {new Date(task.updated_at).toLocaleDateString()}
              </span>
            </div>
          </Card>
        ))}
        {tasks.length === 0 && (
          <div className='h-24 border border-dashed border-slate-900 rounded-xl flex items-center justify-center'>
            <span className='text-[10px] text-slate-600'>Drop tasks here</span>
          </div>
        )}
      </div>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case 'Todo':
      return '#6366f1'; // indigo
    case 'In Progress':
      return '#818cf8'; // blue-ish
    case 'Done':
      return '#10b981'; // emerald
    default:
      return '#6b7280';
  }
}
