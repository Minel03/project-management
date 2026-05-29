import React, { useEffect, useState } from 'react';
import Select, {
  MultiValue,
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
import { Trash2 } from 'lucide-react';

interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: 'Todo' | 'In Progress' | 'Done';
  assigned_to: number | null;
  assignee_name: string | null;
  started_by: number | null;
  started_by_name: string | null;
  due_date: string | null;
  assignees?: { id: number; username: string }[];
  created_at: string;
  updated_at: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface Member {
  id: number;
  username: string;
  email: string;
}

interface EditTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  members: Member[];
  onSave: (
    taskId: number,
    updatedFields: {
      title: string;
      description: string;
      status: 'Todo' | 'In Progress' | 'Done';
      assignedTo: number[] | null;
      dueDate: string | null;
      remark: string;
    },
  ) => Promise<void>;
  canDeleteTask?: boolean;
  onDeleteTask?: (task: Task) => void;
}

export function EditTaskDialog({
  isOpen,
  onClose,
  task,
  members,
  onSave,
  canDeleteTask,
  onDeleteTask,
}: EditTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignees, setAssignees] = useState<SelectOption[]>([]);
  const [status, setStatus] = useState<'Todo' | 'In Progress' | 'Done'>('Todo');
  const [dueDate, setDueDate] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const assigneeOptions = members.map((m) => ({
    value: String(m.id),
    label: m.username,
  }));

  const selectStyles: StylesConfig<SelectOption, true> = {
    control: (provided: CSSObjectWithLabel) => ({
      ...provided,
      backgroundColor: 'var(--background)',
      borderColor: 'var(--input)',
      minHeight: '2.75rem',
      boxShadow: 'none',
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
      state: OptionProps<SelectOption, true>,
    ) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'var(--muted)' : 'var(--popover)',
      color: 'var(--popover-foreground)',
      cursor: 'pointer',
    }),
    multiValue: (provided: CSSObjectWithLabel) => ({
      ...provided,
      backgroundColor: 'var(--muted)',
    }),
    multiValueLabel: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: 'var(--foreground)',
      fontSize: '0.75rem',
    }),
    multiValueRemove: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: 'var(--muted-foreground)',
      ':hover': {
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-foreground)',
      },
    }),
    placeholder: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: 'var(--muted-foreground)',
    }),
    input: (provided: CSSObjectWithLabel) => ({
      ...provided,
      color: 'var(--foreground)',
    }),
  };

  const handleAssigneeChange = (selected: MultiValue<SelectOption>) => {
    setAssignees(Array.from(selected ?? []));
  };

  const toDateInputValue = (value: string | null) => {
    if (!value) return '';
    return value.slice(0, 10);
  };

  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setDueDate(toDateInputValue(task.due_date));
      const currentAssignees =
        task.assignees?.map((a) => ({
          value: String(a.id),
          label: a.username,
        })) ??
        (task.assigned_to
          ? [
              {
                value: String(task.assigned_to),
                label: task.assignee_name ?? 'Assignee',
              },
            ]
          : []);
      setAssignees(currentAssignees);
      setRemark('');
    }
  }, [task, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setSubmitting(true);
    try {
      await onSave(task.id, {
        title,
        description,
        status,
        assignedTo:
          assignees.length > 0
            ? assignees
                .map((option) => parseInt(option.value, 10))
                .filter(Boolean)
            : [],
        dueDate: dueDate || null,
        remark: remark.trim(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='bg-popover border border-border text-popover-foreground sm:max-w-md rounded-3xl p-6'>
        <DialogHeader>
          <DialogTitle className='text-base font-bold text-foreground'>
            Edit Task
          </DialogTitle>
          {task?.started_by_name ? (
            <p className='text-[11px] font-medium text-emerald-300'>
              Started by {task.started_by_name}
            </p>
          ) : null}
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className='space-y-4 mt-2'>
          <div>
            <label className='block text-xs font-semibold text-muted-foreground mb-1.5 font-sans'>
              Task Title
            </label>
            <Input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Task title'
              className='bg-background border-input focus:border-indigo-500 focus:ring-indigo-500 text-xs text-foreground'
              required
            />
          </div>
          <div>
            <label className='block text-xs font-semibold text-muted-foreground mb-1.5 font-sans'>
              Due Date
            </label>
            <Input
              type='date'
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className='bg-background border-input focus:border-indigo-500 focus:ring-indigo-500 text-xs text-foreground'
            />
          </div>
          <div>
            <label className='block text-xs font-semibold text-muted-foreground mb-1.5 font-sans'>
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Provide notes...'
              rows={2}
              className='bg-background border-input focus:border-indigo-500 focus:ring-indigo-500 text-xs text-foreground resize-none'
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-xs font-semibold text-muted-foreground mb-1.5 font-sans'>
                Assignees
              </label>
              <Select
                isMulti
                options={assigneeOptions}
                value={assignees}
                onChange={handleAssigneeChange}
                placeholder='Select assignees...'
                styles={selectStyles}
                className='react-select-container text-xs'
                classNamePrefix='react-select'
                theme={(theme) => ({
                  ...theme,
                  borderRadius: 12,
                  colors: {
                    ...theme.colors,
                    primary25: 'var(--muted)',
                    primary: '#6366f1',
                    neutral0: 'var(--popover)',
                    neutral80: 'var(--popover-foreground)',
                  },
                })}
              />
            </div>
            <div>
              <label className='block text-xs font-semibold text-muted-foreground mb-1.5 font-sans'>
                Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'Todo' | 'In Progress' | 'Done')
                }
                className='w-full px-3 py-2 rounded-lg bg-background border border-input focus:border-indigo-500 focus:outline-none text-xs text-foreground transition-colors'>
                <option value='Todo'>Todo</option>
                <option value='In Progress'>In Progress</option>
                <option value='Done'>Done</option>
              </select>
            </div>
          </div>
          <div>
            <label className='block text-xs font-semibold text-muted-foreground mb-1.5 font-sans'>
              Remark / Reason (Optional)
            </label>
            <Input
              type='text'
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder='Explain status change or modification reason'
              className='bg-background border-input focus:border-indigo-500 focus:ring-indigo-500 text-xs text-foreground'
            />
          </div>
          <div className='flex flex-col gap-2 sm:flex-row'>
            {canDeleteTask && task ? (
              <Button
                type='button'
                variant='destructive'
                onClick={() => onDeleteTask?.(task)}
                disabled={submitting}
                className='sm:w-auto text-xs font-bold py-2.5 rounded-xl cursor-pointer'>
                <Trash2 className='h-3.5 w-3.5' />
                Delete Task
              </Button>
            ) : null}
            <Button
              type='submit'
              disabled={submitting}
              className='flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer'>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
