'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { adminApi, User } from '../../../../lib/apiClient';
import { useRequireAuth } from '../../../../lib/authContext';
import { Search, Edit, Plus } from 'lucide-react';

interface UserWithStats extends User {
  scan_count?: number;
  report_count?: number;
  last_active?: string;
}

const USERS_PER_PAGE = 20;

export default function AdminUsersPage() {
  useRequireAuth('ADMIN');
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'DOCTOR' as User['role'],
  });

  const totalPages = Math.max(1, Math.ceil(totalUsers / USERS_PER_PAGE));

  const fetchUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.listUsers({
        query: appliedSearch || undefined,
        role: selectedRole !== 'ALL' ? selectedRole : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        limit: USERS_PER_PAGE,
        offset: (currentPage - 1) * USERS_PER_PAGE,
      });
      setUsers(response.users);
      setTotalUsers(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, selectedRole, selectedStatus, currentPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await adminApi.updateUser(userId, updates);
      await fetchUsers();
      setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateUser = async () => {
    try {
      await adminApi.createUser(newUser);
      setShowCreateModal(false);
      setNewUser({ email: '', password: '', full_name: '', role: 'DOCTOR' });
      setCurrentPage(1);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    setAppliedSearch(searchQuery.trim());
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive';
      case 'DOCTOR': return 'default';
      case 'PATIENT': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default';
      case 'DISABLED': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading && users.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <Button variant="outline" onClick={handleSearch}>Search</Button>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="DOCTOR">Doctor</option>
              <option value="PATIENT">Patient</option>
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users ({totalUsers})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Joined</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-gray-500 text-xs">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusBadgeVariant(user.status || 'ACTIVE')}>
                        {user.status || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {user.status === 'DISABLED' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateUser(user.id, { status: 'ACTIVE' })}
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateUser(user.id, { status: 'DISABLED' })}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages} ({USERS_PER_PAGE} per page)
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit User: {editingUser.full_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    defaultValue={editingUser.role}
                    onChange={(e) => {
                      setEditingUser({ ...editingUser, role: e.target.value as User['role'] });
                    }}
                  >
                    <option value="PATIENT">Patient</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    defaultValue={editingUser.status || 'ACTIVE'}
                    onChange={(e) => {
                      setEditingUser({
                        ...editingUser,
                        status: e.target.value as 'ACTIVE' | 'DISABLED',
                      });
                    }}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button
                  onClick={() => handleUpdateUser(editingUser.id, {
                    role: editingUser.role,
                    status: editingUser.status,
                  })}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as User['role'] })}
                  >
                    <option value="PATIENT">Patient</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={handleCreateUser}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
