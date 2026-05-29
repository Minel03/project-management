import React, { useState } from 'react';
import Select, {
  SingleValue,
  StylesConfig,
  CSSObjectWithLabel,
  OptionProps,
} from 'react-select';
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

interface SelectOption {
  value: string;
  label: string;
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
  const [subtaskAssignee, setSubtaskAssignee] = useState<SelectOption | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const completedSubtasks =
    task?.subtasks?.filter((subtask) => Boolean(subtask.is_done)).length ?? 0;

  const assigneeOptions = members.map((member) => ({
    value: String(member.id),
    label: member.username,
  }));

  const selectStyles: StylesConfig<SelectOption, false> = {
    control: (provided: CSSObjectWithLabel) => ({
      ...provided,
      backgroundColor: 'var(--background)',
      borderColor: 'var(--input)',
      minHeight: '2.25rem',
      borderRadius: '0.5rem',
      boxShadow: 'none',
      fontSize: '0.75rem',
      '&:hover': {
        borderColor: '#6366f1',
      },
    }),
    menu: (provided: CSSObjectWithLabel) => ({
      ...provided,
      backgroundColor: 'var(--popover)',
      zIndex: 50,
    }),
    option: (
      provided: CSSObjectWithLabel,
      state: OptionProps<SelectOption, false>,
    ) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'var(--muted)' : 'var(--popover)',
      color: 'var(--popover-foreground)',
      cursor: 'pointer',
      fontSize: '0.75rem',
    }),
    singleValue: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: 'var(--foreground)',
    }),
    placeholder: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: 'var(--muted-foreground)',
    }),
    input: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: 'var(--foreground)',
    }),
    dropdownIndicator: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: 'var(--muted-foreground)',
      padding: '0 0.5rem',
    }),
    clearIndicator: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: 'var(--muted-foreground)',
      padding: '0 0.5rem',
    }),
    indicatorSeparator: (provided: CSSObjectWithLabel) => ({
      ...provided,
      backgroundColor: 'var(--border)',
    }),
  };

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
        subtaskAssignee ? parseInt(subtaskAssignee.value, 10) : null,
      );
      setSubtaskTitle('');
      setSubtaskAssignee(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='bg-popover border border-border text-popover-foreground sm:max-w-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-base font-bold text-foreground'>
            {task?.title ?? 'Task Details'}
          </DialogTitle>
          {task ? (
            <div className='flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground'>
              <span className='rounded-md border border-border bg-background px-2 py-1 font-semibold'>
                {task.status}
              </span>
              {task.started_by_name ? (
                <span className='inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-950/40 px-2 py-1 font-semibold text-emerald-300'>
                  <Play className='h-3 w-3' />
                  Started by {task.started_by_name}
                </span>
              ) : null}
              {task.due_date ? (
                <span className='inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-100 px-2 py-1 font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'>
                  <CalendarDays className='h-3 w-3' />
                  Due {formatDueDate(task.due_date)}
                </span>
              ) : null}
            </div>
          ) : null}
        </DialogHeader>

        {task ? (
          <>
            <div className='rounded-xl border border-border bg-background/60 p-4'>
              <p className='text-xs leading-relaxed text-foreground/85'>
                {task.description || 'No description.'}
              </p>
              <p className='mt-3 text-[10px] text-muted-foreground'>
                Assignees:{' '}
                {task.assignees?.length
                  ? task.assignees
                      .map((assignee) => assignee.username)
                      .join(', ')
                  : 'Unassigned'}
              </p>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <section className='rounded-xl border border-border bg-background/60 p-4'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2 text-xs font-bold text-foreground'>
                    <CheckSquare className='h-4 w-4 text-emerald-400' />
                    Checklist
                  </div>
                  <span className='text-[10px] text-muted-foreground'>
                    {completedSubtasks}/{task.subtasks?.length ?? 0}
                  </span>
                </div>

                <div className='space-y-2'>
                  {(task.subtasks ?? []).map((subtask) => (
                    <label
                      key={subtask.id}
                      className='flex items-start gap-2 rounded-lg border border-border bg-card/60 p-2 text-xs text-foreground/85'>
                      <input
                        type='checkbox'
                        checked={Boolean(subtask.is_done)}
                        onChange={(e) =>
                          onToggleSubtask(task.id, subtask.id, e.target.checked)
                        }
                        className='mt-0.5 h-3.5 w-3.5 accent-emerald-500'
                      />
                      <span className='min-w-0 flex-1'>
                        <span
                          className={
                            Boolean(subtask.is_done)
                              ? 'block text-muted-foreground line-through'
                              : 'block'
                          }>
                          {subtask.title}
                        </span>
                        {subtask.assignee_name ? (
                          <span className='text-[10px] text-muted-foreground'>
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
                    className='bg-background border-input text-xs text-foreground'
                  />
                  <div className='flex gap-2'>
                    <Select
                      isClearable
                      options={assigneeOptions}
                      value={subtaskAssignee}
                      onChange={(selected: SingleValue<SelectOption>) =>
                        setSubtaskAssignee(selected)
                      }
                      placeholder='No owner'
                      styles={selectStyles}
                      className='min-w-0 flex-1 text-xs'
                      classNamePrefix='react-select'
                      theme={(theme) => ({
                        ...theme,
                        borderRadius: 8,
                        colors: {
                          ...theme.colors,
                          primary25: 'var(--muted)',
                          primary: '#6366f1',
                          neutral0: 'var(--popover)',
                          neutral80: 'var(--popover-foreground)',
                        },
                      })}
                    />
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

              <section className='rounded-xl border border-border bg-background/60 p-4'>
                <div className='mb-3 flex items-center gap-2 text-xs font-bold text-foreground'>
                  <MessageSquare className='h-4 w-4 text-indigo-400' />
                  Comments
                </div>
                <div className='max-h-56 space-y-3 overflow-y-auto pr-1'>
                  {(task.comments ?? []).length === 0 ? (
                    <p className='text-xs text-muted-foreground'>
                      No comments yet.
                    </p>
                  ) : (
                    (task.comments ?? []).map((taskComment) => (
                      <div
                        key={taskComment.id}
                        className='rounded-lg border border-border bg-card/60 p-3'>
                        <div className='mb-1 flex items-center justify-between text-[10px] text-muted-foreground'>
                          <span className='font-semibold text-foreground/85'>
                            {taskComment.username}
                          </span>
                          <span>
                            {formatCommentTimestamp(taskComment.created_at)}
                          </span>
                        </div>
                        <p className='text-xs leading-relaxed text-foreground/85'>
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
                    className='bg-background border-input text-xs text-foreground resize-none'
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
