import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X, Plus, Link as LinkIcon, Save, Info } from "lucide-react";

const TaskFormModal = ({
  task = null,
  onSave,
  onClose,
  isAdmin = false,
  users = [],
  loading = false,
}) => {
  // When editing, non-admin users can only partially edit
  const isPartialEdit = !!task && !isAdmin;
  const [formData, setFormData] = useState(() => ({
    title: task?.title || "",
    description: task?.description || "",
    startDate: task?.startDate
      ? new Date(task.startDate).toISOString().split("T")[0]
      : "",
    dueDate: task?.dueDate
      ? new Date(task.dueDate).toISOString().split("T")[0]
      : "",
    links: task?.links || [],
    totalTaskCount: task?.totalTaskCount || 1,
    totalCompletedTask: task?.totalCompletedTask || 0,
    status: task?.status || "Not Started",
    assignedTo: task?.assignedTo?.map((u) => u._id || u) || [],
  }));

  const [newLink, setNewLink] = useState({ url: "", label: "" });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!formData.startDate) {
      alert("Start date is required");
      return;
    }
    if (!formData.dueDate) {
      alert("Due date is required");
      return;
    }
    if (formData.totalCompletedTask > formData.totalTaskCount) {
      alert("Completed tasks cannot exceed total tasks");
      return;
    }

    // Check if non-admin is trying to set status to Completed
    if (
      !isAdmin &&
      formData.status === "Completed" &&
      task?.status !== "Completed"
    ) {
      alert("Only admins can mark tasks as completed");
      return;
    }

    onSave(formData);
  };

  const handleAddLink = () => {
    if (newLink.url.trim()) {
      setFormData({
        ...formData,
        links: [...formData.links, { ...newLink }],
      });
      setNewLink({ url: "", label: "" });
    }
  };

  const handleRemoveLink = (index) => {
    setFormData({
      ...formData,
      links: formData.links.filter((_, i) => i !== index),
    });
  };

  const handleUserToggle = (userId) => {
    setFormData((prev) => {
      const currentUsers = prev.assignedTo || [];
      const newUsers = currentUsers.includes(userId)
        ? currentUsers.filter((u) => u !== userId)
        : [...currentUsers, userId];
      return { ...prev, assignedTo: newUsers };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {task ? "Edit Task" : "Create New Task"}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Partial Edit Notice */}
            {isPartialEdit && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-muted/60 border border-border">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You can edit{" "}
                  <span className="font-medium text-foreground">
                    description
                  </span>
                  ,{" "}
                  <span className="font-medium text-foreground">progress</span>,{" "}
                  <span className="font-medium text-foreground">status</span>,
                  and <span className="font-medium text-foreground">links</span>
                  . Other fields are managed by admin.
                </p>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Task Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter task title"
                required
                disabled={isPartialEdit}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter task description"
                rows={6}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-y min-h-[120px]"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                  disabled={isPartialEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">
                  Due Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  required
                  disabled={isPartialEdit}
                />
              </div>
            </div>

            {/* Task Counts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalTaskCount">Total Tasks</Label>
                <Input
                  id="totalTaskCount"
                  type="number"
                  min="1"
                  value={formData.totalTaskCount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalTaskCount: parseInt(e.target.value) || 1,
                    })
                  }
                  disabled={isPartialEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalCompletedTask">Completed Tasks</Label>
                <Input
                  id="totalCompletedTask"
                  type="number"
                  min="0"
                  max={formData.totalTaskCount}
                  value={formData.totalCompletedTask}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalCompletedTask: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                disabled={!isAdmin && task?.status === "Completed"}
              >
                <option value="Not Started">Not Started</option>
                <option value="Running">Running</option>
                <option value="On Hold">On Hold</option>
                {isAdmin ? (
                  <option value="Completed">Completed</option>
                ) : (
                  task?.status === "Completed" && (
                    <option value="Completed">Completed</option>
                  )
                )}
              </select>
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Only admins can mark tasks as completed
                </p>
              )}
            </div>

            {/* Links */}
            <div className="space-y-2">
              <Label>Links</Label>
              <div className="space-y-2">
                {formData.links.map((link, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-center p-2 bg-muted rounded-md"
                  >
                    <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {link.label || "No label"}
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate block"
                      >
                        {link.url}
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLink(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Input
                    placeholder="URL"
                    value={newLink.url}
                    onChange={(e) =>
                      setNewLink({ ...newLink, url: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Label (optional)"
                    value={newLink.label}
                    onChange={(e) =>
                      setNewLink({ ...newLink, label: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddLink}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Assigned Users (Admin Only) */}
            {isAdmin && users.length > 0 && (
              <div className="space-y-2">
                <Label>Assign To</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
                  {users.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleUserToggle(user._id)}
                      className={`px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                        formData.assignedTo?.includes(user._id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-accent"
                      }`}
                    >
                      {user.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {task ? "Update Task" : "Create Task"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default TaskFormModal;
