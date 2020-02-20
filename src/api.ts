/**
 * These are the raw types expected by the datadog api, and a client for interacting with it.
 */

import got, { Method } from "got";
import * as fs from "fs";

export class Client {
  private readonly apiKey: string;
  private readonly applicationKey: string;

  constructor(apiKey: string, applicationKey: string) {
    this.apiKey = apiKey;
    this.applicationKey = applicationKey;
  }

  async getDashboards() {
    const res = await this.do<{ dashboards: DashboardSummary[] }>(
      "GET",
      "/v1/dashboard"
    );
    return res.dashboards;
  }

  async createDashboard(dashboard: Dashboard) {
    const res = await this.do<Dashboard>("POST", "/v1/dashboard", dashboard);
    lock.dashboards[res.id] = dashboard;
    return res;
  }

  async updateDashboard(id: string, dashboard: Dashboard) {
    const res = await this.do<Dashboard>(
      "PUT",
      `/v1/dashboard/${id}`,
      dashboard
    );
    lock.dashboards[id] = dashboard;
    return dashboard;
  }

  async deleteDashboard(id: string) {
    return this.do<any>("DELETE", `/v1/dashboard/${id}`);
  }

  async getMonitors(query?: string) {
    if (query) {
      query = "&query=" + encodeURIComponent(query);
    }
    return await this.do<Monitor[]>("GET", "/v1/monitor?per_page=1000" + query);
  }

  async createMonitor(monitor: Monitor) {
    const res = await this.do<Monitor>("POST", `/v1/monitor`, monitor);
    lock.monitors[res.id] = monitor;
    return monitor;
  }

  async updateMonitor(id: number, monitor: Monitor) {
    const res = await this.do<Monitor>("PUT", `/v1/monitor/${id}`, monitor);
    lock.monitors[id] = monitor;
    return monitor;
  }

  async deleteMonitor(id: number) {
    return this.do<any>("DELETE", `/v1/monitor/${id}`);
  }

  async getSynthetics() {
    const res = await this.do<{ tests: Synthetic[] }>(
      "GET",
      `/v1/synthetics/tests`
    );
    return res.tests;
  }

  async createSynthetic(syn: Synthetic) {
    const res = await this.do<Synthetic>("POST", `/v1/synthetics/tests`, syn);
    syn.public_id = res.public_id;
    lock.synthetics[syn.public_id] = syn;
    return syn;
  }

  async updateSynthetic(id: string, syn: Synthetic) {
    const res = await this.do<HttpSynthetic>(
      "PUT",
      `/v1/synthetics/tests/${id}`,
      syn
    );
    lock.synthetics[id] = syn;
    return syn;
  }

  async deleteSynthetic(id: string) {
    return this.do<any>("DELETE", `/v1/synthetics/tests/${id}`);
  }

  async getSLOs(query: string = "") {
    if (query) {
      query = "&query=" + encodeURIComponent(`"${query}"`);
    }

    const res = await this.do<{
      data: SLO[];
      error?: any;
    }>("GET", "/v1/slo?limit=1000" + query);

    if (res.error) {
      throw res.error;
    }

    return res.data;
  }

  async createSLO(slo: SLO) {
    const res = await this.do<{ data: SLO[] }>("POST", `/v1/slo`, slo);
    lock.slos[res.data[0].id] = slo;
    return slo;
  }

  async updateSLO(id: string, slo: SLO) {
    const res = await this.do<{ data: SLO[] }>("PUT", `/v1/slo/${id}`, slo);
    lock.slos[id] = slo;
    return slo;
  }

  async deleteSLO(id: string) {
    const res = await this.do<{ data: SLO[] }>("DELETE", `/v1/slo/${id}`);
    return res.data[0];
  }

  private async do<T>(method: Method, url: string, body?: any): Promise<T> {
    try {
      const resp = await got("https://api.datadoghq.com/api" + url, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "github.com/99designs/dddk",
          "DD-API-KEY": this.apiKey,
          "DD-APPLICATION-KEY": this.applicationKey
        },
        method: method,
        body: body ? JSON.stringify(body, null, " ") : undefined
      });
      return JSON.parse(resp.body) as T;
    } catch (error) {
      if (error.response && error.response.body) {
        throw "error calling datadog api: " + error.response.body;
      } else {
        throw error;
      }
    }
  }
}

export interface QueryMonitor {
  id?: number;
  type: "query alert";
  query: string;
  name?: string;
  message: string;
  tags?: string[];
  modified?: Date;
  options: MonitorOptions;
}

export interface MetricMonitor {
  id?: number;
  type: "metric alert";
  query: string;
  name?: string;
  message: string;
  tags?: string[];
  modified?: Date;
  options: MonitorOptions;
}

export interface MonitorOptions {
  notify_audit?: boolean;
  locked?: boolean;
  timeout_h?: number;
  silenced?: any;
  include_tags?: boolean;
  no_data_timeframe?: number;
  require_full_window?: boolean;
  new_host_delay?: number;
  evaluation_delay?: number;
  notify_no_data?: boolean;
  renotify_interval?: number;
  escalation_message?: string;
  thresholds?: {
    critical?: number;
    critical_recovery?: number;
    warning?: number;
    warning_recovery?: number;
  };
  threshold_windows?: {
    trigger_window?: string;
    recovery_window?: string;
  };
}

export type Monitor = QueryMonitor | MetricMonitor;

export interface Threshold {
  timeframe: string;
  target: number;
  target_display?: string;
  warning?: number;
  warning_display?: string;
}

export interface MonitorSLO {
  id?: string;
  name?: string;
  description: string;
  tags?: string[];
  thresholds: Threshold[];
  type: "monitor";
  monitor_ids: number[];
  groups?: string[];
  created_at?: string;
  modified_at?: string;
}

export type SLO = MonitorSLO;

export interface TimeSeries {
  type: "timeseries";
  requests: (Request | ApmRequest)[];
  yaxis?: Axis;
  events?: Event[];
  markers?: Marker[];
  title?: string;
  show_legend?: boolean;
  legend_size?: string;
}

export interface Change {
  type: "change";
  requests: Request[];
  title?: string;
}

export interface QueryValue {
  type: "query_value";
  requests: Request[];
  autoscale?: boolean;
  precision?: number;
  title?: string;
}

export interface TopList {
  type: "toplist";
  requests: (Request | ApmRequest)[];
  title?: string;
}

export interface SLOWidget {
  type: "slo";
  viz: "slo";
  slo_id: string;
  time_windows: string[];
  show_error_budget: boolean;
  title?: string;
  legend_size?: string;
  legend?: boolean;

  loading?: boolean;
  data?: any;
  view_type?: "detail";
  view_mode?: "overall";
}

export interface Group {
  type: "group";
  layout_type: "ordered";
  title?: string;
  widgets: Widget[];
}

export type WidgetDefinition =
  | TimeSeries
  | TopList
  | SLOWidget
  | Group
  | QueryValue
  | Change;

export interface Widget {
  definition: WidgetDefinition;
  id?: number;
  layout?: Layout;
}

export interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Request {
  q: string;
  style?: Style;
  metadata?: Metadata[];
  display_type?: "area" | "bars" | "line";
  aggregator?: "avg";
  change_type?: "absolute";
  compare_to?: "week_before";
  increase_good?: boolean;
  order_by?: "change";
  order_dir?: "desc";
}

export interface ApmRequest {
  apm_query: ApmQuery;
  style?: Style;
  metadata?: Metadata[];
  display_type?: "area" | "bars" | "line";
}

export interface ApmQuery {
  index: string;
  search: {
    query: string;
  };
  group_by: [
    {
      facet: string;
      limit: number;
      sort: {
        order: string;
        aggregation: string;
        facet?: string;
      };
    }
  ];
  compute: {
    aggregation: string;
    facet?: string;
  };
}

export interface Event {
  q: string;
}

export interface Style {
  palette?: "purple" | "dog_classic" | "cool" | "warm" | "orange" | "grey";
  line_type?: "dashed" | "dotted" | "solid";
  line_width?: "normal" | "thick" | "thin";
}

export interface Metadata {
  expression: string;
  alias_name?: string;
}

export interface Marker {
  value: string;
  display_type?:
    | "info dashed"
    | "warning dashed"
    | "error dashed"
    | "ok dashed"
    | "info solid"
    | "warning solid"
    | "error solid"
    | "ok solid";
  label?: string;
}

export interface Axis {
  scale?: string;
  min?: string;
  max?: string;
  include_zero?: boolean;
}

export interface Dashboard {
  id?: string;
  title: string;
  widgets: Widget[];
  layout_type: "ordered" | "free";
  description?: string;
  is_read_only?: boolean;
  notify_list?: string[];
  template_variables?: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  default?: string;
  prefix?: string;
}

export interface DashboardSummary {
  created_at: Date;
  is_read_only: boolean;
  description: string;
  title: string;
  url: string;
  layout_type: string;
  modified_at: string;
  author_handle: string;
  id: string;
}

type Location =
  | "aws:ap-northeast-1"
  | "aws:ap-northeast-2"
  | "aws:ap-south-1"
  | "aws:ap-southeast-1"
  | "aws:ap-southeast-2"
  | "aws:ca-central-1"
  | "aws:eu-central-1"
  | "aws:eu-west-1"
  | "aws:eu-west-2"
  | "aws:sa-east-1"
  | "aws:us-east-2"
  | "aws:us-west-1"
  | "aws:us-west-2";

export interface Options {
  tick_every: number;
  min_failure_duration?: number;
  min_location_failed?: number;
  follow_redirects?: boolean;
  device_ids?: Device[];
}

interface Assertion {
  operator: string;
  type: "statusCode" | "responseCode" | "header";
  property?: string;
  target: any;
}

type Device = "laptop_large" | "tablet" | "mobile_small";

export interface HttpSynthetic {
  public_id?: string;
  name?: string;
  type: "api";
  subtype?: "http" | "ssl";
  locations: Location[];
  tags?: string[];
  options: Options;
  config: {
    assertions: Assertion[];
    request: {
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      url: string;
      basicAuth?: {
        username: string;
        password: string;
      };
      timeout?: number;
      headers?: { [k: string]: string };
      cookies?: { [k: string]: string };
      body?: string;
      port?: number;
      host?: string;
    };
  };
  message: string;
  modified_at?: string;
}

export type Synthetic = HttpSynthetic;

export interface Lock {
  monitors: { [id: string]: Monitor };
  dashboards: { [id: string]: Dashboard };
  synthetics: { [public_id: string]: Synthetic };
  slos: { [id: string]: SLO };
}

export let lock: Lock = {
  monitors: {},
  dashboards: {},
  synthetics: {},
  slos: {}
};

if (fs.existsSync("lock.json")) {
  console.log("Found old lock file");
  lock = JSON.parse(fs.readFileSync("lock.json").toString());
} else {
  console.log("WARNING: No lock file! This operation may take some time.");
}
