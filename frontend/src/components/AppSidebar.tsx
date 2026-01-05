import {
  LayoutDashboard,
  Upload,
  LogOut,
  Eye,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const mainMenuItems = [
  { title: "统计看板", url: "/", icon: BarChart3 },
  { title: "质检看板", url: "/dashboard", icon: LayoutDashboard },
  { title: "数据上传", url: "/upload", icon: Upload },
  {
    title: "人工审核项",
    icon: Eye,
    items: [
      { title: "人像清晰度和完整度", url: "/manual-review" }
    ]
  },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const handleLogout = () => {
    toast({
      title: "已退出登录",
    });
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      {/* Logo and App Name Section */}
      <div className={cn("flex items-center gap-3 p-4 border-b border-border", collapsed && "justify-center p-3")}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
          <div className="text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            AC
          </div>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">
              AC教室质检平台
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              智能质检 · 数据驱动
            </p>
          </div>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
            {!collapsed && "主要功能"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <Collapsible defaultOpen className="group/collapsible">
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <CollapsibleTrigger className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted w-full">
                          <item.icon className="h-5 w-5 shrink-0" />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">{item.title}</span>
                              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                            </>
                          )}
                        </CollapsibleTrigger>
                      </SidebarMenuButton>
                      <CollapsibleContent>
                        {!collapsed && (
                          <div className="mt-1 space-y-1 pl-9">
                            {item.items.map((subItem) => (
                              <SidebarMenuButton key={subItem.title} asChild size="sm">
                                <NavLink
                                  to={subItem.url}
                                  className="block py-1 text-sm transition-colors hover:text-primary"
                                  activeClassName="text-primary font-medium"
                                >
                                  <span>{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url!}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className={`w-full justify-start gap-3 ${collapsed ? 'px-2' : 'px-3'}`}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>退出登录</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
