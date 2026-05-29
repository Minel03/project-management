import React from 'react';
import { Card } from '@/components/ui/card';
import { cn, getInitials } from '@/lib/utils';
import {
  CalendarDays,
  CheckSquare,
  Clock,
  Edit3,
  MessageSquare,
  Play,
  UserCheck,
} from 'lucide-react';

interface KanbanTask {
  id: number;
  title: string;
  description?: string;
  status: 'Todo' | 'In Progress' | 'Done';
  assigned_to?: number | null;
  due_date?: string | null;
  assignee_name?: string | null;
  assignees?: { id: number; username: string }[];
  started_by_name?: string | null;
  comments?: { id: number }[];
  subtasks?: { id: number; is_done: boolean | number }[];
  updated_at: string;
}

interface KanbanColumnProps {
  title: string;
  status: 'Todo' | 'In Progress' | 'Done';
  tasks: KanbanTask[];
  onDragOver: (
    e: React.DragEvent<HTMLDivElement>,
    status: 'Todo' | 'In Progress' | 'Done',
  ) => void;
  onDragLeave: () => void;
  onDrop: (
    e: React.DragEvent<HTMLDivElement>,
    status: 'Todo' | 'In Progress' | 'Done',
  ) => void;
  onViewTask: (task: KanbanTask) => void;
  onEditTask: (task: KanbanTask) => void;
  canEditTask?: boolean | ((task: KanbanTask) => boolean);
}

export function KanbanColumn({
  title,
  status,
  tasks,
  onDragOver,
  onDragLeave,
  onDrop,
  onViewTask,
  onEditTask,
  canEditTask,
}: KanbanColumnProps) {
  const formatDueDate = (value?: string | null) => {
    if (!value) return null;
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      onDragOver={(e) => onDragOver(e, status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, status)}
      className={cn(
        'kanban-dropzone p-4 rounded-2xl bg-card/45 border border-border min-h-100 flex flex-col transition-colors',
      )}>
      <div className='flex items-center justify-between mb-4 pb-2 border-b border-border'>
        <div className='flex items-center gap-2'>
          <span
            className='w-2 h-2 rounded-full'
            style={{ backgroundColor: statusColor(status) }}
          />
          <h3 className='text-xs font-bold text-muted-foreground uppercase tracking-wider'>
            {title}
          </h3>
        </div>
        <span className='text-[10px] font-bold text-muted-foreground bg-muted border border-border rounded-md px-2 py-0.5'>
          {tasks.length}
        </span>
      </div>

      <div className='flex-1 space-y-3 overflow-y-auto'>
        {tasks.map((task) => {
          const taskCanEdit =
            typeof canEditTask === 'function'
              ? canEditTask(task)
              : Boolean(canEditTask);

          return (
            <Card
              key={task.id}
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData('text/plain', String(task.id))
              }
              onClick={() => onViewTask(task)}
              className='group relative p-4 rounded-xl bg-background/80 border border-border hover:border-foreground/15 active:scale-[0.98] transition-all cursor-pointer shadow-sm dark:shadow-lg'>
              {taskCanEdit ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTask(task);
                  }}
                  className='absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer'
                  title='Edit task'>
                  <Edit3 className='w-3.5 h-3.5' />
                </button>
              ) : null}
            <h4
              className='text-xs font-bold text-foreground mb-1 pr-6 truncate'
              style={
                status === 'Done'
                  ? { textDecoration: 'line-through', color: '#6b7280' }
                  : {}
              }>
              {task.title}
            </h4>
            <p className='text-[11px] text-muted-foreground line-clamp-2 mb-3'>
              {task.description || 'No description.'}
            </p>
            {task.started_by_name ? (
              <div className='mb-3 inline-flex max-w-full items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-950/40 px-2 py-1 text-[9px] font-semibold text-emerald-300'>
                <Play className='h-2.5 w-2.5 shrink-0' />
                <span className='truncate'>
                  Started by {task.started_by_name}
                </span>
              </div>
            ) : null}
            {(task.subtasks?.length || task.comments?.length) ? (
              <div className='mb-3 flex items-center gap-3 text-[9px] text-muted-foreground'>
                {task.subtasks?.length ? (
                  <span className='flex items-center gap-1'>
                    <CheckSquare className='h-3 w-3' />
                    {
                      task.subtasks.filter(
                        (subtask: { is_done: boolean | number }) =>
                          Boolean(subtask.is_done),
                      ).length
                    }
                    /
                    {task.subtasks.length}
                  </span>
                ) : null}
                {task.comments?.length ? (
                  <span className='flex items-center gap-1'>
                    <MessageSquare className='h-3 w-3' />
                    {task.comments.length}
                  </span>
                ) : null}
              </div>
            ) : null}
            {task.due_date ? (
              <div className='mb-3 flex items-center gap-1.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300'>
                <CalendarDays className='h-3 w-3' />
                <span>Due {formatDueDate(task.due_date)}</span>
              </div>
            ) : null}
            <div className='flex items-center justify-between text-[9px] text-muted-foreground'>
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
          );
        })}
        {tasks.length === 0 && (
          <div className='h-24 border border-dashed border-border rounded-xl flex items-center justify-center'>
            <span className='text-[10px] text-muted-foreground'>Drop tasks here</span>
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
