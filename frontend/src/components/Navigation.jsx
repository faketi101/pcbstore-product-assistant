import { Link, useLocation } from "react-router-dom";
import { useContext, useState, useRef, useEffect } from "react";
import {
  Home,
  FileText,
  BarChart3,
  LogOut,
  KeyRound,
  Menu,
  X,
  ListTodo,
  Settings,
  ChevronDown,
  Sparkles,
  FolderOpen,
  Layers,
  BookOpen,
  Zap,
  Globe,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import ChangePassword from "./ChangePassword";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import authService from "../services/api";

// Icon map for rendering dynamic icons
const ICON_MAP = {
  FileText,
  FolderOpen,
  Layers,
  BookOpen,
  Zap,
  Globe,
  Sparkles,
};

const Navigation = () => {
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserCard, setShowUserCard] = useState(false);
  const [showPromptsDropdown, setShowPromptsDropdown] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState([]);
  const userCardRef = useRef(null);
  const promptsDropdownRef = useRef(null);

  const isActive = (path) => location.pathname === path;
  const isPromptActive = () => location.pathname.startsWith("/prompts/");

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Fetch active prompt templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await authService.getActiveTemplates();
        setPromptTemplates(data);
      } catch (err) {
        console.error("Failed to fetch prompt templates:", err);
      }
    };
    fetchTemplates();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userCardRef.current && !userCardRef.current.contains(e.target)) {
        setShowUserCard(false);
      }
      if (
        promptsDropdownRef.current &&
        !promptsDropdownRef.current.contains(e.target)
      ) {
        setShowPromptsDropdown(false);
      }
    };
    if (showUserCard || showPromptsDropdown)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserCard, showPromptsDropdown]);

  const staticNavLinks = [{ path: "/", label: "Home", icon: Home }];

  const trailingNavLinks = [
    { path: "/reports", label: "Reports", icon: BarChart3 },
    { path: "/tasks", label: "Tasks", icon: ListTodo },
  ];

  const allTrailingLinks =
    user?.role === "admin"
      ? [
          ...trailingNavLinks,
          { path: "/admin", label: "Admin", icon: Settings },
        ]
      : trailingNavLinks;

  return (
    <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary-foreground tracking-tight">
                PCB
              </span>
            </div>
            <span className="font-semibold text-sm text-foreground">
              PCB Assistant
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {/* Static links */}
            {staticNavLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-all",
                  isActive(path)
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}

            {/* Prompts Dropdown */}
            <div className="relative" ref={promptsDropdownRef}>
              <button
                onClick={() => setShowPromptsDropdown(!showPromptsDropdown)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-all cursor-pointer",
                  isPromptActive()
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Prompts
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    showPromptsDropdown && "rotate-180",
                  )}
                />
              </button>
              {showPromptsDropdown && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-card border rounded-lg shadow-lg py-1 z-50">
                  {promptTemplates.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      No prompts available
                    </p>
                  ) : (
                    promptTemplates.map((tmpl) => {
                      const TmplIcon = ICON_MAP[tmpl.icon] || FileText;
                      const path = `/prompts/${tmpl.slug}`;
                      return (
                        <Link
                          key={tmpl._id}
                          to={path}
                          onClick={() => setShowPromptsDropdown(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                            isActive(path)
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted",
                          )}
                        >
                          <TmplIcon className="h-4 w-4" />
                          {tmpl.name}
                        </Link>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Trailing links */}
            {allTrailingLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-all",
                  isActive(path)
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop User Section */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* Avatar with popover */}
            <div className="relative" ref={userCardRef}>
              <button
                onClick={() => setShowUserCard(!showUserCard)}
                className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <span className="text-xs font-semibold text-primary">
                  {getInitials(user?.name)}
                </span>
              </button>
              {showUserCard && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border rounded-lg shadow-lg p-3 space-y-2 z-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {getInitials(user?.name)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user?.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user?.role || "user"}
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-2 space-y-1">
                    <button
                      onClick={() => {
                        setIsPasswordModalOpen(true);
                        setShowUserCard(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserCard(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur-lg">
          <div className="px-4 py-3 space-y-1">
            {/* Static links */}
            {staticNavLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all",
                  isActive(path)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}

            {/* Prompt templates */}
            {promptTemplates.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Prompts
                  </span>
                </div>
                {promptTemplates.map((tmpl) => {
                  const TmplIcon = ICON_MAP[tmpl.icon] || FileText;
                  const path = `/prompts/${tmpl.slug}`;
                  return (
                    <Link
                      key={tmpl._id}
                      to={path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all pl-6",
                        isActive(path)
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      <TmplIcon className="h-4 w-4" />
                      {tmpl.name}
                    </Link>
                  );
                })}
              </>
            )}

            {/* Trailing links */}
            {allTrailingLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all",
                  isActive(path)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}

            <div className="border-t pt-3 mt-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {getInitials(user?.name)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role || "user"}
                  </p>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => {
                    setIsPasswordModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <KeyRound className="h-4 w-4" />
                  Change Password
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ChangePassword
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </nav>
  );
};

export default Navigation;
