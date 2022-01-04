import * as api from "./api";
import { Component, Container } from "./types";
import { Monitor, Synthetic } from "./api";
import { Team } from "./team";
import { stripIndent } from "common-tags";

export class App implements Container {
  name: string;
  board: api.Dashboard;
  warningMonitors: Monitor[];
  outageMonitors: Monitor[];
  synthetics: Synthetic[];
  team: Team;

  constructor({
    name,
    team,
    components,
  }: {
    name: string;
    team: Team;
    components: Component[];
  }) {
    this.name = name;
    this.board = {
      title: name,
      layout_type: "ordered",
      widgets: [],
    };
    this.team = team;
    this.warningMonitors = [];
    this.outageMonitors = [];
    this.synthetics = [];

    for (const component of components) {
      component(this);
    }
  }

  addWidget(title: string, widget: api.WidgetDefinition) {
    this.board.widgets.push({
      definition: {
        ...widget,
        title: title,
      },
    });
  }

  injectAlertContactToNonWarningNotifications(message) {
    const { alertContact } = this.team;

    return stripIndent(
      message.replace(/\{\{\/(?!is_warning)/g, ` ${alertContact}{{/`),
    );
  }

  addOutageMonitor(name: string, { tags, message, ...monitor }: Monitor) {
    this.outageMonitors.push({
      ...monitor,
      name: name,
      message:
        this.injectAlertContactToNonWarningNotifications(message) +
        " " +
        this.team.warningContact,
      tags: tags ? tags : ["service:" + this.name.toLowerCase()],
    });
  }

  addWarningMonitor(name: string, { tags, message, ...monitor }: Monitor) {
    this.warningMonitors.push({
      ...monitor,
      name: name,
      message: stripIndent(message) + " " + this.team.warningContact,
      tags: tags ? tags : ["service:" + this.name.toLowerCase()],
    });
  }

  addSynthetic(name: string, { tags, message, ...syn }: api.Synthetic) {
    this.synthetics.push({
      ...syn,
      name: name,
      message:
        stripIndent(message) +
        " " +
        this.team.alertContact +
        " " +
        this.team.warningContact,
      tags: tags ? tags : ["service:" + this.name.toLowerCase()],
    });
  }
}
