import type { Component } from "vue";

export interface FiltersLayoutProps {
  header: Component;
  body: Component;
  footer: Component | null;
}
