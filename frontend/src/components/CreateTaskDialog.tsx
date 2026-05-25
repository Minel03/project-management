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

interface Member {
  id: number;
  username: string;
  email: string;
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
  const [assignees, setAssignees] = useState<string[]>([]);
  const [status, setStatus] = useState<'Todo' | 'In Progress' | 'Done'>('Todo');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSubmitting(true);
    try {
      await onCreate(
        title,
        description,
        assignees.map((id) => parseInt(id, 10)).filter(Boolean),
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
              <select
                multiple
                size={4}
                value={assignees}
                onChange={(e) =>
                  setAssignees(
                    Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    ),
                  )
                }
                className='w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-slate-300 transition-colors'>
                {members.map((m) => (
                  <option
                    key={m.id}
                    value={String(m.id)}>
                    {m.username}
                  </option>
                ))}
              </select>
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
