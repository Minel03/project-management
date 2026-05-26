import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  CheckSquare,
  MessageSquare,
  Plus,
  Play,
} from 'lucide-react';

interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  username: string;
  comment: string;
  created_at: string;
}

interface Subtask {
  id: number;
  task_id: number;
  title: string;
  assigned_to: number | null;
  assignee_name: string | null;
  is_done: boolean | number;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'Todo' | 'In Progress' | 'Done';
  started_by_name: string | null;
  due_date: string | null;
  assignees?: { id: number; username: string }[];
  comments?: TaskComment[];
  subtasks?: Subtask[];
}

interface Member {
  id: number;
  username: string;
  email: string;
}

interface TaskViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  members: Member[];
  onAddComment: (taskId: number, comment: string) => Promise<void>;
  onAddSubtask: (
    taskId: number,
    title: string,
    assignedTo: number | null,
  ) => Promise<void>;
  onToggleSubtask: (
    taskId: number,
    subtaskId: number,
    isDone: boolean,
  ) => Promise<void>;
}

export function TaskViewDialog({
  isOpen,
  onClose,
  task,
  members,
  onAddComment,
  onAddSubtask,
  onToggleSubtask,
}: TaskViewDialogProps) {
  const [comment, setComment] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskAssignee, setSubtaskAssignee] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const completedSubtasks =
    task?.subtasks?.filter((subtask) => Boolean(subtask.is_done)).length ?? 0;

  const formatCommentTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDueDate = (value: string | null) => {
    if (!value) return null;
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString([], {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleAddComment = async () => {
    if (!task || !comment.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(task.id, comment.trim());
      setComment('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!task || !subtaskTitle.trim()) return;
    setSubmitting(true);
    try {
      await onAddSubtask(
        task.id,
        subtaskTitle.trim(),
        subtaskAssignee ? parseInt(subtaskAssignee, 10) : null,
      );
      setSubtaskTitle('');
      setSubtaskAssignee('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='bg-slate-900 border border-slate-800 text-slate-100 sm:max-w-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-base font-bold text-slate-100'>
            {task?.title ?? 'Task Details'}
          </DialogTitle>
          {task ? (
            <div className='flex flex-wrap items-center gap-2 text-[11px] text-slate-400'>
              <span className='rounded-md border border-slate-800 bg-slate-950 px-2 py-1 font-semibold'>
                {task.status}
              </span>
              {task.started_by_name ? (
                <span className='inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-950/40 px-2 py-1 font-semibold text-emerald-300'>
                  <Play className='h-3 w-3' />
                  Started by {task.started_by_name}
                </span>
              ) : null}
              {task.due_date ? (
                <span className='inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-950/30 px-2 py-1 font-semibold text-amber-300'>
                  <CalendarDays className='h-3 w-3' />
                  Due {formatDueDate(task.due_date)}
                </span>
              ) : null}
            </div>
          ) : null}
        </DialogHeader>

        {task ? (
          <>
            <div className='rounded-xl border border-slate-800 bg-slate-950/60 p-4'>
              <p className='text-xs leading-relaxed text-slate-300'>
                {task.description || 'No description.'}
              </p>
              <p className='mt-3 text-[10px] text-slate-500'>
                Assignees:{' '}
                {task.assignees?.length
                  ? task.assignees.map((assignee) => assignee.username).join(', ')
                  : 'Unassigned'}
              </p>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <section className='rounded-xl border border-slate-800 bg-slate-950/60 p-4'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2 text-xs font-bold text-slate-200'>
                    <CheckSquare className='h-4 w-4 text-emerald-400' />
                    Checklist
                  </div>
                  <span className='text-[10px] text-slate-500'>
                    {completedSubtasks}/{task.subtasks?.length ?? 0}
                  </span>
                </div>

                <div className='space-y-2'>
                  {(task.subtasks ?? []).map((subtask) => (
                    <label
                      key={subtask.id}
                      className='flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-300'>
                      <input
                        type='checkbox'
                        checked={Boolean(subtask.is_done)}
                        onChange={(e) =>
                          onToggleSubtask(
                            task.id,
                            subtask.id,
                            e.target.checked,
                          )
                        }
                        className='mt-0.5 h-3.5 w-3.5 accent-emerald-500'
                      />
                      <span className='min-w-0 flex-1'>
                        <span
                          className={
                            Boolean(subtask.is_done)
                              ? 'block text-slate-500 line-through'
                              : 'block'
                          }>
                          {subtask.title}
                        </span>
                        {subtask.assignee_name ? (
                          <span className='text-[10px] text-slate-500'>
                            {subtask.assignee_name}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>

                <div className='mt-3 space-y-2'>
                  <Input
                    type='text'
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    placeholder='Add checklist item'
                    className='bg-slate-950 border-slate-800 text-xs text-slate-200'
                  />
                  <div className='flex gap-2'>
                    <select
                      value={subtaskAssignee}
                      onChange={(e) => setSubtaskAssignee(e.target.value)}
                      className='min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-300'>
                      <option value=''>No owner</option>
                      {members.map((member) => (
                        <option
                          key={member.id}
                          value={member.id}>
                          {member.username}
                        </option>
                      ))}
                    </select>
                    <Button
                      type='button'
                      onClick={handleAddSubtask}
                      disabled={submitting || !subtaskTitle.trim()}
                      className='bg-emerald-600 hover:bg-emerald-500 px-3'>
                      <Plus className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </section>

              <section className='rounded-xl border border-slate-800 bg-slate-950/60 p-4'>
                <div className='mb-3 flex items-center gap-2 text-xs font-bold text-slate-200'>
                  <MessageSquare className='h-4 w-4 text-indigo-400' />
                  Comments
                </div>
                <div className='max-h-56 space-y-3 overflow-y-auto pr-1'>
                  {(task.comments ?? []).length === 0 ? (
                    <p className='text-xs text-slate-500'>No comments yet.</p>
                  ) : (
                    (task.comments ?? []).map((taskComment) => (
                      <div
                        key={taskComment.id}
                        className='rounded-lg border border-slate-800 bg-slate-900/60 p-3'>
                        <div className='mb-1 flex items-center justify-between text-[10px] text-slate-500'>
                          <span className='font-semibold text-slate-300'>
                            {taskComment.username}
                          </span>
                          <span>
                            {formatCommentTimestamp(taskComment.created_at)}
                          </span>
                        </div>
                        <p className='text-xs leading-relaxed text-slate-300'>
                          {taskComment.comment}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className='mt-3 space-y-2'>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder='Add a comment...'
                    rows={2}
                    className='bg-slate-950 border-slate-800 text-xs text-slate-200 resize-none'
                  />
                  <Button
                    type='button'
                    onClick={handleAddComment}
                    disabled={submitting || !comment.trim()}
                    className='w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-bold'>
                    Add Comment
                  </Button>
                </div>
              </section>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
