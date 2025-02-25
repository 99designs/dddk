/**
 * These are the raw types expected by the datadog api.
 */

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

export interface CompositeMonitor {
  id?: number;
  type: "composite";
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

export type Monitor = QueryMonitor | MetricMonitor | CompositeMonitor;

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
