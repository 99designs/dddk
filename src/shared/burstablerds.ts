import { Component } from "../index";

export default function burstablerds(...dbname: string[]): Component {
  return container => {
    dbname.forEach(dbname =>
      container.addWarningMonitor(`EC2 CPU credit balance is low on ${dbname}`, {
        type: "metric alert",
        query: `max(last_1h):avg:aws.rds.cpucredit_balance{name:${dbname}} by {host} <= 100`,
        message: `{{#is_warning}}
            RDS CPUCreditBalance for {{host.name}} is below 200. Things will alert if it gets below 50%. Check what is happening on the RDS instance (why is the CPU credit balance depleting?).
        {{/is_warning}}

        {{#is_alert}}
            RDS CPUCreditBalance for {{host.name}} is below 100! Throttling will occur if balance depletes.
        {{/is_alert}}

        {{#is_recovery}}
            RDS CPUCreditBalance for {{host.name}} is looking better now.
        {{/is_recovery}}`,
        tags: [],
        options: {
          notify_audit: false,
          locked: false,
          timeout_h: 0,
          silenced: {},
          include_tags: false,
          no_data_timeframe: null,
          new_host_delay: 3600,
          require_full_window: true,
          notify_no_data: false,
          renotify_interval: 0,
          thresholds: {
            critical: 100,
            warning: 200
          }
        }
    }),
    );
  };
}
