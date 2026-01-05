const fs = require("fs");
const path = require("path");

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Extract endpoints from route files
function extractEndpointsFromRoutes() {
  const routesDir = path.join(__dirname, "../routes");
  const endpoints = [];

  const routeFiles = [
    { file: "admin.js", prefix: "/api/admin" },
    { file: "analytics.js", prefix: "/api/analytics" },
    { file: "auth.js", prefix: "/api/auth" },
    { file: "categories.js", prefix: "/api/categories" },
    { file: "products.js", prefix: "/api/products" },
    { file: "reports.js", prefix: "/api/reports" },
    { file: "sales.js", prefix: "/api/sales" },
    { file: "seller.js", prefix: "/api/seller" },
    { file: "transfers.js", prefix: "/api/transfers" },
  ];

  routeFiles.forEach(({ file, prefix }) => {
    const filePath = path.join(routesDir, file);
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      // Try to match single-line route definition
      let match = line.match(
        /router\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/,
      );

      // If no match, check if this is a multiline route definition
      if (
        !match &&
        line.match(/router\.(get|post|put|patch|delete)\s*\(\s*$/)
      ) {
        const methodMatch = line.match(/router\.(get|post|put|patch|delete)/);
        if (methodMatch && index + 1 < lines.length) {
          const nextLine = lines[index + 1];
          const pathMatch = nextLine.match(/^\s*["']([^"']+)["']/);
          if (pathMatch) {
            match = [null, methodMatch[1], pathMatch[1]];
          }
        }
      }

      if (match) {
        const method = match[1].toUpperCase();
        let endpoint = match[2];

        // Convert express params to swagger params
        endpoint = endpoint.replace(/:(\w+)/g, "{$1}");

        const fullPath =
          prefix + (endpoint.startsWith("/") ? endpoint : "/" + endpoint);

        // Normalize path - remove trailing slash unless it's just "/"
        const normalizedPath =
          fullPath.length > 1 && fullPath.endsWith("/")
            ? fullPath.slice(0, -1)
            : fullPath;

        endpoints.push({
          method,
          path: normalizedPath,
          file,
          line: index + 1,
        });
      }
    }
  });

  return endpoints;
}

// Extract endpoints from Swagger docs
function extractEndpointsFromSwagger() {
  const swaggerDir = path.join(__dirname, "../swagger/paths");
  const endpoints = [];

  const swaggerFiles = fs
    .readdirSync(swaggerDir)
    .filter((f) => f.endsWith(".js"));

  swaggerFiles.forEach((file) => {
    const filePath = path.join(swaggerDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    let currentPath = null;
    let currentMethod = null;

    lines.forEach((line, index) => {
      // Match path definition: * /api/something:
      const pathMatch = line.match(/^\s*\*\s+(\/api\/[^:]+):/);
      if (pathMatch) {
        let path = pathMatch[1].trim();
        // Normalize path - remove trailing slash unless it's just "/"
        currentPath =
          path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
      }

      // Match method definition: *   get:, *   post:, etc.
      const methodMatch = line.match(/^\s*\*\s+(get|post|put|patch|delete):/);
      if (methodMatch && currentPath) {
        currentMethod = methodMatch[1].toUpperCase();
        endpoints.push({
          method: currentMethod,
          path: currentPath,
          file,
          line: index + 1,
        });
        currentPath = null;
        currentMethod = null;
      }
    });
  });

  return endpoints;
}

// Compare endpoints
function compareEndpoints(routeEndpoints, swaggerEndpoints) {
  const missingInSwagger = [];
  const missingInRoutes = [];
  const matched = [];

  // Find endpoints in routes but not in swagger
  routeEndpoints.forEach((routeEp) => {
    const found = swaggerEndpoints.find(
      (swaggerEp) =>
        swaggerEp.method === routeEp.method && swaggerEp.path === routeEp.path,
    );

    if (found) {
      matched.push({
        method: routeEp.method,
        path: routeEp.path,
        routeFile: routeEp.file,
        swaggerFile: found.file,
      });
    } else {
      missingInSwagger.push(routeEp);
    }
  });

  // Find endpoints in swagger but not in routes
  swaggerEndpoints.forEach((swaggerEp) => {
    const found = routeEndpoints.find(
      (routeEp) =>
        routeEp.method === swaggerEp.method && routeEp.path === swaggerEp.path,
    );

    if (!found) {
      missingInRoutes.push(swaggerEp);
    }
  });

  return { matched, missingInSwagger, missingInRoutes };
}

// Print results
function printResults(routeEndpoints, swaggerEndpoints, comparison) {
  console.log("\n" + "=".repeat(80));
  console.log(colors.cyan + "📊 ENDPOINT AUDIT REPORT" + colors.reset);
  console.log("=".repeat(80) + "\n");

  // Summary
  console.log(colors.blue + "📈 SUMMARY:" + colors.reset);
  console.log(`   Total endpoints in routes:  ${routeEndpoints.length}`);
  console.log(`   Total endpoints in Swagger: ${swaggerEndpoints.length}`);
  console.log(
    `   Matched endpoints:          ${colors.green}${comparison.matched.length}${colors.reset}`,
  );
  console.log(
    `   Missing in Swagger:         ${comparison.missingInSwagger.length > 0 ? colors.red : colors.green}${comparison.missingInSwagger.length}${colors.reset}`,
  );
  console.log(
    `   Missing in Routes:          ${comparison.missingInRoutes.length > 0 ? colors.red : colors.green}${comparison.missingInRoutes.length}${colors.reset}`,
  );
  console.log("");

  // Matched endpoints
  if (comparison.matched.length > 0) {
    console.log(
      colors.green +
        "✅ MATCHED ENDPOINTS (" +
        comparison.matched.length +
        "):" +
        colors.reset,
    );
    comparison.matched.sort(
      (a, b) =>
        a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
    );
    comparison.matched.forEach((ep) => {
      console.log(
        `   ${colors.green}✓${colors.reset} ${ep.method.padEnd(7)} ${ep.path}`,
      );
    });
    console.log("");
  }

  // Missing in Swagger
  if (comparison.missingInSwagger.length > 0) {
    console.log(
      colors.red +
        "❌ MISSING IN SWAGGER (" +
        comparison.missingInSwagger.length +
        "):" +
        colors.reset,
    );
    comparison.missingInSwagger.sort(
      (a, b) =>
        a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
    );
    comparison.missingInSwagger.forEach((ep) => {
      console.log(
        `   ${colors.red}✗${colors.reset} ${ep.method.padEnd(7)} ${ep.path}`,
      );
      console.log(
        `     ${colors.yellow}→ Found in: routes/${ep.file}:${ep.line}${colors.reset}`,
      );
    });
    console.log("");
  }

  // Missing in Routes (might be outdated docs)
  if (comparison.missingInRoutes.length > 0) {
    console.log(
      colors.yellow +
        "⚠️  DOCUMENTED BUT NOT IMPLEMENTED (" +
        comparison.missingInRoutes.length +
        "):" +
        colors.reset,
    );
    comparison.missingInRoutes.sort(
      (a, b) =>
        a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
    );
    comparison.missingInRoutes.forEach((ep) => {
      console.log(
        `   ${colors.yellow}!${colors.reset} ${ep.method.padEnd(7)} ${ep.path}`,
      );
      console.log(
        `     ${colors.yellow}→ Found in: swagger/paths/${ep.file}:${ep.line}${colors.reset}`,
      );
    });
    console.log("");
  }

  // Detailed route breakdown
  console.log(colors.blue + "📋 ENDPOINTS BY ROUTE FILE:" + colors.reset);
  const routesByFile = {};
  routeEndpoints.forEach((ep) => {
    if (!routesByFile[ep.file]) routesByFile[ep.file] = [];
    routesByFile[ep.file].push(ep);
  });

  Object.keys(routesByFile)
    .sort()
    .forEach((file) => {
      const eps = routesByFile[file];
      const documented = eps.filter((ep) =>
        comparison.matched.find(
          (m) => m.method === ep.method && m.path === ep.path,
        ),
      ).length;
      const coverage = ((documented / eps.length) * 100).toFixed(1);

      const coverageColor =
        coverage == 100
          ? colors.green
          : coverage >= 80
            ? colors.yellow
            : colors.red;
      console.log(
        `   ${file.padEnd(20)} ${eps.length} endpoints, ${coverageColor}${coverage}% documented${colors.reset}`,
      );
    });

  console.log("\n" + "=".repeat(80));

  // Final verdict
  if (
    comparison.missingInSwagger.length === 0 &&
    comparison.missingInRoutes.length === 0
  ) {
    console.log(
      colors.green +
        "🎉 SUCCESS! All endpoints are properly documented!" +
        colors.reset,
    );
  } else {
    console.log(
      colors.yellow +
        "⚠️  ACTION REQUIRED: Some endpoints need attention!" +
        colors.reset,
    );
  }
  console.log("=".repeat(80) + "\n");

  return (
    comparison.missingInSwagger.length === 0 &&
    comparison.missingInRoutes.length === 0
  );
}

// Main execution
try {
  console.log(colors.cyan + "\n🔍 Starting endpoint audit...\n" + colors.reset);

  const routeEndpoints = extractEndpointsFromRoutes();
  const swaggerEndpoints = extractEndpointsFromSwagger();
  const comparison = compareEndpoints(routeEndpoints, swaggerEndpoints);

  const success = printResults(routeEndpoints, swaggerEndpoints, comparison);

  process.exit(success ? 0 : 1);
} catch (error) {
  console.error(
    colors.red + "\n❌ Error during audit:" + colors.reset,
    error.message,
  );
  console.error(error.stack);
  process.exit(1);
}
