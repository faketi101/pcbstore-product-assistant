import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TaskFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  showAssignedFilter = false,
  users = [],
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const prevFiltersRef = useRef(filters);

  const getInitialFilters = () => ({
    search: "",
    status: [],
    startDateFrom: "",
    startDateTo: "",
    dueDateFrom: "",
    dueDateTo: "",
    assignedTo: [],
    sortBy: "statusPriority",
    sortOrder: "desc",
    ...filters,
  });

  const [localFilters, setLocalFilters] = useState(getInitialFilters);

  // Update local filters when parent filters change significantly
  useEffect(() => {
    const filtersChanged =
      JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
    if (filtersChanged) {
      setLocalFilters((prev) => {
        const updated = { ...prev, ...filters };
        prevFiltersRef.current = filters;
        return updated;
      });
    }
  }, [filters]);

  const statusOptions = ["Running", "On Hold", "Not Started", "Completed"];
  const sortOptions = [
    { value: "statusPriority", label: "Status Priority" },
    { value: "title", label: "Title" },
    { value: "startDate", label: "Start Date" },
    { value: "dueDate", label: "Due Date" },
    { value: "updatedAt", label: "Last Updated" },
    { value: "createdAt", label: "Created Date" },
  ];

  const handleInputChange = (field, value) => {
    setLocalFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleStatusToggle = (status) => {
    setLocalFilters((prev) => {
      const currentStatuses = prev.status || [];
      const newStatuses = currentStatuses.includes(status)
        ? currentStatuses.filter((s) => s !== status)
        : [...currentStatuses, status];
      return { ...prev, status: newStatuses };
    });
  };

  const handleUserToggle = (userId) => {
    setLocalFilters((prev) => {
      const currentUsers = prev.assignedTo || [];
      const newUsers = currentUsers.includes(userId)
        ? currentUsers.filter((u) => u !== userId)
        : [...currentUsers, userId];
      return { ...prev, assignedTo: newUsers };
    });
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    const resetFilters = {
      search: "",
      status: [],
      startDateFrom: "",
      startDateTo: "",
      dueDateFrom: "",
      dueDateTo: "",
      assignedTo: [],
      sortBy: "statusPriority",
      sortOrder: "desc",
    };
    setLocalFilters(resetFilters);
    onClearFilters();
    setShowFilters(false);
  };

  const activeFilterCount = [
    localFilters.search,
    localFilters.status?.length > 0,
    localFilters.startDateFrom,
    localFilters.startDateTo,
    localFilters.dueDateFrom,
    localFilters.dueDateTo,
    localFilters.assignedTo?.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tasks by title or description..."
              value={localFilters.search}
              onChange={(e) => {
                handleInputChange("search", e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applyFilters();
                }
              }}
              onBlur={applyFilters}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 sm:flex-none"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="flex-1 sm:flex-none"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-4 border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <Badge
                    key={status}
                    variant={
                      localFilters.status?.includes(status)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => handleStatusToggle(status)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Start Date Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Date Range</Label>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input
                    type="date"
                    value={localFilters.startDateFrom}
                    onChange={(e) =>
                      handleInputChange("startDateFrom", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={localFilters.startDateTo}
                    onChange={(e) =>
                      handleInputChange("startDateTo", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Due Date Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Due Date Range</Label>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input
                    type="date"
                    value={localFilters.dueDateFrom}
                    onChange={(e) =>
                      handleInputChange("dueDateFrom", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={localFilters.dueDateTo}
                    onChange={(e) =>
                      handleInputChange("dueDateTo", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort By</Label>
              <select
                value={localFilters.sortBy}
                onChange={(e) => handleInputChange("sortBy", e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort Order</Label>
              <select
                value={localFilters.sortOrder}
                onChange={(e) => handleInputChange("sortOrder", e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>

            {/* Assigned Users Filter */}
            {showAssignedFilter && users.length > 0 && (
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label className="text-sm font-medium">Assigned To</Label>
                <div className="flex flex-wrap gap-2">
                  {users.map((user) => (
                    <Badge
                      key={user._id}
                      variant={
                        localFilters.assignedTo?.includes(user._id)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => handleUserToggle(user._id)}
                    >
                      {user.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={applyFilters}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(false)}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && !showFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {localFilters.search && (
            <Badge variant="secondary">
              Search: {localFilters.search}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => {
                  handleInputChange("search", "");
                  applyFilters();
                }}
              />
            </Badge>
          )}
          {localFilters.status?.map((status) => (
            <Badge key={status} variant="secondary">
              Status: {status}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => {
                  handleStatusToggle(status);
                  applyFilters();
                }}
              />
            </Badge>
          ))}
          {(localFilters.startDateFrom || localFilters.startDateTo) && (
            <Badge variant="secondary">
              Start Date Range
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => {
                  handleInputChange("startDateFrom", "");
                  handleInputChange("startDateTo", "");
                  applyFilters();
                }}
              />
            </Badge>
          )}
          {(localFilters.dueDateFrom || localFilters.dueDateTo) && (
            <Badge variant="secondary">
              Due Date Range
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => {
                  handleInputChange("dueDateFrom", "");
                  handleInputChange("dueDateTo", "");
                  applyFilters();
                }}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskFilters;
