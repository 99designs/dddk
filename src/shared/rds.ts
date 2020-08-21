import {
  cpuStyle,
  errorStyle,
  memoryStyle,
  trafficStyle,
  upperBoundStyle,
} from "./styles";

import { Component } from "../index";

export default function rds(...dbname: string[]): Component {
  return container => {
    container.addWidget("RDS CPU", {
      type: "timeseries",
      requests: dbname.map(dbname => ({
        q: `avg:aws.rds.cpuutilization{name:${dbname}} by {host}`,
        display_type: "line",
        style: cpuStyle,
      })),
    });

    container.addWidget("RDS Connections", {
      type: "timeseries",
      requests: dbname.map(dbname => ({
        q: `max:aws.rds.database_connections{name:${dbname}} by {host}`,
        display_type: "line",
        style: trafficStyle,
      })),
    });

    dbname.forEach(dbname =>
      container.addWarningMonitor(`RDS burst balance low on ${dbname}`, {
        type: "metric alert",
        query: `min(last_1h):max:aws.rds.burst_balance{name:${dbname}} by {host} <= 50`,
        message: `{{#is_warning}}
            RDS BurstBalance for {{host.name}}  is below 80%. Things will alert if it gets below 50%. Check what is happening on the RDS instance (why are the IOPS so high?).
        {{/is_warning}}

        {{#is_alert}}
            RDS BurstBalance for {{host.name}} is below 50%! IOPS throughput will be throttled if this reaches 0%, possibly resulting in degraded RDS performance. Check what is happening on the RDS instance (why are the IOPS so high?).
        {{/is_alert}}

        {{#is_recovery}}
            RDS BurstBalance for {{host.name}} is looking better now.
        {{/is_recovery}}`,
        options: {
          new_host_delay: 300,
          include_tags: false,
          no_data_timeframe: 300,
          notify_no_data: true,
          thresholds: {
            critical: 50,
            warning: 80,
          },
        },
      }),
    );

    container.addWidget("Burst balance used", {
      type: "timeseries",
      requests: dbname.map(dbname => ({
        q: `100 - max:aws.rds.burst_balance{name:${dbname}} by {host}`,
        display_type: "line",
        style: errorStyle,
      })),
    });

    container.addWidget("RDS Memory use", {
      type: "timeseries",
      requests: dbname.flatMap(dbname => [
        {
          q: `max:aws.rds.swap_usage{name:${dbname}} by {host}`,
          display_type: "line",
          style: memoryStyle,
        },
        {
          q: `max:aws.rds.freeable_memory{name:${dbname}} by {host}`,
          display_type: "line",
          style: memoryStyle,
        },
      ]),
    });

    container.addWidget("RDS io/s", {
      type: "timeseries",
      requests: dbname.flatMap(dbname => [
        {
          q: `autosmooth(avg:aws.rds.read_iops{name:${dbname}} by {host})`,
          display_type: "line",
          style: trafficStyle,
        },
        {
          q: `autosmooth(avg:aws.rds.write_iops{name:${dbname}} by {host})`,
          display_type: "line",
          style: trafficStyle,
        },
      ]),
    });

    container.addWidget("RDS storage", {
      type: "timeseries",
      requests: dbname.flatMap(dbname => [
        {
          q: `avg:aws.rds.total_storage_space{name:${dbname}} by {host}`,
          display_type: "line",
          style: upperBoundStyle,
        },
        {
          q: `avg:aws.rds.total_storage_space{name:${dbname}} by {host} - avg:aws.rds.free_storage_space{name:${dbname}} by {host}`,
          display_type: "line",
          style: memoryStyle,
        },
      ]),
    });

    container.addWidget("RDS latency", {
      type: "timeseries",
      requests: dbname.flatMap(dbname => [
        {
          q: `autosmooth(avg:aws.rds.read_latency{name:${dbname}} by {host})`,
          display_type: "line",
          style: trafficStyle,
        },
        {
          q: `autosmooth(avg:aws.rds.write_latency{name:${dbname}} by {host})`,
          display_type: "line",
          style: trafficStyle,
        },
      ]),
    });
  };
}
