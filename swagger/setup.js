const express = require("express");
const { specs, swaggerUi } = require("./config");

/**
 * Custom CSS for Swagger UI styling
 */
const customCss = `
  .swagger-ui .topbar {
    background-color: #2c3e50;
    border-bottom: 3px solid #3498db;
  }
  .swagger-ui .topbar .download-url-wrapper { display: none; }
  .swagger-ui .info .title { color: #2c3e50; }
  .swagger-ui .info .description { color: #34495e; }
  .swagger-ui .scheme-container { background: #ecf0f1; padding: 15px; border-radius: 5px; }
  .swagger-ui .opblock-tag {
    font-size: 16px;
    font-weight: bold;
    margin: 20px 0 10px 0;
    color: #2c3e50;
    border-bottom: 2px solid #3498db;
    padding-bottom: 5px;
  }
  .swagger-ui .opblock.opblock-post { border-color: #27ae60; }
  .swagger-ui .opblock.opblock-get { border-color: #3498db; }
  .swagger-ui .opblock.opblock-put { border-color: #f39c12; }
  .swagger-ui .opblock.opblock-patch { border-color: #e67e22; }
  .swagger-ui .opblock.opblock-delete { border-color: #e74c3c; }
  .swagger-ui .btn.authorize { background-color: #3498db; border-color: #3498db; }
  .swagger-ui .btn.authorize:hover { background-color: #2980b9; }
  .swagger-ui .auth-wrapper .auth-container .auth-btn-wrapper { text-align: center; }
  .swagger-ui .model-title { color: #2c3e50; font-weight: bold; }
  .swagger-ui .parameter__name { font-weight: bold; color: #2c3e50; }
  .swagger-ui .response-col_description { color: #34495e; }

  /* Custom header styling */
  .custom-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    text-align: center;
    margin-bottom: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .custom-header h1 {
    margin: 0;
    font-size: 2.5em;
    font-weight: bold;
  }

  .custom-header p {
    margin: 10px 0 0 0;
    font-size: 1.2em;
    opacity: 0.9;
  }

  .api-stats {
    display: flex;
    justify-content: space-around;
    margin: 20px 0;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 10px;
    border: 1px solid #e9ecef;
  }

  .stat-item {
    text-align: center;
  }

  .stat-number {
    font-size: 2em;
    font-weight: bold;
    color: #3498db;
    display: block;
  }

  .stat-label {
    color: #6c757d;
    font-size: 0.9em;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

/**
 * Custom HTML template with additional header information
 */
const customHtml = `
  <div class="custom-header">
    <h1>🤖 Telegram Hisobchi Bot API</h1>
    <p>Advanced Sales Management System with SellerStock Management</p>
  </div>

  <div class="api-stats">
    <div class="stat-item">
      <span class="stat-number">25+</span>
      <span class="stat-label">Endpoints</span>
    </div>
    <div class="stat-item">
      <span class="stat-number">7</span>
      <span class="stat-label">Categories</span>
    </div>
    <div class="stat-item">
      <span class="stat-number">100%</span>
      <span class="stat-label">Documented</span>
    </div>
    <div class="stat-item">
      <span class="stat-number">v2.0</span>
      <span class="stat-label">Version</span>
    </div>
  </div>
`;

/**
 * Swagger UI options configuration
 */
const swaggerOptions = {
  customCss,
  customSiteTitle: "Telegram Hisobchi Bot API Documentation",
  customfavIcon: "/favicon.ico",
  customCssUrl: null,
  swaggerOptions: {
    // API explorer settings
    docExpansion: "none", // 'list', 'full' or 'none'
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    defaultModelRendering: "example", // 'example' or 'model'

    // Request/Response settings
    displayOperationId: false,
    displayRequestDuration: true,
    filter: true, // Enable top bar filter
    showExtensions: false,
    showCommonExtensions: false,

    // Authentication
    persistAuthorization: true, // Keep auth between page reloads

    // UI preferences
    supportedSubmitMethods: ["get", "post", "put", "delete", "patch"],
    tryItOutEnabled: true,

    // Custom ordering
    operationsSorter: "alpha", // 'alpha', 'method' or a function
    tagsSorter: "alpha",

    // Deep linking
    deepLinking: true,

    // Validation
    showMutatedRequest: true,
    syntaxHighlight: {
      activated: true,
      theme: "agate",
    },

    // Custom request interceptor for adding auth headers
    requestInterceptor: function (request) {
      // Add custom headers or modify request here if needed
      const telegramId = localStorage.getItem("telegram-id");
      if (telegramId) {
        request.headers["x-telegram-id"] = telegramId;
      }
      return request;
    },

    // Response interceptor
    responseInterceptor: function (response) {
      // Handle response modifications here if needed
      return response;
    },
  },

  // Add custom HTML content
  customJs: `
    window.onload = function() {
      // Add custom header to the Swagger UI
      const headerDiv = document.createElement('div');
      headerDiv.innerHTML = \`${customHtml}\`;
      const swaggerContainer = document.querySelector('.swagger-ui');
      if (swaggerContainer && swaggerContainer.firstChild) {
        swaggerContainer.insertBefore(headerDiv, swaggerContainer.firstChild);
      }

      // Add auth helper
      const addAuthHelper = () => {
        const authSection = document.querySelector('.auth-wrapper');
        if (authSection && !document.querySelector('.auth-helper')) {
          const helper = document.createElement('div');
          helper.className = 'auth-helper';
          helper.style.cssText = 'background: #e8f4fd; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #3498db;';
          helper.innerHTML = \`
            <strong>🔐 Authentication Guide:</strong><br>
            1. Get your Telegram User ID from @userinfobot<br>
            2. Enter it in the "Value" field above<br>
            3. Click "Authorize" to apply to all requests<br>
            <small>💡 Your auth will persist between page reloads</small>
          \`;
          authSection.appendChild(helper);
        }
      };

      // Add auth helper when auth modal opens
      const observer = new MutationObserver(addAuthHelper);
      observer.observe(document.body, { childList: true, subtree: true });

      // Add endpoint counter
      setTimeout(() => {
        const operations = document.querySelectorAll('.opblock');
        const statNumber = document.querySelector('.stat-number');
        if (statNumber && operations.length > 0) {
          statNumber.textContent = operations.length + '+';
        }
      }, 1000);
    };
  `,
};

/**
 * Setup Swagger UI middleware for Express app
 */
function setupSwagger(app) {
  // Health check endpoint for Swagger
  app.get("/api/swagger/health", (req, res) => {
    res.json({
      status: "OK",
      swagger: {
        version: "2.0.0",
        endpoints: Object.keys(specs.paths || {}).length,
        schemas: Object.keys(specs.components?.schemas || {}).length,
        lastUpdated: new Date().toISOString(),
      },
    });
  });

  // Serve Swagger JSON spec
  app.get("/api/swagger/spec", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });

  // Serve Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

  // Alternative route for documentation
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

  // Redirect root to API docs
  app.get("/", (req, res) => {
    res.redirect("/api-docs");
  });

  console.log("📚 Swagger UI setup completed");
  console.log("📖 API Documentation available at:");
  console.log("   • /api-docs (primary)");
  console.log("   • /docs (alternative)");
  console.log("   • /api/swagger/spec (JSON spec)");
  console.log("   • /api/swagger/health (health check)");

  return app;
}

/**
 * Generate API statistics for monitoring
 */
function getApiStats() {
  const paths = specs.paths || {};
  const schemas = specs.components?.schemas || {};

  const stats = {
    totalEndpoints: 0,
    endpointsByMethod: {},
    endpointsByTag: {},
    totalSchemas: Object.keys(schemas).length,
    version: specs.info?.version || "unknown",
    lastGenerated: new Date().toISOString(),
  };

  // Count endpoints by method and tag
  Object.values(paths).forEach((pathMethods) => {
    Object.entries(pathMethods).forEach(([method, operation]) => {
      if (
        ["get", "post", "put", "patch", "delete"].includes(method.toLowerCase())
      ) {
        stats.totalEndpoints++;

        // Count by method
        const methodUpper = method.toUpperCase();
        stats.endpointsByMethod[methodUpper] =
          (stats.endpointsByMethod[methodUpper] || 0) + 1;

        // Count by tag
        if (operation.tags && operation.tags.length > 0) {
          operation.tags.forEach((tag) => {
            stats.endpointsByTag[tag] = (stats.endpointsByTag[tag] || 0) + 1;
          });
        }
      }
    });
  });

  return stats;
}

module.exports = {
  setupSwagger,
  getApiStats,
  specs,
  swaggerUi,
};
