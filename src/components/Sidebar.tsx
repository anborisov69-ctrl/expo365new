import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { BarChart3, Home, ShoppingCart, FileText, Users, TrendingUp } from 'lucide-react';

const AppSidebar = () => {
  const menuItems = [
    { name: 'Обзор', icon: Home, href: '/' },
    { name: 'Моя витрина', icon: ShoppingCart, href: '/marketplace' },
    { name: 'Тендеры', icon: FileText, href: '/tenders' },
    { name: 'HR-модуль', icon: Users, href: '/hr' },
    { name: 'Аналитика', icon: BarChart3, href: '/analytics' },
  ];

  return (
    <Sidebar className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-brand-blue text-white border-r-0">
      <SidebarHeader className="p-6 border-b border-white/10">
        <h2 className="text-xl font-bold tracking-tight">EXPO 365</h2>
        <p className="text-xs text-white/50 font-light mt-0.5">HoReCa Platform</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item, index) => (
                <SidebarMenuItem key={index}>
                  <SidebarMenuButton asChild className="text-white hover:bg-white hover:bg-opacity-10">
                    <a href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;