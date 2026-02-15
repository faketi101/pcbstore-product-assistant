import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  Edit,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

const TaskCard = ({
  task,
  onEdit,
  onDelete,
  showActions = true,
  isAdmin = false,
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "Running":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "On Hold":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "Not Started":
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
      case "Completed":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const completionPercentage =
    task.totalTaskCount > 0
      ? Math.round((task.totalCompletedTask / task.totalTaskCount) * 100)
      : 0;

  const formatDate = (date) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM dd, yyyy");
  };

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM dd, yyyy 'at' h:mm a");
  };

  const isOverdue =
    new Date(task.dueDate) < new Date() && task.status !== "Completed";

  return (
    <Card
      className="p-4 sm:p-5 hover:shadow-md transition-all duration-200 border-l-4"
      style={{
        borderLeftColor: isOverdue ? "#ef4444" : "transparent",
      }}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description.replace(/<[^>]*>/g, "")}
              </p>
            )}
          </div>
          <Badge
            className={`${getStatusColor(task.status)} flex items-center gap-1 shrink-0`}
          >
            {getStatusIcon(task.status)}
            {task.status}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Progress: {task.totalCompletedTask} / {task.totalTaskCount}
            </span>
            <span className="font-medium text-foreground">
              {completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">
              Start: {formatDate(task.startDate)}
            </span>
          </div>
          <div
            className={`flex items-center gap-2 ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}
          >
            <Clock className="h-4 w-4 shrink-0" />
            <span className="truncate">Due: {formatDate(task.dueDate)}</span>
          </div>
        </div>

        {/* Completed Date */}
        {task.status === "Completed" && task.endDate && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Completed: {formatDateTime(task.endDate)}</span>
          </div>
        )}

        {/* Assigned Users */}
        {((task.assignedUsers && task.assignedUsers.length > 0) ||
          (task.assignedTo && task.assignedTo.length > 0)) && (
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {(task.assignedUsers || task.assignedTo).map((user) => (
                <Badge
                  key={user._id}
                  variant="outline"
                  className="text-xs"
                  title={user.email}
                >
                  {user.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {task.links && task.links.length > 0 && (
          <div className="flex items-start gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-2">
              {task.links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline truncate max-w-[200px]"
                  title={link.label || link.url}
                >
                  {link.label || `Link ${index + 1}`}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        {task.lastUpdated && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Last updated by{" "}
            {task.lastUpdater?.name ||
              task.lastUpdated?.updatedBy?.name ||
              "Unknown"}{" "}
            on {formatDateTime(task.lastUpdated.updatedAt)}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(task)}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            {isAdmin && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(task)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TaskCard;
