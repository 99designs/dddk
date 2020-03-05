import { Component } from "../index";
import { errorStyle, trafficStyle, weekBeforeStyle } from "./styles";

export default function alb(name: string, titlePrefix: string = ""): Component {
  if (titlePrefix) {
    titlePrefix += " ";
  }
  return container => {
    container.addWidget(titlePrefix + "Target group 5xx", {
      type: "timeseries",
      requests: [
        {
          q: `max:aws.elb.httpcode_target_5xx{name:${name}}.as_count()`,
          display_type: "bars",
          style: errorStyle,
        },
      ],
    });

    container.addWidget(titlePrefix + "Target group 4xx", {
      type: "timeseries",
      requests: [
        {
          q: `max:aws.elb.httpcode_target_4xx{name:${name}}.as_count()`,
          display_type: "bars",
          style: errorStyle,
        },
      ],
    });

    container.addWidget(titlePrefix + "Host count", {
      type: "timeseries",
      requests: [
        {
          q: `min:aws.elb.healthy_host_count{name:${name}}.rollup(min), max:aws.elb.un_healthy_host_count{name:${name}}.rollup(max)`,
          display_type: "area",
          style: trafficStyle,
        },
      ],
    });

    container.addOutageMonitor(`No healthy hosts on alb ${name}`, {
      type: "metric alert",
      query: `min(last_5m):sum:aws.elb.healthy_host_count{name:${name}} < 1`,
      message: `
        {{#is_alert}}
          Not enough healthy hosts on alb ${name}!
        {{/is_alert}}`,
      options: {
        include_tags: false,
        no_data_timeframe: 900,
        notify_no_data: true,
        new_host_delay: 300,
        evaluation_delay: 900,
        thresholds: {
          critical: 1,
        },
      },
    });

    container.addWarningMonitor(`Unheathy host count is high on alb ${name}`, {
      type: "metric alert",
      query: `max(last_5m):sum:aws.elb.un_healthy_host_count{name:${name}} > 0.05`,
      message: `
        {{#is_alert}}
          There are unhealthy hosts on alb ${name}!
        {{/is_alert}}`,
      options: {
        include_tags: false,
        no_data_timeframe: 900,
        notify_no_data: true,
        new_host_delay: 300,
        evaluation_delay: 900,
        thresholds: {
          critical: 0.05,
        },
      },
    });

    container.addWidget(titlePrefix + "Target group traffic (r/s)", {
      type: "timeseries",
      requests: [
        {
          q: `sum:aws.elb.httpcode_target_2xx{name:${name}}.as_rate(), sum:aws.elb.httpcode_target_3xx{name:${name}}.as_rate()`,
          display_type: "area",
          style: trafficStyle,
        },
        {
          q: `week_before(sum:aws.elb.httpcode_target_2xx{name:${name}}.as_rate()) + week_before(sum:aws.elb.httpcode_target_3xx{name:${name}}.as_rate())`,
          display_type: "line",
          style: weekBeforeStyle,
        },
      ],
    });
  };
}
