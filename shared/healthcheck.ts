import { Component } from "../src";

// Creates a simple datadog synthetic that pings your app.
export default function healthcheck(url: string): Component {
  return container => {
    container.addSynthetic(`Healthcheck for ${container.name}`, {
      message: `Unable to reach ${url}, are you sure ${container.name} is up?`,
      type: "api",
      config: {
        assertions: [{ type: "statusCode", operator: "is", target: 200 }],
        request: {
          method: "GET",
          url: url,
          timeout: 30,
          port: 443,
        },
      },
      locations: ["aws:ap-northeast-1", "aws:us-east-2", "aws:eu-west-1"],
      options: {
        tick_every: 60,
        min_failure_duration: 90,
        min_location_failed: 1,
      },
    });
  };
}
