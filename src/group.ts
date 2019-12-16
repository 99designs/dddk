import { Component, Container } from "./types";
import { Group, Monitor, TimeSeries, TopList } from "./api";

export default function Group(name: string, children: Component[]): Component {
  return container => {
    const group: Group = {
      layout_type: "ordered",
      type: "group",
      widgets: []
    };

    const groupContainer: Container = {
      addWarningMonitor(name: string, monitor: Monitor) {
        container.addWarningMonitor(name, monitor);
      },
      addOutageMonitor(name: string, monitor: Monitor) {
        container.addOutageMonitor(name, monitor);
      },
      addWidget(name: string, widget: TimeSeries | TopList | Group) {
        group.widgets.push({
          definition: {
            ...widget,
            title: name
          }
        });
      }
    };

    for (const child of children) {
      child(groupContainer);
    }

    return container.addWidget(name, group);
  };
}
