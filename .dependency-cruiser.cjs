/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Disallow circular dependencies in application code.",
      from: { path: "^(js|src|scripts)/" },
      to: { circular: true }
    },
    {
      name: "no-feature-cross-imports",
      severity: "warn",
      comment: "Flag direct cross-feature imports outside shared utility folders.",
      from: {
        path: "^js/(agenda|components|data|i18n|workers)/",
        pathNot: "^js/(utils|vendor|workers)/"
      },
      to: {
        path: "^js/(agenda|components|data|i18n)/",
        pathNot: "^js/utils/"
      }
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Find files not reachable from known entry points.",
      from: {
        orphan: true,
        path: "^(js|src|scripts)/",
        pathNot: "(^js/vendor/|\.test\.|\.spec\.)"
      },
      to: {}
    }
  ],
  options: {
    doNotFollow: {
      path: "node_modules"
    },
    includeOnly: "^(js|src|scripts)/|service-worker\\.js$|server\\.cjs$",
    exclude: {
      path: "(^js/vendor/|^coverage/|^playwright-report/|^test-results/|^graphify-out/|^_bmad/|^_bmad-output/)"
    },
    tsPreCompilationDeps: false,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"]
    }
  }
};
