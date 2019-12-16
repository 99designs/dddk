import * as api from "./api";

export type Component = (container: Container) => void;

export interface Container {
  name: string;
  addWidget(name: string, widget: api.WidgetDefinition);
  addWarningMonitor(name: string, monitor: api.Monitor);
  addOutageMonitor(name: string, monitor: api.Monitor);
  addSynthetic(name: string, syn: api.Synthetic);
}
