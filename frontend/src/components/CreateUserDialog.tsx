'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Member {
  id: number;
  username: string;
  email: string;
  role?: 'admin' | 'member';
}

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  users: Member[];
  onCreate: (
    username: string,
    email: string,
    password: string,
    role: 'admin' | 'member',
  ) => Promise<void>;
}

export function CreateUserDialog({
  isOpen,
  onClose,
  users,
  onCreate,
}: CreateUserDialogProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Username, email, and password are required.');
      return;
    }

    try {
      setSaving(true);
      await onCreate(username.trim(), email.trim(), password, role);
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('member');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <DialogContent className='bg-slate-900 border border-slate-800 text-slate-100 sm:max-w-lg rounded-3xl p-6'>
        <DialogHeader>
          <DialogTitle className='text-base font-bold text-slate-100'>
            User Management
          </DialogTitle>
          <DialogDescription className='text-sm text-slate-400'>
            Create system users and view existing accounts.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid gap-3'>
            <label className='text-xs uppercase tracking-[0.18em] text-slate-500'>
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder='New user username'
            />
          </div>
          <div className='grid gap-3'>
            <label className='text-xs uppercase tracking-[0.18em] text-slate-500'>
              Email
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='new.user@example.com'
              type='email'
            />
          </div>
          <div className='grid gap-3'>
            <label className='text-xs uppercase tracking-[0.18em] text-slate-500'>
              Password
            </label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Secure password'
              type='password'
            />
          </div>
          <div className='grid gap-3'>
            <label className='text-xs uppercase tracking-[0.18em] text-slate-500'>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className='h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'>
              <option value='member'>Member</option>
              <option value='admin'>Admin</option>
            </select>
          </div>

          {error && (
            <div className='rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200'>
              {error}
            </div>
          )}

          <div className='rounded-3xl border border-slate-800 bg-slate-950/80 p-4'>
            <p className='text-xs uppercase tracking-[0.18em] text-slate-500 mb-3'>
              Existing accounts
            </p>
            <div className='space-y-2 max-h-48 overflow-y-auto pr-2'>
              {users.length === 0 ? (
                <p className='text-xs text-slate-500'>No users found.</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className='flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-200'>
                    <div>
                      <p className='font-semibold'>{user.username}</p>
                      <p className='text-[11px] text-slate-500'>{user.email}</p>
                    </div>
                    <span className='rounded-full bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400'>
                      {user.role || 'member'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className='mt-4 flex justify-end gap-2'>
          <Button
            variant='outline'
            onClick={onClose}
            disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}>
            {saving ? 'Saving...' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
