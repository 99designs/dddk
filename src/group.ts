import { Component, Container } from "./types";
import { Group, TimeSeries, TopList } from "./api";

export default function Group(name: string, children: Component[]): Component {
  return container => {
    const group: Group = {
      layout_type: "ordered",
      type: "group",
      widgets: []
    };

    const groupContainer: Container = {
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
