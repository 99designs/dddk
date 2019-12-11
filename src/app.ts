import * as api from "./api";
import { Component, Container, WidgetDefinition } from "./types";

export const descriptionTag = "managed by [ddac](github.com/99designs/ddac)";

export class App implements Container {
  component: api.Dashboard;

  constructor({
    name,
    slack,
    components
  }: {
    name: string;
    slack: string;
    components: Component[];
  }) {
    this.component = {
      title: name,
      description: descriptionTag,
      layout_type: "ordered",
      widgets: []
    };

    for (const component of components) {
      component(this);
    }
  }

  addWidget(title: string, widget: WidgetDefinition) {
    if (widget.type === "wrapper") {
      this.component.widgets.push({
        definition: {
          ...widget.component,
          title: title
        }
      });
    } else {
      this.component.widgets.push({
        definition: {
          ...widget,
          title: title
        }
      });
    }
  }
}
