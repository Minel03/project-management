'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { getErrorMessage } from '@/lib/get-error-message';
import { toast } from 'sonner';
import type { UserSummary, TeamSummary, TeamDetails } from '@/types/admin';

export type UserRole = 'admin' | 'leader' | 'member';

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
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
  const [newUserRole, setNewUserRole] = useState<UserRole>('member');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeader, setNewTeamLeader] = useState<number | null>(null);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState<number | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const leaderCandidates = allUsers.filter(
    (account) => account.role === 'leader',
  );

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [authLoading, user, router]);

  const loadAdminData = async (page = currentPage, search = userSearch) => {
    setError(null);
    setUsersLoading(true);
    setTeamsLoading(true);

    try {
      const searchParam = search.trim()
        ? `&search=${encodeURIComponent(search.trim())}`
        : '';
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
    } catch (err) {
      console.error('Admin data fetch failed:', err);
      const message = getErrorMessage(err, 'Unable to load admin console data.');
      setError(message);
      toast.error(message);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAdminData(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, user]);

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
    if (savingRef.current) return;
    setError(null);
    if (
      !newUserName.trim() ||
      !newUserEmail.trim() ||
      !newUserPassword.trim()
    ) {
      const message = 'Username, email, and password are required.';
      setError(message);
      toast.error(message);
      return;
    }

    try {
      savingRef.current = true;
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
        toast.success('User created successfully.');
        if (currentPage === 1) {
          loadAdminData(1);
        } else {
          setCurrentPage(1);
        }
      }
    } catch (err) {
      console.error('Create user failed:', err);
      const message = getErrorMessage(err, 'Could not create user.');
      setError(message);
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleCreateTeam = async () => {
    if (savingRef.current) return;
    setError(null);
    if (!newTeamName.trim()) {
      const message = 'Team name is required.';
      setError(message);
      toast.error(message);
      return;
    }
    if (!newTeamLeader) {
      const message =
        'Select a leader with the leader role before creating a team.';
      setError(message);
      toast.error(message);
      return;
    }

    try {
      savingRef.current = true;
      setSaving(true);
      const res = await api.post('/api/teams', {
        name: newTeamName.trim(),
        leaderId: newTeamLeader,
      });
      if (res.data.success) {
        setTeams([res.data.data, ...teams]);
        setNewTeamName('');
        setNewTeamLeader(null);
        toast.success('Team created successfully.');
      }
    } catch (err) {
      console.error('Create team failed:', err);
      const message = getErrorMessage(err, 'Could not create team.');
      setError(message);
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleOpenEditUser = (account: UserSummary) => {
    setEditingUser(account);
    setEditUsername(account.username);
    setEditEmail(account.email);
    setEditPassword('');
    setIsEditUserOpen(true);
  };

  const closeEditUserDialog = () => {
    setIsEditUserOpen(false);
    setEditingUser(null);
    setEditUsername('');
    setEditEmail('');
    setEditPassword('');
  };

  const handleSaveEditUser = async () => {
    if (!editingUser || savingRef.current) return;

    const trimmedUsername = editUsername.trim();
    const trimmedEmail = editEmail.trim();
    const trimmedPassword = editPassword.trim();

    if (!trimmedUsername) {
      toast.error('Username cannot be empty.');
      return;
    }

    if (!trimmedEmail) {
      toast.error('Email cannot be empty.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    const usernameChanged = trimmedUsername !== editingUser.username;
    const emailChanged = trimmedEmail !== editingUser.email;
    if (!usernameChanged && !emailChanged && !trimmedPassword) {
      toast.error('No changes to save.');
      return;
    }

    const payload: { username: string; email: string; password?: string } = {
      username: trimmedUsername,
      email: trimmedEmail,
    };
    if (trimmedPassword) {
      payload.password = trimmedPassword;
    }

    try {
      savingRef.current = true;
      setSaving(true);
      const res = await api.patch(`/api/users/${editingUser.id}`, payload);
      if (res.data.success) {
        toast.success('User updated.');
        closeEditUserDialog();
        loadAdminData(currentPage);
        if (selectedTeam) {
          setSelectedTeam((prev) =>
            prev
              ? {
                  ...prev,
                  members: prev.members.map((member) =>
                    member.id === editingUser.id
                      ? {
                          ...member,
                          username: res.data.data.username,
                          email: res.data.data.email,
                        }
                      : member,
                  ),
                }
              : prev,
          );
        }
      }
    } catch (err) {
      console.error('Update user failed:', err);
      const message = getErrorMessage(err, 'Unable to update user.');
      setError(message);
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleUpdateUserRole = async (userId: number, role: UserRole) => {
    if (savingRef.current) return;
    try {
      savingRef.current = true;
      setSaving(true);
      const res = await api.patch(`/api/users/${userId}/role`, { role });
      if (res.data.success) {
        toast.success('User role updated.');
        loadAdminData(currentPage);
      }
    } catch (err) {
      console.error('Update role failed:', err);
      const message = getErrorMessage(err, 'Unable to update user role.');
      setError(message);
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (savingRef.current) return;
    if (!confirm('Delete this user permanently?')) {
      return;
    }

    try {
      savingRef.current = true;
      setSaving(true);
      await api.delete(`/api/users/${userId}`);
      toast.success('User deleted.');
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
    } catch (err) {
      console.error('Delete user failed:', err);
      const message = getErrorMessage(err, 'Unable to delete user.');
      setError(message);
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (savingRef.current) return;
    if (!selectedTeam || !selectedMemberToAdd) {
      const message = 'Select a user to add to the team.';
      setError(message);
      toast.error(message);
      return;
    }

    try {
      savingRef.current = true;
      setSaving(true);
      await api.post(`/api/teams/${selectedTeam.id}/members`, {
        userId: selectedMemberToAdd,
      });
      await loadTeamDetails(selectedTeam.id);
      setSelectedMemberToAdd(null);
      toast.success('Member added to team.');
    } catch (err) {
      console.error('Add member failed:', err);
      const message = getErrorMessage(err, 'Unable to add member.');
      setError(message);
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedTeam || savingRef.current) return;
    try {
      savingRef.current = true;
      setSaving(true);
      await api.delete(`/api/teams/${selectedTeam.id}/members/${memberId}`);
      await loadTeamDetails(selectedTeam.id);
      toast.success('Member removed from team.');
    } catch (err) {
      console.error('Remove member failed:', err);
      const message = getErrorMessage(err, 'Unable to remove member.');
      setError(message);
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return {
    user,
    authLoading,
    users,
    allUsers,
    currentPage,
    setCurrentPage,
    totalPages,
    totalUsers,
    usersLimit,
    teams,
    selectedTeam,
    usersLoading,
    teamsLoading,
    error,
    userSearch,
    leaderCandidates,
    newUserName,
    setNewUserName,
    newUserEmail,
    setNewUserEmail,
    newUserPassword,
    setNewUserPassword,
    newUserRole,
    setNewUserRole,
    newTeamName,
    setNewTeamName,
    newTeamLeader,
    setNewTeamLeader,
    selectedMemberToAdd,
    setSelectedMemberToAdd,
    saving,
    isEditUserOpen,
    editingUser,
    editUsername,
    setEditUsername,
    editEmail,
    setEditEmail,
    editPassword,
    setEditPassword,
    handleUserSearch,
    handleTeamToggle,
    handleCreateUser,
    handleCreateTeam,
    handleOpenEditUser,
    closeEditUserDialog,
    handleSaveEditUser,
    handleUpdateUserRole,
    handleDeleteUser,
    handleAddMember,
    handleRemoveMember,
  };
}
