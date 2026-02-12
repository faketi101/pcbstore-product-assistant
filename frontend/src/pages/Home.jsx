import { Link } from "react-router-dom";
import { useEffect } from "react";
import { FileText, BarChart3, FolderOpen, Cpu } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Home = () => {
  useEffect(() => {
    document.title = "Home - PCB Automation";
  }, []);

  const menuItems = [
    {
      title: "SEO Product Prompt",
      description: "Generate AI prompts for product descriptions",
      icon: FileText,
      path: "/product-prompt",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Category Prompt",
      description: "Generate prompts for category content",
      icon: FolderOpen,
      path: "/category-prompt",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      title: "Reports & Updates",
      description: "Track hourly and daily work progress",
      icon: BarChart3,
      path: "/reports",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Cpu className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl">PCB Automation</CardTitle>
          <CardDescription>Internal Tools & Utilities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path} className="block">
              <div className="flex items-center gap-4 p-4 rounded-xl border hover:border-primary/50 hover:bg-muted/50 transition-all group">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bg}`}
                >
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
