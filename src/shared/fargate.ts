import { cpuStyle, memoryStyle, weekBeforeStyle } from "./styles";
import { Component } from "../index";

// fargate ecs stacks, not plain ECS
export default function fargate(ecs_task_family: string): Component {
  return container => {
    container.addWidget("Container memory use (%)", {
      type: "timeseries",
      markers: [
        {
          value: "y = 70",
          display_type: "warning dashed",
        },
        {
          value: "y = 90",
          display_type: "error dashed",
        },
      ],
      requests: [
        {
          q: `(avg:ecs.fargate.mem.rss{ecs_task_family:${ecs_task_family}} by {container_id}/avg:ecs.fargate.mem.limit{ecs_task_family:${ecs_task_family}} by {container_id})*100`,
          display_type: "line",
          style: memoryStyle,
        },
        {
          q: `(week_before(avg:ecs.fargate.mem.rss{ecs_task_family:${ecs_task_family}})/week_before(avg:ecs.fargate.mem.limit{ecs_task_family:${ecs_task_family}}))*100`,
          display_type: "line",
          style: weekBeforeStyle,
        },
      ],
    });

    container.addWarningMonitor(
      `Fargate container memory use is high on ${ecs_task_family}`,
      {
        type: "query alert",
        query: `avg(last_15m):(avg:ecs.fargate.mem.rss{ecs_task_family:${ecs_task_family}} by {container_id}/avg:ecs.fargate.mem.limit{ecs_task_family:${ecs_task_family}} by {container_id})*100 > 90`,
        message: `
          {{#is_alert}}
            Memory use for container {{container_id}} is too high, if it hits 100% ECS will automatically restart the
            container. This usually causes a few dropped requests before the ELB marks this instance as unhealthy.
          {{/is_alert}}

          {{#is_recovery}}
            Memory use back within threshold.
          {{/is_recovery}}
      `,
        options: {
          include_tags: false,
          thresholds: {
            critical: 90,
          },
        },
      },
    );

    container.addWidget("Container count", {
      type: "timeseries",
      requests: [
        {
          q: `count_not_null(avg:ecs.fargate.cpu.user{ecs_task_family:${ecs_task_family}} by {container_id})`,
          display_type: "line",
          style: memoryStyle,
        },
        {
          q: `week_before(count_not_null(avg:ecs.fargate.cpu.user{ecs_task_family:${ecs_task_family}} by {container_id}))`,
          display_type: "line",
          style: weekBeforeStyle,
        },
      ],
    });

    container.addWarningMonitor(
      `Fargate container CPU use is high on ${ecs_task_family}`,
      {
        type: "query alert",
        query: `avg(last_15m):avg:ecs.fargate.cpu.percent{ecs_task_family:${ecs_task_family}} by {container_id} > 80`,
        message: `
          {{#is_alert}}
            CPU use for container {{container_id}} is too high, this results in degraded performance and some
            requests may start timing out.
          {{/is_alert}}

          {{#is_recovery}}
            CPU use is back within threshold
          {{/is_recovery}}
                `,
        options: {
          include_tags: false,
          thresholds: {
            critical: 80,
            critical_recovery: 70,
          },
        },
      },
    );

    container.addWidget("CPU utilization (fargate)", {
      type: "timeseries",
      markers: [
        {
          value: "y < 100",
          display_type: "info solid",
        },
      ],
      requests: [
        {
          q: `autosmooth(avg:ecs.fargate.cpu.percent{ecs_task_family:${ecs_task_family}} by {container_id})`,
          display_type: "line",
          style: cpuStyle,
        },
        {
          q: `autosmooth(week_before(avg:ecs.fargate.cpu.percent{ecs_task_family:${ecs_task_family}}))`,
          display_type: "line",
          style: weekBeforeStyle,
        },
      ],
    });
  };
}
