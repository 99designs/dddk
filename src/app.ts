import * as api from "./api";
import { Component, Container } from "./types";
import { Monitor } from "./api";
import { stripIndent } from "./stripIndent";

export const descriptionTag = "managed by [ddac](github.com/99designs/ddac)";

export class App implements Container {
  name: string;
  board: api.Dashboard;
  warningMonitors: Monitor[];
  outageMonitors: Monitor[];

  constructor({
    name,
    slack,
    components
  }: {
    name: string;
    slack: string;
    components: Component[];
  }) {
    this.name = name;
    this.board = {
      title: name,
      description: descriptionTag,
      layout_type: "ordered",
      widgets: []
    };
    this.warningMonitors = [];
    this.outageMonitors = [];

    for (const component of components) {
      component(this);
    }
  }

  addWidget(title: string, widget: api.WidgetDefinition) {
    this.board.widgets.push({
      definition: {
        ...widget,
        title: title
      }
    });
  }

  addOutageMonitor(name: string, { tags, message, ...monitor }: Monitor) {
    this.outageMonitors.push({
      ...monitor,
      name: name,
      message: stripIndent(message),
      tags: ["service:" + this.name.toLowerCase(), "created_by:ddac"]
    });
  }

  addWarningMonitor(name: string, { tags, message, ...monitor }: Monitor) {
    this.warningMonitors.push({
      ...monitor,
      name: name,
      message: stripIndent(message),
      tags: ["service:" + this.name.toLowerCase(), "created_by:ddac"]
    });
  }
}
