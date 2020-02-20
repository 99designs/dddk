import * as api from "./api";
import { Component, Container } from "./types";
import { Monitor, Synthetic } from "./api";
import { stripIndent } from "./stripIndent";
import { Team } from "./team";

export const descriptionTag = "managed by [dddk](github.com/99designs/dddk)";
export const createdbyTag = "created_by:dddk";
export const generateAlertGraphTag = "alert graph active:dddk";

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
    components
  }: {
    name: string;
    team: Team;
    components: Component[];
  }) {
    this.name = name;
    this.board = {
      title: name,
      description: descriptionTag,
      layout_type: "ordered",
      widgets: []
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
        title: title
      }
    });
  }

  addOutageMonitor(name: string, { tags, message, ...monitor }: Monitor) {
    this.outageMonitors.push({
      ...monitor,
      name: name,
      message:
        stripIndent(message) +
        " " +
        this.team.pagerdutyGroup +
        " " +
        this.team.slackGroup,
      tags: ["service:" + this.name.toLowerCase(), createdbyTag]
    });
  }

  addWarningMonitor(name: string, { tags, message, ...monitor }: Monitor) {
    this.warningMonitors.push({
      ...monitor,
      name: name,
      message: stripIndent(message) + " " + this.team.slackGroup,
      tags: ["service:" + this.name.toLowerCase(), createdbyTag]
    });
  }

  addSynthetic(name: string, { tags, message, ...syn }: api.Synthetic) {
    this.synthetics.push({
      ...syn,
      name: name,
      message:
        stripIndent(message) +
        " " +
        this.team.pagerdutyGroup +
        " " +
        this.team.slackGroup,
      tags: ["service:" + this.name.toLowerCase(), createdbyTag]
    });
  }
}

export interface pushStats {
  updated: number;
  created: number;
  skipped: number;
  deleted: number;
}
