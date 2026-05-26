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
  const [submitting, setSubmitting] = useState(false);

  const assigneeOptions = members.map((m) => ({
    value: String(m.id),
    label: m.username,
  }));

  const selectStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      minHeight: '2.75rem',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#6366f1',
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: '#0f172a',
      zIndex: 50,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#334155' : '#0f172a',
      color: state.isFocused ? '#f8fafc' : '#cbd5e1',
      cursor: 'pointer',
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: '#1e293b',
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: '#e2e8f0',
      fontSize: '0.75rem',
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: '#94a3b8',
      ':hover': {
        backgroundColor: '#475569',
        color: '#f8fafc',
      },
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#94a3b8',
    }),
    input: (provided: any) => ({
      ...provided,
      color: '#f8fafc',
    }),
  };

  const handleAssigneeChange = (selected: MultiValue<SelectOption>) => {
    setAssignees(selected ?? []);
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
      );
      setTitle('');
      setDescription('');
      setAssignees([]);
      setStatus('Todo');
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
      <DialogContent className='bg-slate-900 border border-slate-800 text-slate-100 sm:max-w-md rounded-3xl p-6'>
        <DialogHeader>
          <DialogTitle className='text-base font-bold text-slate-100'>
            Create Task
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className='space-y-4 mt-2'>
          <div>
            <label className='block text-xs font-semibold text-slate-400 mb-1.5 font-sans'>
              Task Title
            </label>
            <Input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Task title'
              className='bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-xs text-slate-200'
              required
            />
          </div>
          <div>
            <label className='block text-xs font-semibold text-slate-400 mb-1.5 font-sans'>
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Provide task notes...'
              rows={2}
              className='bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-xs text-slate-200 resize-none'
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-xs font-semibold text-slate-400 mb-1.5 font-sans'>
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
                    primary25: '#334155',
                    primary: '#6366f1',
                    neutral0: '#0f172a',
                    neutral80: '#cbd5e1',
                  },
                })}
              />
            </div>
            <div>
              <label className='block text-xs font-semibold text-slate-400 mb-1.5 font-sans'>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className='w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-300 transition-colors'>
                <option value='Todo'>Todo</option>
                <option value='In Progress'>In Progress</option>
                <option value='Done'>Done</option>
              </select>
            </div>
          </div>
          <Button
            type='submit'
            disabled={submitting}
            className='w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-bold py-2.5 rounded-xl cursor-pointer'>
            {submitting ? 'Creating...' : 'Create Task'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
