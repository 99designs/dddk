import { Component } from "../index";
import { errorStyle, trafficStyle, weekBeforeStyle } from "./styles";

export default function elb(name: string): Component {
  return container => {
    container.addWidget("ELB Backend connection errors", {
      type: "timeseries",
      requests: [
        {
          q: `sum:aws.elb.backend_connection_errors{name:${name}}`,
          display_type: "bars",
          style: errorStyle,
        },
      ],
    });

    container.addWidget("Surge queue length", {
      type: "timeseries",
      requests: [
        {
          q: `max:aws.elb.surge_queue_length{name:${name}}`,
          display_type: "area",
          style: errorStyle,
        },
      ],
    });

    container.addOutageMonitor(`No healty hosts on elb ${name}`, {
      type: "metric alert",
      query: `min(last_5m):sum:aws.elb.healthy_host_count{name:${name}} < 1`,
      message: `
        {{#is_alert}}
          Not enough healthy hosts on elb ${name}!
        {{/is_alert}}`,
      options: {
        include_tags: false,
        no_data_timeframe: 15, // in minutes
        notify_no_data: true,
        new_host_delay: 300, // in seconds
        evaluation_delay: 900, // in seconds
        thresholds: {
          critical: 1,
        },
      },
    });

    container.addWarningMonitor(`Unheathy host count is high on elb ${name}`, {
      type: "metric alert",
      query: `max(last_5m):sum:aws.elb.un_healthy_host_count{name:${name}} > 0.05`,
      message: `
        {{#is_alert}}
          There are unhealthy hosts on elb ${name}!
        {{/is_alert}}`,
      options: {
        include_tags: false,
        no_data_timeframe: 15, // in minutes
        notify_no_data: true,
        new_host_delay: 300, // in seconds
        evaluation_delay: 900, // in seconds
        thresholds: {
          critical: 0.05,
        },
      },
    });

    container.addWidget("Host count", {
      type: "timeseries",
      requests: [
        {
          q: `min:aws.elb.healthy_host_count{name:${name}}.rollup(min)`,
          display_type: "line",
          style: trafficStyle,
        },
        {
          q: `max:aws.elb.un_healthy_host_count{name:${name}}.rollup(min)`,
          display_type: "line",
          style: trafficStyle,
        },
      ],
    });

    container.addWidget("Response times", {
      type: "timeseries",
      requests: [
        {
          q: `avg:aws.elb.latency{name:${name}}, avg:aws.elb.latency.p95{name:${name}}, avg:aws.elb.latency.p99{name:${name}}`,
          display_type: "line",
          style: trafficStyle,
        },
        {
          q: `week_before(avg:aws.elb.latency{name:${name}}), week_before(avg:aws.elb.latency.p95{name:${name}}), week_before(avg:aws.elb.latency.p99{name:${name}})`,
          display_type: "line",
          style: weekBeforeStyle,
        },
      ],
    });
  };
}
