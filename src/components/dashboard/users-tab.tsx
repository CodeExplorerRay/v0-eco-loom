'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DashboardHeroActionButton,
  DashboardHeroCard,
} from '@/components/dashboard/dashboard-hero-card';
import {
  Dialog,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DashboardDialogBody,
  DashboardDialogContentShell,
  DashboardDialogIntro,
} from '@/components/dashboard/dashboard-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, KeyRound, Loader2, Plus, ShieldCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import type { AuditCenterRequest, ManagedUser, UserRole } from '@/lib/types';
import {
  USER_CREATION_LOCK_MESSAGE,
  USER_CREATION_LOCKED,
  USER_NAME_CHANGE_LOCK_MESSAGE,
  USER_NAME_CHANGE_LOCKED,
  USER_ROLE_AND_STATUS_LOCK_MESSAGE,
  USER_ROLE_AND_STATUS_LOCKED,
} from '@/lib/user-management';

type CreateUserResponse = {
  user: ManagedUser;
  generatedAccessToken: string;
};

type UpdateUserResponse = {
  user: ManagedUser;
  generatedAccessToken: string | null;
};

function getRoleBadge(role: UserRole) {
  return role === 'admin' ? (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      Admin
    </Badge>
  ) : (
    <Badge variant="outline">Standard</Badge>
  );
}

function getStatusBadge(status: string) {
  return status === 'active' ? (
    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
      Active
    </Badge>
  ) : (
    <Badge variant="secondary">Inactive</Badge>
  );
}

function isAccessProtectedUser(user: ManagedUser | null) {
  return Boolean(user?.demoProtected);
}

interface UsersTabProps {
  onOpenAuditCenter?: (filters: AuditCenterRequest['filters'], title?: string) => void;
}

export function UsersTab({ onOpenAuditCenter }: UsersTabProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenOwnerLabel, setTokenOwnerLabel] = useState<string>('');
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: 'standard' as UserRole,
  });
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'standard' as UserRole,
    status: 'active',
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      setUsers(await response.json());
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const copyToken = async () => {
    if (!generatedToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedToken);
      toast.success('Access token copied');
    } catch (error) {
      console.error('Error copying token:', error);
      toast.error('Failed to copy token');
    }
  };

  const handleCreateUser = async () => {
    if (USER_CREATION_LOCKED) {
      toast.info(USER_CREATION_LOCK_MESSAGE);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const result = (await response.json()) as CreateUserResponse & { error?: string };
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      setUsers((prev) => [...prev, result.user].sort((a, b) => a.name.localeCompare(b.name)));
      setGeneratedToken(result.generatedAccessToken);
      setTokenOwnerLabel(result.user.email);
      setCreateForm({ name: '', email: '', role: 'standard' });
      setIsCreateDialogOpen(false);
      toast.success('User created');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (user: ManagedUser) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      role: user.role,
      status: user.status,
    });
  };

  const handleUpdateUser = async (rotateAccessToken: boolean) => {
    if (!selectedUser) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          rotateAccessToken,
        }),
      });

      const result = (await response.json()) as UpdateUserResponse & { error?: string };
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      setUsers((prev) => prev.map((user) => (user.id === result.user.id ? result.user : user)));
      if (result.generatedAccessToken) {
        setGeneratedToken(result.generatedAccessToken);
        setTokenOwnerLabel(result.user.email);
      }
      setSelectedUser(null);
      toast.success(rotateAccessToken ? 'Access token rotated' : 'User updated');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedUserAccessProtected = isAccessProtectedUser(selectedUser);
  const accessControlLocked = USER_ROLE_AND_STATUS_LOCKED;
  const nameChangeLocked = USER_NAME_CHANGE_LOCKED;
  const saveDisabled = isSaving || (nameChangeLocked && accessControlLocked);

  return (
    <div className="space-y-6">
      <DashboardHeroCard
        title="User Access Control"
        description="Review workspace access, keep account protections stable, and manage the profile or token controls that remain unlocked in this environment."
        icon={<UserCog className="h-8 w-8" />}
        gradientClassName="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500"
        eyebrow="Workspace Permissions"
        eyebrowIcon={<ShieldCheck className="h-3.5 w-3.5" />}
        aside={
          <DashboardHeroActionButton
            tone="secondary"
            className="gap-2"
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={USER_CREATION_LOCKED}
          >
            <Plus className="h-4 w-4" />
            User Creation Locked
          </DashboardHeroActionButton>
        }
      />

      <Card className="border-emerald-100 bg-white/90 shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-emerald-600" />
              Workspace Users
            </CardTitle>
            <CardDescription>
              Review active accounts, keep locked access controls visible, and rotate tokens when needed.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
            <p className="text-sm font-medium text-sky-900">Demo workspace protections are active</p>
            <p className="mt-1 text-sm text-sky-800/80">
              Adding users is locked, and role or status changes are disabled so the Eco-Loom
              workspace stays stable.
            </p>
          </div>

          {generatedToken && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    New access token for {tokenOwnerLabel}
                  </p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    Copy this now. It will not be shown again after you close or rotate it.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyToken}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setGeneratedToken(null)}>
                    Dismiss
                  </Button>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-white/80 px-4 py-3 font-mono text-sm text-slate-900 shadow-sm dark:bg-slate-950/70 dark:text-slate-100">
                {generatedToken}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading users...
            </div>
          ) : (
            <div className="rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.demoProtected && (
                            <p className="mt-1 text-xs font-medium text-sky-700">
                              Demo account protection enabled
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(user)}>
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-emerald-100 bg-emerald-50/70">
              <CardContent className="flex items-start gap-3 p-5">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div>
                  <p className="font-medium">Admins</p>
                  <p className="text-sm text-muted-foreground">
                    Can manage users, verify or delete ledger records, publish reports, and change Notion settings.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50/80">
              <CardContent className="flex items-start gap-3 p-5">
                <UserCog className="mt-0.5 h-5 w-5 text-slate-700" />
                <div>
                  <p className="font-medium">Standard users</p>
                  <p className="text-sm text-muted-foreground">
                    Can work inside the dashboard and edit only their own unverified ledger entries.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/70">
              <CardContent className="flex items-start gap-3 p-5">
                <KeyRound className="mt-0.5 h-5 w-5 text-amber-700" />
                <div>
                  <p className="font-medium">Token rotation</p>
                  <p className="text-sm text-muted-foreground">
                    Rotate tokens any time. New tokens are shown once and should be delivered securely.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DashboardDialogContentShell size="lg">
          <DashboardDialogIntro
            badge="Access setup"
            title="Add User"
            description={USER_CREATION_LOCK_MESSAGE}
          />
          <DashboardDialogBody className="grid gap-4">
            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
              <p className="text-sm font-medium text-sky-900">Creation locked</p>
              <p className="mt-1 text-sm text-sky-800/80">
                Reuse the protected workspace accounts for now. Creating new users is disabled in
                this environment.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                value={createForm.name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Jane Doe"
                disabled={USER_CREATION_LOCKED}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="jane@company.com"
                disabled={USER_CREATION_LOCKED}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(value: UserRole) => setCreateForm((prev) => ({ ...prev, role: value }))}
                disabled={USER_CREATION_LOCKED}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DashboardDialogBody>
          <DialogFooter className="border-t border-emerald-100 px-6 pt-5 pb-6 sm:px-7 sm:pb-7">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isSaving || USER_CREATION_LOCKED} onClick={handleCreateUser}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create User
            </Button>
          </DialogFooter>
        </DashboardDialogContentShell>
      </Dialog>

      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DashboardDialogContentShell size="xl">
          <DashboardDialogIntro
            badge="Workspace access"
            title="Manage User"
            description="Review this workspace user, update profile details where allowed, and manage security actions that remain unlocked."
          />
          {selectedUser ? (
            <DashboardDialogBody className="grid gap-6">
              {selectedUser && onOpenAuditCenter && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenAuditCenter(
                        {
                          feature: 'users',
                          entityType: 'user',
                          entityId: selectedUser.id,
                        },
                        selectedUser.email
                      );
                      setSelectedUser(null);
                    }}
                  >
                    Open in Audit Center
                  </Button>
                </div>
              )}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Workspace identity</p>
                    <p className="text-lg font-semibold">{selectedUser.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(editForm.role)}
                    {getStatusBadge(editForm.status)}
                  </div>
                </div>
              </div>

              {selectedUserAccessProtected && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
                  <p className="text-sm font-medium text-sky-900">Protected demo account</p>
                  <p className="mt-1 text-sm text-sky-800/80">
                    Role, status, and access token rotation are locked for this seeded demo user
                    so the workspace stays stable during demos.
                  </p>
                </div>
              )}

              <div className="grid gap-4 rounded-2xl border p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Profile</p>
                  <p className="text-sm text-muted-foreground">
                    The display name is visible here for review, but profile naming is locked in this environment.
                  </p>
                  {nameChangeLocked && (
                    <p className="text-sm text-sky-700">
                      {USER_NAME_CHANGE_LOCK_MESSAGE}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manage-user-name">Name</Label>
                  <Input
                    id="manage-user-name"
                    value={editForm.name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                    disabled={nameChangeLocked}
                  />
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl border p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Access Control</p>
                  <p className="text-sm text-muted-foreground">
                    Role and workspace status are visible here for review, but both controls are
                    locked in this environment.
                  </p>
                  {accessControlLocked && (
                    <p className="text-sm text-sky-700">
                      {USER_ROLE_AND_STATUS_LOCK_MESSAGE}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={editForm.role}
                      onValueChange={(value: UserRole) => setEditForm((prev) => ({ ...prev, role: value }))}
                      disabled={selectedUserAccessProtected || accessControlLocked}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        {selectedUser?.role === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
                      disabled={selectedUserAccessProtected || accessControlLocked}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-900">Security</p>
                    <p className="text-sm text-amber-800/80">
                      Rotate this user&apos;s access token if credentials need to be re-issued or invalidated.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => selectedUser && handleUpdateUser(true)}
                    disabled={selectedUserAccessProtected}
                  >
                    Rotate Token
                  </Button>
                </div>
              </div>
            </DashboardDialogBody>
          ) : null}
          <DialogFooter className="flex-col gap-2 border-t border-emerald-100 px-6 pt-5 pb-6 sm:flex-row sm:justify-end sm:px-7 sm:pb-7">
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button disabled={saveDisabled} onClick={() => handleUpdateUser(false)}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DashboardDialogContentShell>
      </Dialog>
    </div>
  );
}
