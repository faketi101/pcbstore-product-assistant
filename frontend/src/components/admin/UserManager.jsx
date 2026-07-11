import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { AuthContext } from "../../context/AuthContext";
import userService from "../../services/userService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyForm = {
  name: "",
  email: "",
  role: "user",
  password: "",
  isActive: true,
  joinedAt: new Date().toISOString().split("T")[0],
};

const roleLabel = (role = "user") =>
  role
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const UserManager = ({ onUsersChange }) => {
  const { user: currentUser, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(["user", "admin"]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const currentUserId = String(currentUser?.id || currentUser?._id || "");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setUsers(data.users || []);
      setRoles(data.roles?.length ? data.roles : ["user", "admin"]);
      onUsersChange?.(data.users || []);
    } catch (error) {
      toast.error(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [onUsersChange]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.name, user.email, roleLabel(user.role), user.role].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [query, users]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
      isActive: user.isActive !== false,
      joinedAt: new Date(user.joinedAt || user.createdAt)
        .toISOString()
        .split("T")[0],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setIsModalOpen(false);
  };
  const isSelf = editingUser?._id === currentUserId;
  const isAnotherAdmin = editingUser?.role === "admin" && !isSelf;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const previousRole = editingUser?.role;

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        isActive: form.isActive,
        joinedAt: form.joinedAt,
      };
      if (form.password) payload.password = form.password;

      if (editingUser) {
        await userService.updateUser(editingUser._id, payload);
        toast.success("User updated successfully");
      } else {
        await userService.createUser(payload);
        toast.success("User created successfully");
      }

      closeModal();

      if (isSelf && previousRole === "admin" && form.role !== "admin") {
        logout();
        return;
      }

      await loadUsers();
    } catch (error) {
      toast.error(error.message || "Could not save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (target) => {
    if (
      !window.confirm(
        `Delete ${target.name}? Their reports and account data will be permanently removed.`,
      )
    ) {
      return;
    }

    try {
      await userService.deleteUser(target._id);
      toast.success("User deleted successfully");
      await loadUsers();
    } catch (error) {
      toast.error(error.message || "Could not delete user");
    }
  };

  const activeCount = users.filter((user) => user.isActive !== false).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create accounts and assign access based on team roles.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total users", value: users.length, icon: Users },
          { label: "Active users", value: activeCount, icon: KeyRound },
          { label: "Inactive users", value: inactiveCount, icon: ShieldCheck },
        ].map((stat) => {
          const StatIcon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <StatIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold leading-none">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {stat.label}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users, emails, or roles..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="py-14 text-center text-muted-foreground">
          <Users className="h-9 w-9 mx-auto mb-3 opacity-50" />
          <p>{query ? "No users match your search." : "No users found."}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredUsers.map((managedUser) => {
            const isCurrent = managedUser._id === currentUserId;
            const protectedAdmin = managedUser.role === "admin";
            return (
              <Card key={managedUser._id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                    {initials(managedUser.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{managedUser.name}</p>
                      {isCurrent && <Badge variant="outline">You</Badge>}
                      <Badge
                        variant={
                          managedUser.role === "admin" ? "default" : "secondary"
                        }
                      >
                        {roleLabel(managedUser.role)}
                      </Badge>
                      <Badge
                        variant={
                          managedUser.isActive === false ? "destructive" : "success"
                        }
                      >
                        {managedUser.isActive === false ? "Inactive" : "Active"}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5 min-w-0">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{managedUser.email}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Joined{" "}
                        {new Date(
                          managedUser.joinedAt || managedUser.createdAt,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(managedUser)}
                      aria-label={`Edit ${managedUser.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(managedUser)}
                      disabled={isCurrent || protectedAdmin}
                      title={
                        protectedAdmin
                          ? "Administrator accounts cannot be deleted by another admin"
                          : isCurrent
                            ? "You cannot delete your own account"
                            : "Delete user"
                      }
                      aria-label={`Delete ${managedUser.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) closeModal();
          }}
        >
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    {editingUser ? "Edit User" : "Create User"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editingUser
                      ? "Update account details or assign a new role."
                      : "Add a new account for a team member."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {isAnotherAdmin && (
                <div className="rounded-lg border bg-muted/50 p-3 flex gap-2.5 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p>
                    This administrator&apos;s permissions, status, and password are
                    protected. You can still correct their profile details.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-name">Name</Label>
                  <Input
                    id="user-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, name: event.target.value }))
                    }
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-role">Role / permission</Label>
                  <select
                    id="user-role"
                    value={form.role}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, role: event.target.value }))
                    }
                    disabled={isAnotherAdmin}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-joined-at">Joined date</Label>
                  <Input
                    id="user-joined-at"
                    type="date"
                    value={form.joinedAt}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        joinedAt: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-status">Account status</Label>
                  <select
                    id="user-status"
                    value={form.isActive ? "active" : "inactive"}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        isActive: event.target.value === "active",
                      }))
                    }
                    disabled={isAnotherAdmin || isSelf}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  {(isAnotherAdmin || isSelf) && (
                    <p className="text-xs text-muted-foreground">
                      Administrator account status is protected.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, email: event.target.value }))
                  }
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-password">
                  {editingUser ? "New password" : "Temporary password"}
                </Label>
                <Input
                  id="user-password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      password: event.target.value,
                    }))
                  }
                  placeholder={
                    editingUser ? "Leave blank to keep current password" : "6+ characters"
                  }
                  autoComplete="new-password"
                  minLength={6}
                  required={!editingUser}
                  disabled={isAnotherAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  {editingUser
                    ? "Only enter a value when you need to reset this password."
                    : "The user can change this after signing in."}
                </p>
              </div>

              {isSelf && form.role !== "admin" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Saving will remove your admin access and sign you out. At least
                  one other administrator must remain.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  {editingUser ? "Save Changes" : "Create User"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManager;
