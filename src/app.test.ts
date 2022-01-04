import { App } from "./app";

let app;

describe("outage monitor", () => {
  beforeEach(() => {
    app = new App({
      name: "testService",
      team: {
        warningContact: "@testWarningContact",
        alertContact: "@testAlertContact",
      },
      components: [],
    });
  });

  test("without warning", () => {
    app.addOutageMonitor("testOutageMonitor", {
      message:
        "{{#is_alert}}alert message{{/is_alert}}" +
        "{{#is_recovery}}recovery message{{/is_recovery}}" +
        "{{#is_something}}another message{{/is_something}}",
    });

    expect(app.outageMonitors[0]).toEqual({
      name: "testOutageMonitor",
      message:
        "{{#is_alert}}alert message @testAlertContact{{/is_alert}}" +
        "{{#is_recovery}}recovery message @testAlertContact{{/is_recovery}}" +
        "{{#is_something}}another message @testAlertContact{{/is_something}}" +
        " @testWarningContact",
      tags: ["service:testservice"],
    });
  });

  test("with warning", () => {
    app.addOutageMonitor("testOutageMonitor", {
      message:
        "{{#is_alert}}alert message{{/is_alert}}" +
        "{{#is_warning}}warning message{{/is_warning}}" +
        "{{#is_recovery}}recovery message{{/is_recovery}}",
    });

    expect(app.outageMonitors[0]).toEqual({
      name: "testOutageMonitor",
      message:
        "{{#is_alert}}alert message @testAlertContact{{/is_alert}}" +
        "{{#is_warning}}warning message{{/is_warning}}" +
        "{{#is_recovery}}recovery message @testAlertContact{{/is_recovery}}" +
        " @testWarningContact",
      tags: ["service:testservice"],
    });
  });
});
