dddk
====

Do you have lots of services? Do you wish they had a consistent set of monitors, alerting to
the right teams? What about SLOs automatically generated containing all serious issues? And to dump
those straight onto dashboards per app, or rollup stats for the team/company?

Well wish no more! The Datadog Dev Kit does this for you using a simple typescript CLI that gives you full
autocomplete as you describe your services.

### Getting started

Best way to get started is to fetch the scaffolding and work from there.

```bash
npx degit 99designs/dddk-init my-repo
```

To create the example dashboards:

```bash
DD_API_KEY=AAA DD_APP_KEY=BBB npm run push
```

### What does it do?

For each service there are four DataDog objects which are managed by dddk.

* Dashboards
* Monitors
* Synthetics
* Service Level Objectives (SLOs)

Many of these objects are reused across multiple apps. For example, you might want the same set of fargate metrics
across all of your services running fargate. In dddk these sets of reusable objects are called *components*.
App '.ts' files in apps consist of *components* and sometimes custom objects. dddk systematically generates relevant
objects for each app and pushes them to DataDog.

DataDog Development Kit enables small modifications to be easily propagated through the entire ecosystem of
applications. Without dddk, ecosystem wide changes are tedious to apply and prone to human error.

#### How does it know what to update?

Objects are matched based on title, which include the `created by:dddk` tag.

Dashboards are updated which have "managed by [dddk](github.com/99designs/dddk)" in the description.

A lock file keeps track of the expected state on DataDog - only pushing the modified objects.
