import { Component, Container, api } from "../src";

// Ignore the monitors that an app exports. This can be handy when spinning up
// a new service that is not yet seeing production traffic, but you want the
// sweet sweet dashboards.
//
// example usage:
//  export default new App({
//   name: "FooBar",
//   team: teams.bestTeam,
//   components: [
//     fargate("foo-bar"),
//     rds("foo-bar"),
//     mute(webApm("foo-bar")), // muted because we have no traffic
//   ]
// });
export default function mute(...components: Component[]): Component {
  return container => {
    const mutedContainer: Container = {
      name: container.name,
      addWidget(name: string, widget: api.WidgetDefinition) {
        container.addWidget(name, widget);
      },
      addSynthetic(name: string, syn: api.Synthetic) {
        container.addSynthetic(name, syn);
      },
      addOutageMonitor(name: string, monitor: api.Monitor) {
        return;
      },
      addWarningMonitor(name: string, monitor: api.Monitor) {
        return;
      },
    };
    for (const c of components) {
      c(mutedContainer);
    }
  };
}
