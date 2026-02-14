# gh-deploy-dashboard

A cross-repository deployment dashboard for GitHub. See which commit of each service is deployed to which environment, with drift detection.

Two components:

1. **Tracking Action** — A reusable GitHub Action that records deployments via the GitHub Deployments API
2. **Dashboard** — A single HTML file that visualizes the deployment matrix across services and environments

## Quick Start

### 1. Add the tracking action to each service's deploy workflow

```yaml
# In your service repo: .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      deployments: write # Required
    steps:
      - uses: actions/checkout@v4

      # ... your deploy steps ...

      - uses: RobertKrogh/gh-deploy-dashboard/action@v1
        with:
          environment: staging
```

### 2. Create a config file

```yaml
# .deploy-dashboard.yml
org: your-org
environments: [dev, staging, prod]
services:
  - repo: order-service
  - repo: payment-service
  - repo: gateway-api
    display_name: API Gateway
```

### 3. Open the dashboard

Open `dashboard/index.html` in your browser (or deploy it to GitHub Pages). Enter your GitHub token and point it at your config file.

## Action Reference

### Inputs

| Input             | Required | Default               | Description                                                                                      |
| ----------------- | -------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `environment`     | Yes      | —                     | Target environment name (e.g., `dev`, `staging`, `prod`)                                         |
| `service`         | No       | Repository name       | Service name. Set this for mono-repos to distinguish services.                                   |
| `version`         | No       | Short SHA             | Version string (semver tag, build number, etc.)                                                  |
| `status`          | No       | `success`             | Deployment status: `success`, `failure`, `error`, `inactive`, `in_progress`, `queued`, `pending` |
| `environment-url` | No       | —                     | URL to the deployed environment                                                                  |
| `description`     | No       | Auto-generated        | Free-form description                                                                            |
| `token`           | Yes      | `${{ github.token }}` | GitHub token. The default token works for the current repo.                                      |

### Outputs

| Output          | Description                         |
| --------------- | ----------------------------------- |
| `deployment-id` | ID of the created GitHub deployment |
| `service`       | Resolved service name               |
| `version`       | Resolved version string             |

### Token Permissions

The action requires `deployments: write` permission. Add this to your job:

```yaml
permissions:
  deployments: write
```

## Dashboard Setup

The dashboard is a single `index.html` file with no build step. You can:

- **Open locally** — Just open `dashboard/index.html` in a browser
- **GitHub Pages** — Deploy the `dashboard/` directory to GitHub Pages
- **Any static host** — Copy `index.html` to any web server

### Authentication

The dashboard needs a GitHub token to read deployments across your repos:

- **Personal Access Token (classic)** — Needs `repo` scope
- **Fine-grained PAT** — Needs `deployments:read` permission on each target repo

The token is stored in your browser's `localStorage`. It never leaves your browser except for direct GitHub API calls.

### Configuration

Provide your config in one of two ways:

- **URL** — Point to a raw URL (e.g., `https://raw.githubusercontent.com/org/repo/main/.deploy-dashboard.yml`)
- **Paste** — Paste the YAML directly into the dashboard

## Configuration Reference

```yaml
# Required: GitHub org or user that owns the repos
org: your-org

# Required: Environments in promotion order (left to right in dashboard)
environments:
  - dev
  - staging
  - prod

# Required: Services to track
services:
  # Standard repo (one service per repo)
  - repo: order-service

  # Custom display name
  - repo: gateway-api
    display_name: API Gateway

  # Mono-repo (multiple services in one repo)
  - repo: backend-monorepo
    services:
      - name: auth-module
      - name: billing-module
```

## Mono-Repo Support

For mono-repos where multiple services are deployed from a single repository:

1. **In your workflow**, set the `service` input to differentiate deployments:

   ```yaml
   - uses: RobertKrogh/gh-deploy-dashboard/action@v1
     with:
       environment: staging
       service: auth-module # Tags this deployment
   ```

2. **In your config**, list sub-services under the repo:

   ```yaml
   - repo: backend-monorepo
     services:
       - name: auth-module
       - name: billing-module
   ```

The action stores the service name in the deployment payload. The dashboard filters deployments by matching the payload's `service` field.

## Drift Detection

The dashboard detects "drift" when the commit SHA deployed to your first environment (e.g., `dev`) differs from the last environment (e.g., `prod`). Drifted services are highlighted with an orange indicator.

Drift is computed by comparing the most recent **successful** deployment in the first and last environments listed in your config. Services with deployments in only one environment are not flagged.

## Rate Limits

Each dashboard refresh queries the GitHub API for every service/environment combination:

- ~2 API calls per cell (one for deployments, one for status)
- Example: 10 services x 4 environments = ~80 API calls per refresh

GitHub's REST API allows 5,000 requests/hour for authenticated users. With the default 60-second refresh interval, a 10x4 dashboard uses ~4,800 requests/hour. For larger setups, increase the refresh interval.

## Examples

See the [`examples/`](./examples) directory:

- [`multi-repo.yml`](./examples/multi-repo.yml) — Standard single-service workflow
- [`mono-repo.yml`](./examples/mono-repo.yml) — Mono-repo with path-based change detection
- [`.deploy-dashboard.yml`](./examples/.deploy-dashboard.yml) — Sample config

## Contributing

### Building the action

```bash
cd action
npm install
npm run build      # Compiles to dist/index.js
npm run typecheck   # Type-check only (no emit)
```

The `dist/` directory is committed to the repo (required by GitHub Actions).

### Dashboard

The dashboard is a single HTML file — edit `dashboard/index.html` directly. No build step needed.

## License

MIT
