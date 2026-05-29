import React, { useState } from 'react';
import Select, { MultiValue } from 'react-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Member {
  id: number;
  username: string;
  email: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onCreate: (
    title: string,
    description: string,
    assigneeIds: number[],
    status: 'Todo' | 'In Progress' | 'Done',
    dueDate: string | null,
  ) => Promise<void>;
}

export function CreateTaskDialog({
  isOpen,
  onClose,
  members,
  onCreate,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignees, setAssignees] = useState<SelectOption[]>([]);
  const [status, setStatus] = useState<'Todo' | 'In Progress' | 'Done'>('Todo');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const assigneeOptions = members.map((m) => ({
    value: String(m.id),
    label: m.username,
  }));

  const selectStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: 'var(--background)',
      borderColor: 'var(--input)',
      minHeight: '2.75rem',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#6366f1',
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: 'var(--popover)',
      zIndex: 50,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'var(--muted)' : 'var(--popover)',
      color: 'var(--popover-foreground)',
      cursor: 'pointer',
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: 'var(--muted)',
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: 'var(--foreground)',
      fontSize: '0.75rem',
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: 'var(--muted-foreground)',
      ':hover': {
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-foreground)',
      },
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: 'var(--muted-foreground)',
    }),
    input: (provided: any) => ({
      ...provided,
      color: 'var(--foreground)',
    }),
  };

  const handleAssigneeChange = (selected: MultiValue<SelectOption>) => {
    setAssignees(Array.from(selected ?? []));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSubmitting(true);
    try {
      await onCreate(
        title,
        description,
        assignees.map((option) => parseInt(option.value, 10)).filter(Boolean),
        status,
        dueDate || null,
      );
      setTitle('');
      setDescription('');
      setAssignees([]);
      setStatus('Todo');
      setDueDate('');
      onClose();
    } catch (err) {
      console.error('Failed to create task:', err);
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
            Create Task
          </DialogTitle>
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
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Provide task notes...'
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
                onChange={(e) => setStatus(e.target.value as any)}
                className='w-full px-3 py-2 rounded-lg bg-background border border-input focus:border-indigo-500 focus:outline-none text-xs text-foreground transition-colors'>
                <option value='Todo'>Todo</option>
                <option value='In Progress'>In Progress</option>
                <option value='Done'>Done</option>
              </select>
            </div>
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
          <Button
            type='submit'
            disabled={submitting}
            className='w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer'>
            {submitting ? 'Creating...' : 'Create Task'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
