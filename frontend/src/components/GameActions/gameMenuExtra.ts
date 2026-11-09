import type { Component, InjectionKey } from "vue";

/** A view can add one entry to the top of every game's actions menu. */
export const GAME_MENU_EXTRA: InjectionKey<Component> = Symbol("gameMenuExtra");
