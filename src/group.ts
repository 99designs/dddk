import { Component, Container } from "./types";
import { Group, Monitor, Synthetic, TimeSeries, TopList } from "./api";

export function Group(name: string, children: Component[]): Component {
  return container => {
    const group: Group = {
      layout_type: "ordered",
      type: "group",
      widgets: [],
    };

    const groupContainer: Container = {
      name: name,
      addWarningMonitor(name: string, monitor: Monitor) {
        container.addWarningMonitor(name, monitor);
      },
      addOutageMonitor(name: string, monitor: Monitor) {
        container.addOutageMonitor(name, monitor);
      },
      addSynthetic(name: string, syn: Synthetic) {
        container.addSynthetic(name, syn);
      },
      addWidget(name: string, widget: TimeSeries | TopList | Group) {
        group.widgets.push({
          definition: {
            ...widget,
            title: name,
          },
        });
      },
    };

    for (const child of children) {
      child(groupContainer);
    }

    return container.addWidget(name, group);
  };
}
