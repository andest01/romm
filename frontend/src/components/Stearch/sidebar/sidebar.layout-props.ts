import type { Component } from "vue";

export interface SidebarLayoutProps {
  header: Component;
  body: Component;
  footer: Component | null;
}
