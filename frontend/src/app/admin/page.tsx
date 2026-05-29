'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInitials } from '@/lib/utils';
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Users,
  FolderPlus,
  Plus,
  Search,
  Trash2,
  Sun,
  Moon,
  Monitor,
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
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [allUsers, setAllUsers] = useState<UserSummary[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersLimit] = useState(5);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetails | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

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
    }
  }, [authLoading, user, router]);

  const leaderCandidates = allUsers.filter((account) => account.role === 'leader');

  const loadAdminData = async (page = currentPage, search = userSearch) => {
    setError(null);
    setUsersLoading(true);
    setTeamsLoading(true);

    try {
      const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
      const [usersRes, paginatedUsersRes, teamsRes] = await Promise.all([
        api.get('/api/users'),
        api.get(`/api/users?page=${page}&limit=${usersLimit}${searchParam}`),
        api.get('/api/teams'),
      ]);

      if (usersRes.data.success) {
        setAllUsers(usersRes.data.data || []);
      }

      if (paginatedUsersRes.data.success) {
        setUsers(paginatedUsersRes.data.data || []);
        if (paginatedUsersRes.data.pagination) {
          setTotalPages(paginatedUsersRes.data.pagination.totalPages || 1);
          setTotalUsers(paginatedUsersRes.data.pagination.total || 0);
        } else {
          setTotalPages(1);
          setTotalUsers(paginatedUsersRes.data.data?.length || 0);
        }
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

  const handleUserSearch = (value: string) => {
    setUserSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      loadAdminData(1, value);
    }, 350);
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAdminData(currentPage);
    }
  }, [currentPage]);

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
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('member');
        if (currentPage === 1) {
          loadAdminData(1);
        } else {
          setCurrentPage(1);
        }
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
        loadAdminData(currentPage);
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
      const newTotal = totalUsers - 1;
      const newTotalPages = Math.ceil(newTotal / usersLimit) || 1;
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      } else {
        loadAdminData(currentPage);
      }
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
      <div className='min-h-screen flex items-center justify-center bg-background text-foreground'>
        <Loader2 className='w-8 h-8 text-indigo-500 animate-spin' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200'>
      <header className='sticky top-0 z-20 shrink-0 border-b border-border bg-card/85 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4 transition-colors duration-200'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.push('/')}
            className='text-muted-foreground hover:text-foreground cursor-pointer'>
            <ArrowLeft className='w-4 h-4' />
          </Button>
          <div>
            <h1 className='text-base font-bold tracking-tight text-foreground'>
              Admin Console
            </h1>
            <p className='text-[10px] text-muted-foreground'>
              Manage system users, teams, and access levels.
            </p>
          </div>
        </div>

        <button
          onClick={cycleTheme}
          className='py-1.5 px-3 rounded-lg border border-border hover:border-indigo-500/30 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 bg-background/50 hover:bg-muted transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer'
          title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to toggle)`}>
          {theme === 'light' && <Sun className='w-3.5 h-3.5' />}
          {theme === 'dark' && <Moon className='w-3.5 h-3.5' />}
          {theme === 'system' && <Monitor className='w-3.5 h-3.5' />}
          <span className='hidden sm:inline font-sans capitalize'>
            {theme === 'system' ? 'System Theme' : `${theme} Mode`}
          </span>
        </button>
      </header>

      <main className='flex-1 max-w-4xl w-full mx-auto p-6 space-y-6'>
        {error && (
          <div className='rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200'>
            {error}
          </div>
        )}

        <section className='grid gap-6'>
          <div className='rounded-3xl border border-border bg-card/70 p-6 transition-colors'>
            <div className='flex items-center gap-3 mb-5'>
              <ShieldCheck className='w-5 h-5 text-emerald-400' />
              <div>
                <h2 className='text-lg font-semibold text-foreground'>
                  Create a new user
                </h2>
                <p className='text-xs text-muted-foreground'>
                  Admins can create system users and assign roles.
                </p>
              </div>
            </div>

            <div className='grid gap-4'>
              <label className='grid gap-2 text-sm text-foreground'>
                <span>Username</span>
                <input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className='rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  placeholder='john_doe'
                />
              </label>
              <label className='grid gap-2 text-sm text-foreground'>
                <span>Email</span>
                <input
                  type='email'
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className='rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  placeholder='john@example.com'
                />
              </label>
              <label className='grid gap-2 text-sm text-foreground'>
                <span>Password</span>
                <input
                  type='password'
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className='rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  placeholder='Create a password'
                />
              </label>
              <label className='grid gap-2 text-sm text-foreground'>
                <span>Role</span>
                <select
                  value={newUserRole}
                  onChange={(e) =>
                    setNewUserRole(
                      e.target.value as 'admin' | 'leader' | 'member',
                    )
                  }
                  className='h-10 rounded-2xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'>
                  <option value='member'>Member</option>
                  <option value='leader'>Leader</option>
                  <option value='admin'>Admin</option>
                </select>
              </label>
              <div className='flex justify-end'>
                <Button
                  onClick={handleCreateUser}
                  disabled={saving}
                  className='cursor-pointer'>
                  <Plus className='mr-2 h-4 w-4' /> Create User
                </Button>
              </div>
            </div>
          </div>

          <div className='rounded-3xl border border-border bg-card/70 p-6 transition-colors'>
            <div className='flex items-center gap-3 mb-5'>
              <FolderPlus className='w-5 h-5 text-cyan-400' />
              <div>
                <h2 className='text-lg font-semibold text-foreground'>
                  Create a new team
                </h2>
                <p className='text-xs text-muted-foreground'>
                  Select a leader and initialize membership for a team.
                </p>
              </div>
            </div>

            <div className='grid gap-4'>
              <label className='grid gap-2 text-sm text-foreground'>
                <span>Team name</span>
                <input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className='rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  placeholder='Alpha Squad'
                />
              </label>
              <label className='grid gap-2 text-sm text-foreground'>
                <span>Team leader</span>
                <select
                  value={newTeamLeader ?? ''}
                  onChange={(e) =>
                    setNewTeamLeader(parseInt(e.target.value, 10))
                  }
                  className='h-10 rounded-2xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'>
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
                  disabled={saving}
                  className='cursor-pointer'>
                  <Plus className='mr-2 h-4 w-4' /> Create Team
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className='grid gap-6'>
          <div className='rounded-3xl border border-border bg-card/70 p-6 transition-colors'>
            <div className='flex items-center gap-3 mb-5'>
              <Users className='w-5 h-5 text-violet-400' />
              <div>
                <h2 className='text-lg font-semibold text-foreground'>
                  System users
                </h2>
                <p className='text-xs text-muted-foreground'>
                  All accounts in the system with current roles.
                </p>
              </div>
            </div>
            {/* Search bar */}
            <div className='relative mb-4'>
              <Search className='absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none' />
              <Input
                type='text'
                placeholder='Search by username or email...'
                value={userSearch}
                onChange={(e) => handleUserSearch(e.target.value)}
                className='pl-9 rounded-2xl border-input bg-background focus:border-indigo-500 focus:ring-indigo-500 text-xs text-foreground'
              />
            </div>

            {usersLoading ? (
              <div className='flex items-center justify-center py-12'>
                <Loader2 className='w-6 h-6 text-indigo-500 animate-spin' />
              </div>
            ) : (
              <div>
                <div className='space-y-3'>
                  {users.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>
                      {userSearch.trim() ? `No users matching "${userSearch.trim()}"` : 'No users found.'}
                    </p>
                  ) : (
                    users.map((account) => (
                      <div
                        key={account.id}
                        className='grid gap-3 rounded-3xl border border-border bg-background/60 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center'>
                        <div>
                          <p className='font-semibold text-foreground'>
                            {account.username}
                          </p>
                          <p className='text-xs text-muted-foreground'>
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
                          className='h-10 rounded-2xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'>
                          <option value='member'>member</option>
                          <option value='leader'>leader</option>
                          <option value='admin'>admin</option>
                        </select>
                        <Button
                          className='cursor-pointer hover:text-red-500'
                          variant='ghost'
                          size='sm'
                          onClick={() => handleDeleteUser(account.id)}>
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination Controls */}
                {!usersLoading && totalPages > 1 && (
                  <div className='flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border'>
                    <p className='text-xs text-muted-foreground'>
                      Showing <span className='font-semibold text-foreground/80'>{(currentPage - 1) * usersLimit + 1}</span> to{' '}
                      <span className='font-semibold text-foreground/80'>
                        {Math.min(currentPage * usersLimit, totalUsers)}
                      </span> of{' '}
                      <span className='font-semibold text-foreground/80'>{totalUsers}</span> users
                    </p>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className='rounded-xl border-border bg-background text-foreground hover:bg-muted cursor-pointer disabled:opacity-50 disabled:pointer-events-none'>
                        Previous
                      </Button>
                      <div className='flex items-center gap-1'>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              currentPage === page
                                ? 'bg-indigo-600 text-white'
                                : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}>
                            {page}
                          </button>
                        ))}
                      </div>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className='rounded-xl border-border bg-background text-foreground hover:bg-muted cursor-pointer disabled:opacity-50 disabled:pointer-events-none'>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className='rounded-3xl border border-border bg-card/70 p-6 transition-colors'>
            <div className='flex items-center gap-3 mb-5'>
              <ShieldCheck className='w-5 h-5 text-cyan-400' />
              <div>
                <h2 className='text-lg font-semibold text-foreground'>Teams</h2>
                <p className='text-xs text-muted-foreground'>
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
                  <p className='text-sm text-muted-foreground'>No teams available.</p>
                ) : (
                  teams.map((team) => (
                    <button
                      key={team.id}
                      type='button'
                      onClick={() => handleTeamToggle(team.id)}
                      className={`w-full rounded-3xl border p-4 text-left transition-all cursor-pointer ${
                        selectedTeam?.id === team.id
                          ? 'border-cyan-500/40 bg-cyan-500/10'
                          : 'border-border bg-background/50 hover:border-foreground/15'
                      }`}>
                      <div className='flex items-center justify-between gap-3'>
                        <div>
                          <p className='font-semibold text-foreground'>
                            {team.name}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            Leader: {team.leader_name}
                          </p>
                        </div>
                        <Plus className='w-4 h-4 text-muted-foreground' />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {selectedTeam && (
          <section className='rounded-3xl border border-border bg-card/70 p-6 transition-colors'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-foreground'>
                  {selectedTeam.name}
                </h2>
                <p className='text-xs text-muted-foreground'>
                  Leader: {selectedTeam.leader_name}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <span className='rounded-full bg-muted px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground'>
                  Team Details
                </span>
              </div>
            </div>

            <div className='mt-5 grid gap-4 md:grid-cols-[1fr_1fr]'>
              <div className='rounded-3xl border border-border bg-background/80 p-4'>
                <p className='text-sm font-semibold text-foreground mb-3'>
                  Members
                </p>
                {selectedTeam.members.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>No members yet.</p>
                ) : (
                  <div className='space-y-3'>
                    {selectedTeam.members.map((member) => (
                      <div
                        key={member.id}
                        className='flex items-center justify-between rounded-2xl border border-border bg-card/80 px-4 py-3'>
                        <div>
                          <p className='font-medium text-foreground'>
                            {member.username}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {member.email}
                          </p>
                        </div>
                        <Button
                          className='cursor-pointer hover:text-red-500'
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

              <div className='rounded-3xl border border-border bg-background/80 p-4'>
                <p className='text-sm font-semibold text-foreground mb-3'>
                  Add member
                </p>
                <select
                  value={selectedMemberToAdd ?? ''}
                  onChange={(e) =>
                    setSelectedMemberToAdd(parseInt(e.target.value, 10) || null)
                  }
                  className='h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'>
                  <option value=''>Select a user</option>
                  {allUsers
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
                  className='mt-4 w-full cursor-pointer'
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
