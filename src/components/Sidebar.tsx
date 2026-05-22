'use client';

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
import { BarChart3, Home, ShoppingCart, FileText, Users, TrendingUp, Settings, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const AppSidebar = () => {
  const { user, isAuthorized } = useAuth();

  // Базовые пункты меню
  const baseMenuItems = [
    { name: 'Главная', icon: Home, href: '/' },
    { name: 'HoReCa', icon: ShoppingCart, href: '/horeca' },
  ];

  // Дополнительные пункты в зависимости от роли
  const getRoleSpecificItems = () => {
    if (!isAuthorized || !user) return [];

    if (user.role === 'exhibitor') {
      return [
        { name: 'Админ-панель', icon: Settings, href: '/horeca/admin' },
        { name: 'Мои продукты', icon: ShoppingCart, href: '/horeca/admin/content/products' },
        { name: 'Партнеры', icon: Users, href: '/horeca/admin/partners' },
      ];
    }

    if (user.role === 'buyer') {
      return [
        { name: 'Кабинет закупщика', icon: User, href: '/horeca/buyer/dashboard' },
        { name: 'Мои тендеры', icon: FileText, href: '/horeca/buyer/dashboard/tenders' },
        { name: 'Каталог', icon: ShoppingCart, href: '/horeca/discovery' },
      ];
    }

    return [];
  };

  const menuItems = [...baseMenuItems, ...getRoleSpecificItems()];

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