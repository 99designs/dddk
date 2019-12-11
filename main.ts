import * as dd from "./dd";
import got, { Method } from "got";
import { TimeSeries } from "./dd";

function cpuGraph(
  q: string,
  extra: Partial<dd.TimeSeries> = {}
): dd.TimeSeries {
  return {
    requests: [{ display_type: "area", q: q }],
    type: "timeseries",
    ...extra
  };
}

function memGraph(
  q: string,
  extra: Partial<dd.TimeSeries> = {}
): dd.TimeSeries {
  return {
    requests: [
      {
        q: q,
        display_type: "line",
        style: {
          palette: "cool",
          line_width: "thin"
        }
      }
    ],
    type: "timeseries",
    ...extra
  };
}

function taskGraph(
  q: string,
  extra: Partial<dd.TimeSeries> = {}
): dd.TimeSeries {
  return {
    requests: [
      {
        display_type: "line",
        q: q,
        style: {
          palette: "purple",
          line_width: "thin"
        }
      }
    ],
    type: "timeseries",
    ...extra
  };
}

function lineSeries(
  q: string,
  extra: Partial<dd.TimeSeries> = {}
): dd.TimeSeries {
  return {
    requests: [{ display_type: "line", q: q }],
    type: "timeseries",
    ...extra
  };
}

function sqrt() {
  return {
    yaxis: {
      scale: "sqrt"
    }
  };
}

const descriptionTag = "managed by [ddac](github.com/99designs/ddac)";

function goRuntime(app: string): Component {
  return container => {
    const group = new Group();

    group.addWidget(
      "Running goroutines",
      taskGraph(`sum:app.runtime.goroutines{app:${app}} by {host}`)
    );

    group.addWidget(
      "GC pause (max ns)",
      lineSeries(
        `avg:app.mem.gc.gc_pause_quantile_max{app:${app}}, avg:app.mem.gc.gc_pause_quantile_50{app:${app}}`,
        sqrt()
      )
    );

    group.addWidget(
      "Objects allocated on heap",
      memGraph(
        `avg:app.mem.heap_objects{app:${app}}, avg:app.mem.active_allocs{app:${app}}`
      )
    );

    group.addWidget("Memory allocated", {
      type: "timeseries",
      requests: [
        {
          q: `avg:app.mem.sys{app:${app}}`,
          display_type: "line",
          style: {
            palette: "dog_classic",
            line_type: "dashed",
            line_width: "thin"
          }
        },
        {
          q: `max:app.mem.alloc{app:${app}} by {host}`,
          display_type: "line",
          style: {
            palette: "purple",
            line_type: "solid",
            line_width: "thin"
          }
        }
      ]
    });

    container.addWidget("go runtime", group);
  };
}

function ecs(image: string): Component {
  return container => {
    const group = new Group();

    group.addWidget("Container memory use (%)", {
      type: "timeseries",
      requests: [
        {
          q: `(avg:ecs.fargate.mem.rss{image_name:${image}} by {container_id}/avg:ecs.fargate.mem.limit{image_name:${image}} by {container_id})*100`,
          display_type: "line",
          style: {
            palette: "dog_classic",
            line_type: "solid",
            line_width: "normal"
          }
        },
        {
          q: `(week_before(avg:ecs.fargate.mem.rss{image_name:${image}})/week_before(avg:ecs.fargate.mem.limit{image_name:${image}}))*100`,
          display_type: "line",
          style: {
            palette: "grey",
            line_type: "dotted",
            line_width: "thin"
          }
        }
      ]
    });

    container.addWidget("ECS", group);
  };
}

function webApm(service: string): Component {
  return container => {
    const group = new Group();
    group.addWidget("requests by content type", {
      type: "timeseries",
      requests: [
        {
          apm_query: {
            index: "trace-search",
            search: {
              query: `service:${service}`
            },
            group_by: [
              {
                facet: "@http.content_type",
                limit: 10,
                sort: {
                  order: "desc",
                  aggregation: "count"
                }
              }
            ],
            compute: {
              aggregation: "count"
            }
          },
          style: {
            palette: "dog_classic",
            line_type: "solid",
            line_width: "normal"
          },
          display_type: "bars"
        }
      ]
    });

    container.addWidget("APM", group);
  };
}

type Component = (container: Container) => void;

interface WidgetWrapper {
  type: "wrapper";
  component?: dd.WidgetDefinition;
}

type WidgetDefinition = dd.TimeSeries | dd.Group | WidgetWrapper;

interface Container {
  addWidget(name: string, widget: WidgetDefinition);
}

class Group implements Container, WidgetWrapper {
  type: "wrapper" = "wrapper";
  component: dd.Group;

  constructor() {
    this.component = {
      title: "",
      layout_type: "ordered",
      type: "group",
      widgets: []
    };
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

class App implements Container {
  component: dd.Dashboard;

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

const bastion = new App({
  name: "Bastion",
  slack: "core-ops",
  components: [
    goRuntime("bastion"),
    webApm("bastion"),
    ecs("447214301260.dkr.ecr.us-east-1.amazonaws.com/bastion")
  ]
});

const client = new dd.Client(
  process.env["DD_API_KEY"],
  process.env["DD_APP_KEY"]
);

(async () => {
  const dashboards = (await client.getDashboards()).filter(
    d => d.description && d.description.includes(descriptionTag)
  );

  console.log(dashboards);

  const existing = dashboards.find(d => d.title == bastion.component.title);

  console.log(await client.updateDashboard(existing.id, bastion.component));
})();
