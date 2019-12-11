import * as api from "./api";

export type Component = (container: Container) => void;

export interface Container {
  addWidget(name: string, widget: api.WidgetDefinition);
}
