import { cn } from "@/lib/utils";

export function sidebarAsideWidth(expanded: boolean) {
  return cn(
    "transition-[width] duration-200 ease-out",
    expanded ? "w-64 shadow-xl" : "w-16"
  );
}

export function sidebarLabelReveal(expanded: boolean) {
  return cn(
    "overflow-hidden whitespace-nowrap transition-all duration-200 ease-out",
    expanded ? "ml-3 max-w-[12rem] opacity-100" : "ml-0 max-w-0 opacity-0"
  );
}

export function sidebarBrandPadding(expanded: boolean) {
  return expanded ? "px-4" : "px-3";
}

export function sidebarNavLinkLayout(expanded: boolean) {
  return cn(
    "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
    expanded ? "gap-0 px-3" : "justify-center px-2"
  );
}

export function sidebarFooterPadding(expanded: boolean) {
  return expanded ? "p-4" : "p-2";
}

export function sidebarNavPadding(expanded: boolean) {
  return expanded ? "px-3" : "px-2";
}
