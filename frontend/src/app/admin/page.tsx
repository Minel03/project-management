'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { Button } from '@/components/ui/button';
import { getInitials } from '@/lib/utils';
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Users,
  FolderPlus,
  Plus,
  Trash2,
} from 'lucide-react';

interface UserSummary {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'leader' | 'member';
  created_at?: string;
}

interface TeamSummary {
  id: number;
  name: string;
  leader_id: number;
  leader_name: string;
}

interface TeamDetails extends TeamSummary {
  members: UserSummary[];
}

export default function AdminPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetails | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'leader' | 'member'>(
    'member',
  );
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeader, setNewTeamLeader] = useState<number | null>(null);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState<number | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }

      if (user.role !== 'admin') {
        router.push('/');
        return;
      }

      loadAdminData();
    }
  }, [authLoading, user, router]);

  const leaderCandidates = users.filter((account) => account.role === 'leader');

  const loadAdminData = async () => {
    setError(null);
    setUsersLoading(true);
    setTeamsLoading(true);

    try {
      const [usersRes, teamsRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/teams'),
      ]);

      if (usersRes.data.success) {
        setUsers(usersRes.data.data || []);
      }

      if (teamsRes.data.success) {
        setTeams(teamsRes.data.data.allTeams || []);
      }
    } catch (err: any) {
      console.error('Admin data fetch failed:', err);
      setError(
        err?.response?.data?.message || 'Unable to load admin console data.',
      );
    } finally {
      setUsersLoading(false);
      setTeamsLoading(false);
    }
  };

  const loadTeamDetails = async (teamId: number) => {
    try {
      const res = await api.get(`/api/teams/${teamId}`);
      if (res.data.success) {
        setSelectedTeam(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load team details:', err);
    }
  };

  const handleTeamToggle = async (teamId: number) => {
    if (selectedTeam?.id === teamId) {
      setSelectedTeam(null);
      return;
    }
    await loadTeamDetails(teamId);
  };

  const handleCreateUser = async () => {
    setError(null);
    if (
      !newUserName.trim() ||
      !newUserEmail.trim() ||
      !newUserPassword.trim()
    ) {
      setError('Username, email, and password are required.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/api/users', {
        username: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
      });
      if (res.data.success) {
        setUsers([res.data.data, ...users]);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('member');
      }
    } catch (err: any) {
      console.error('Create user failed:', err);
      setError(err?.response?.data?.message || 'Could not create user.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTeam = async () => {
    setError(null);
    if (!newTeamName.trim()) {
      setError('Team name is required.');
      return;
    }

    try {
      setSaving(true);
      if (!newTeamLeader) {
        setError(
          'Select a leader with the leader role before creating a team.',
        );
        return;
      }

      const res = await api.post('/api/teams', {
        name: newTeamName.trim(),
        leaderId: newTeamLeader,
      });
      if (res.data.success) {
        setTeams([res.data.data, ...teams]);
        setNewTeamName('');
        setNewTeamLeader(null);
      }
    } catch (err: any) {
      console.error('Create team failed:', err);
      setError(err?.response?.data?.message || 'Could not create team.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUserRole = async (
    userId: number,
    role: 'admin' | 'leader' | 'member',
  ) => {
    try {
      setSaving(true);
      const res = await api.patch(`/api/users/${userId}/role`, { role });
      if (res.data.success) {
        setUsers(
          users.map((item) => (item.id === userId ? res.data.data : item)),
        );
      }
    } catch (err: any) {
      console.error('Update role failed:', err);
      setError(err?.response?.data?.message || 'Unable to update user role.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Delete this user permanently?')) {
      return;
    }

    try {
      setSaving(true);
      await api.delete(`/api/users/${userId}`);
      setUsers(users.filter((item) => item.id !== userId));
      if (selectedTeam) {
        setSelectedTeam({
          ...selectedTeam,
          members: selectedTeam.members.filter(
            (member) => member.id !== userId,
          ),
        });
      }
    } catch (err: any) {
      console.error('Delete user failed:', err);
      setError(err?.response?.data?.message || 'Unable to delete user.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedMemberToAdd) {
      setError('Select a user to add to the team.');
      return;
    }

    try {
      setSaving(true);
      await api.post(`/api/teams/${selectedTeam.id}/members`, {
        userId: selectedMemberToAdd,
      });
      await loadTeamDetails(selectedTeam.id);
      setSelectedMemberToAdd(null);
    } catch (err: any) {
      console.error('Add member failed:', err);
      setError(err?.response?.data?.message || 'Unable to add member.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedTeam) return;
    try {
      setSaving(true);
      await api.delete(`/api/teams/${selectedTeam.id}/members/${memberId}`);
      await loadTeamDetails(selectedTeam.id);
    } catch (err: any) {
      console.error('Remove member failed:', err);
      setError(err?.response?.data?.message || 'Unable to remove member.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-slate-950'>
        <Loader2 className='w-8 h-8 text-indigo-500 animate-spin' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans'>
      <header className='sticky top-0 z-20 shrink-0 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.push('/')}
            className='text-slate-400 hover:text-slate-100'>
            <ArrowLeft className='w-4 h-4' />
          </Button>
          <div>
            <h1 className='text-base font-bold tracking-tight text-slate-100'>
              Admin Console
            </h1>
            <p className='text-[10px] text-slate-500'>
              Manage system users, teams, and access levels.
            </p>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          <div className='rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-300'>
            <span className='font-semibold text-slate-100'>Signed in as</span>{' '}
            {user.username}
          </div>
          <button
            onClick={logout}
            className='py-1.5 px-3 rounded-lg border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 bg-slate-950/60 hover:bg-rose-950/10 transition-all text-xs font-medium'>
            Log out
          </button>
        </div>
      </header>

      <main className='flex-1 max-w-4xl w-full mx-auto p-6 space-y-6'>
        {error && (
          <div className='rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200'>
            {error}
          </div>
        )}

        <section className='grid gap-6'>
          <div className='rounded-3xl border border-slate-800 bg-slate-900/70 p-6'>
            <div className='flex items-center gap-3 mb-5'>
              <ShieldCheck className='w-5 h-5 text-emerald-400' />
              <div>
                <h2 className='text-lg font-semibold text-slate-100'>
                  Create a new user
                </h2>
                <p className='text-xs text-slate-500'>
                  Admins can create system users and assign roles.
                </p>
              </div>
            </div>

            <div className='grid gap-4'>
              <label className='grid gap-2 text-sm'>
                <span>Username</span>
                <input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className='rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  placeholder='john_doe'
                />
              </label>
              <label className='grid gap-2 text-sm'>
                <span>Email</span>
                <input
                  type='email'
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className='rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  placeholder='john@example.com'
                />
              </label>
              <label className='grid gap-2 text-sm'>
                <span>Password</span>
                <input
                  type='password'
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className='rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  placeholder='Create a password'
                />
              </label>
              <label className='grid gap-2 text-sm'>
                <span>Role</span>
                <select
                  value={newUserRole}
                  onChange={(e) =>
                    setNewUserRole(
                      e.target.value as 'admin' | 'leader' | 'member',
                    )
                  }
                  className='h-10 rounded-2xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'>
                  <option value='member'>Member</option>
                  <option value='leader'>Leader</option>
                  <option value='admin'>Admin</option>
                </select>
              </label>
              <div className='flex justify-end'>
                <Button
                  onClick={handleCreateUser}
                  disabled={saving}>
                  <Plus className='mr-2 h-4 w-4' /> Create User
                </Button>
              </div>
            </div>
          </div>

          <div className='rounded-3xl border border-slate-800 bg-slate-900/70 p-6'>
            <div className='flex items-center gap-3 mb-5'>
              <FolderPlus className='w-5 h-5 text-cyan-400' />
              <div>
                <h2 className='text-lg font-semibold text-slate-100'>
                  Create a new team
                </h2>
                <p className='text-xs text-slate-500'>
                  Select a leader and initialize membership for a team.
                </p>
              </div>
            </div>

            <div className='grid gap-4'>
              <label className='grid gap-2 text-sm'>
                <span>Team name</span>
                <input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className='rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  placeholder='Alpha Squad'
                />
              </label>
              <label className='grid gap-2 text-sm'>
                <span>Team leader</span>
                <select
                  value={newTeamLeader ?? ''}
                  onChange={(e) =>
                    setNewTeamLeader(parseInt(e.target.value, 10))
                  }
                  className='h-10 rounded-2xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'>
                  <option
                    value=''
                    disabled>
                    Select a leader
                  </option>
                  {leaderCandidates.map((account) => (
                    <option
                      key={account.id}
                      value={account.id}>
                      {account.username} ({account.role})
                    </option>
                  ))}
                </select>
              </label>
              <div className='flex justify-end'>
                <Button
                  onClick={handleCreateTeam}
                  disabled={saving}>
                  <Plus className='mr-2 h-4 w-4' /> Create Team
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className='grid gap-6'>
          <div className='rounded-3xl border border-slate-800 bg-slate-900/70 p-6'>
            <div className='flex items-center gap-3 mb-5'>
              <Users className='w-5 h-5 text-violet-400' />
              <div>
                <h2 className='text-lg font-semibold text-slate-100'>
                  System users
                </h2>
                <p className='text-xs text-slate-500'>
                  All accounts in the system with current roles.
                </p>
              </div>
            </div>
            {usersLoading ? (
              <div className='flex items-center justify-center py-12'>
                <Loader2 className='w-6 h-6 text-indigo-500 animate-spin' />
              </div>
            ) : (
              <div className='space-y-3'>
                {users.length === 0 ? (
                  <p className='text-sm text-slate-500'>No users found.</p>
                ) : (
                  users.map((account) => (
                    <div
                      key={account.id}
                      className='grid gap-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center'>
                      <div>
                        <p className='font-semibold text-slate-100'>
                          {account.username}
                        </p>
                        <p className='text-xs text-slate-500'>
                          {account.email}
                        </p>
                      </div>
                      <select
                        value={account.role}
                        onChange={(e) =>
                          handleUpdateUserRole(
                            account.id,
                            e.target.value as 'admin' | 'leader' | 'member',
                          )
                        }
                        className='h-10 rounded-2xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'>
                        <option value='member'>member</option>
                        <option value='leader'>leader</option>
                        <option value='admin'>admin</option>
                      </select>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleDeleteUser(account.id)}>
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className='rounded-3xl border border-slate-800 bg-slate-900/70 p-6'>
            <div className='flex items-center gap-3 mb-5'>
              <ShieldCheck className='w-5 h-5 text-cyan-400' />
              <div>
                <h2 className='text-lg font-semibold text-slate-100'>Teams</h2>
                <p className='text-xs text-slate-500'>
                  Create and inspect teams, then assign or remove members.
                </p>
              </div>
            </div>
            {teamsLoading ? (
              <div className='flex items-center justify-center py-12'>
                <Loader2 className='w-6 h-6 text-indigo-500 animate-spin' />
              </div>
            ) : (
              <div className='space-y-3'>
                {teams.length === 0 ? (
                  <p className='text-sm text-slate-500'>No teams available.</p>
                ) : (
                  teams.map((team) => (
                    <button
                      key={team.id}
                      type='button'
                      onClick={() => handleTeamToggle(team.id)}
                      className={`w-full rounded-3xl border p-4 text-left transition-all ${
                        selectedTeam?.id === team.id
                          ? 'border-cyan-500/40 bg-cyan-500/10'
                          : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                      }`}>
                      <div className='flex items-center justify-between gap-3'>
                        <div>
                          <p className='font-semibold text-slate-100'>
                            {team.name}
                          </p>
                          <p className='text-xs text-slate-500'>
                            Leader: {team.leader_name}
                          </p>
                        </div>
                        <Plus className='w-4 h-4 text-slate-400' />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {selectedTeam && (
          <section className='rounded-3xl border border-slate-800 bg-slate-900/70 p-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-slate-100'>
                  {selectedTeam.name}
                </h2>
                <p className='text-xs text-slate-500'>
                  Leader: {selectedTeam.leader_name}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <span className='rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-400'>
                  Team details
                </span>
              </div>
            </div>

            <div className='mt-5 grid gap-4 md:grid-cols-[1fr_1fr]'>
              <div className='rounded-3xl border border-slate-800 bg-slate-950/80 p-4'>
                <p className='text-sm font-semibold text-slate-100 mb-3'>
                  Members
                </p>
                {selectedTeam.members.length === 0 ? (
                  <p className='text-sm text-slate-500'>No members yet.</p>
                ) : (
                  <div className='space-y-3'>
                    {selectedTeam.members.map((member) => (
                      <div
                        key={member.id}
                        className='flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3'>
                        <div>
                          <p className='font-medium text-slate-100'>
                            {member.username}
                          </p>
                          <p className='text-xs text-slate-500'>
                            {member.email}
                          </p>
                        </div>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleRemoveMember(member.id)}>
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className='rounded-3xl border border-slate-800 bg-slate-950/80 p-4'>
                <p className='text-sm font-semibold text-slate-100 mb-3'>
                  Add member
                </p>
                <select
                  value={selectedMemberToAdd ?? ''}
                  onChange={(e) =>
                    setSelectedMemberToAdd(parseInt(e.target.value, 10) || null)
                  }
                  className='h-10 w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'>
                  <option value=''>Select a user</option>
                  {users
                    .filter(
                      (account) =>
                        !selectedTeam.members.some(
                          (member) => member.id === account.id,
                        ),
                    )
                    .map((account) => (
                      <option
                        key={account.id}
                        value={account.id}>
                        {account.username} ({account.role})
                      </option>
                    ))}
                </select>
                <Button
                  className='mt-4 w-full'
                  onClick={handleAddMember}
                  disabled={saving || !selectedMemberToAdd}>
                  Add member
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
