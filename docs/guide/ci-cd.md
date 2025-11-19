# CI/CD Integration

Integrate repo-roller into your CI/CD pipelines to automate bundle generation, documentation updates, code analysis, and artifact storage. This guide covers GitHub Actions, GitLab CI, and other popular CI/CD platforms.

## Why Use repo-roller in CI/CD

**Common use cases:**

- **Automated Documentation** - Generate code bundles on releases
- **PR Analysis** - Create bundles of PR changes for review
- **Release Artifacts** - Include code bundles in releases
- **Continuous Documentation** - Keep docs synchronized with code
- **Quality Gates** - Ensure code fits within token budgets
- **Change Tracking** - Historical bundles for each release

## GitHub Actions

### Basic Workflow

Generate bundles on push to main:

```yaml
# .github/workflows/repo-roller.yml
name: Generate Code Bundle

on:
  push:
    branches: [main]

jobs:
  generate-bundle:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install repo-roller
        run: npm install -g repo-roller

      - name: Generate bundle
        run: |
          repo-roller --preset typescript \
            --no-tests \
            --strip-comments \
            -o bundle.md

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: code-bundle
          path: bundle.md
```

### PR Change Analysis

Generate bundles for pull request changes:

```yaml
# .github/workflows/pr-bundle.yml
name: PR Code Bundle

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  pr-bundle:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for git diff

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install repo-roller
        run: npm install -g repo-roller

      - name: Generate PR diff bundle
        run: |
          repo-roller --diff origin/${{ github.base_ref }} \
            --preset typescript \
            --no-tests \
            -o pr-changes.md

      - name: Upload PR bundle
        uses: actions/upload-artifact@v4
        with:
          name: pr-bundle-${{ github.event.pull_request.number }}
          path: pr-changes.md

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const stats = fs.readFileSync('pr-changes.md', 'utf8')
              .match(/Estimated Tokens: ([\d,]+)/);

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `📦 Code bundle generated for this PR!\n\n` +
                    `Tokens: ${stats ? stats[1] : 'N/A'}\n\n` +
                    `[Download bundle](https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})`
            });
```

### Release Bundles

Generate and attach bundles to GitHub releases:

```yaml
# .github/workflows/release.yml
name: Release with Bundle

on:
  release:
    types: [created]

jobs:
  release-bundle:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install repo-roller
        run: npm install -g repo-roller

      - name: Generate release bundle
        run: |
          VERSION=${{ github.ref_name }}
          repo-roller --preset typescript \
            --no-tests \
            --strip-comments \
            --format json \
            -o "release-${VERSION}-bundle.json"

      - name: Upload to release
        uses: softprops/action-gh-release@v1
        with:
          files: release-*.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Token Budget Check

Fail CI if bundle exceeds token budget:

```yaml
# .github/workflows/token-check.yml
name: Token Budget Check

on:
  pull_request:
    branches: [main]

jobs:
  token-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install repo-roller
        run: npm install -g repo-roller

      - name: Check token budget
        run: |
          # Generate bundle and check token count
          repo-roller --diff origin/main \
            --preset typescript \
            --max-tokens 100000 \
            --stats-only

          # Exit code 1 if exceeds budget
          if [ $? -ne 0 ]; then
            echo "❌ PR exceeds token budget!"
            exit 1
          fi

          echo "✅ PR within token budget"
```

### Scheduled Documentation

Generate documentation weekly:

```yaml
# .github/workflows/weekly-docs.yml
name: Weekly Documentation

on:
  schedule:
    # Every Monday at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch:  # Manual trigger

jobs:
  generate-docs:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install repo-roller
        run: npm install -g repo-roller

      - name: Generate documentation bundle
        run: |
          DATE=$(date +%Y-%m-%d)
          repo-roller --preset docs \
            --format markdown \
            -o "docs-${DATE}.md"

      - name: Commit documentation
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add docs-*.md
          git commit -m "docs: weekly documentation bundle" || true
          git push || true
```

## GitLab CI

### Basic Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - bundle

generate-bundle:
  stage: bundle
  image: node:20

  before_script:
    - npm install -g repo-roller

  script:
    - |
      repo-roller --preset typescript \
        --no-tests \
        --strip-comments \
        -o bundle.md

  artifacts:
    paths:
      - bundle.md
    expire_in: 30 days

  only:
    - main
```

### Merge Request Bundles

```yaml
# .gitlab-ci.yml
mr-bundle:
  stage: bundle
  image: node:20

  before_script:
    - npm install -g repo-roller

  script:
    - |
      # Fetch target branch for diff
      git fetch origin $CI_MERGE_REQUEST_TARGET_BRANCH_NAME

      repo-roller --diff origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME \
        --preset typescript \
        -o mr-changes.md

  artifacts:
    paths:
      - mr-changes.md
    expire_in: 7 days

  only:
    - merge_requests
```

### Release Pipeline

```yaml
# .gitlab-ci.yml
release-bundle:
  stage: bundle
  image: node:20

  before_script:
    - npm install -g repo-roller

  script:
    - |
      repo-roller --preset typescript \
        --no-tests \
        --format json \
        -o "release-${CI_COMMIT_TAG}-bundle.json"

  artifacts:
    paths:
      - release-*.json

  release:
    tag_name: $CI_COMMIT_TAG
    description: 'Release $CI_COMMIT_TAG'
    assets:
      links:
        - name: 'Code Bundle'
          url: 'release-${CI_COMMIT_TAG}-bundle.json'

  only:
    - tags
```

## CircleCI

### Basic Config

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  generate-bundle:
    docker:
      - image: cimg/node:20.0

    steps:
      - checkout

      - run:
          name: Install repo-roller
          command: npm install -g repo-roller

      - run:
          name: Generate bundle
          command: |
            repo-roller --preset typescript \
              --no-tests \
              --strip-comments \
              -o bundle.md

      - store_artifacts:
          path: bundle.md
          destination: code-bundle

workflows:
  main:
    jobs:
      - generate-bundle:
          filters:
            branches:
              only: main
```

## Jenkins

### Jenkinsfile

```groovy
// Jenkinsfile
pipeline {
    agent any

    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g repo-roller'
            }
        }

        stage('Generate Bundle') {
            steps {
                sh '''
                    repo-roller --preset typescript \
                        --no-tests \
                        --strip-comments \
                        -o bundle.md
                '''
            }
        }

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'bundle.md', fingerprint: true
            }
        }
    }

    post {
        success {
            echo 'Bundle generated successfully!'
        }
    }
}
```

## Azure Pipelines

### Pipeline YAML

```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: |
      npm install -g repo-roller
    displayName: 'Install repo-roller'

  - script: |
      repo-roller --preset typescript \
        --no-tests \
        --strip-comments \
        -o bundle.md
    displayName: 'Generate bundle'

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: 'bundle.md'
      artifactName: 'code-bundle'
    displayName: 'Publish bundle'
```

## Advanced Patterns

### Multi-Format Generation

Generate bundles in multiple formats:

```yaml
# GitHub Actions
- name: Generate multi-format bundles
  run: |
    # Markdown for LLMs
    repo-roller --preset typescript -o bundle.md

    # JSON for tooling
    repo-roller --preset typescript --format json -o bundle.json

    # YAML for readability
    repo-roller --preset typescript --format yaml -o bundle.yaml

- name: Upload all formats
  uses: actions/upload-artifact@v4
  with:
    name: bundles-multi-format
    path: |
      bundle.md
      bundle.json
      bundle.yaml
```

### Conditional Generation

Only generate if files changed:

```yaml
# GitHub Actions
- name: Check for code changes
  id: changes
  uses: dorny/paths-filter@v2
  with:
    filters: |
      code:
        - 'src/**'
        - 'lib/**'

- name: Generate bundle
  if: steps.changes.outputs.code == 'true'
  run: repo-roller --preset typescript -o bundle.md
```

### Matrix Builds

Generate bundles for multiple configurations:

```yaml
# GitHub Actions
strategy:
  matrix:
    preset: [typescript, python, go]

steps:
  - uses: actions/checkout@v4

  - name: Install repo-roller
    run: npm install -g repo-roller

  - name: Generate bundle for ${{ matrix.preset }}
    run: |
      repo-roller --preset ${{ matrix.preset }} \
        -o bundle-${{ matrix.preset }}.md

  - name: Upload artifact
    uses: actions/upload-artifact@v4
    with:
      name: bundle-${{ matrix.preset }}
      path: bundle-${{ matrix.preset }}.md
```

### S3/Cloud Storage

Upload bundles to cloud storage:

```yaml
# GitHub Actions with AWS
- name: Generate bundle
  run: repo-roller --preset typescript -o bundle.md

- name: Upload to S3
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  run: |
    aws s3 cp bundle.md \
      s3://my-bucket/bundles/$(date +%Y-%m-%d)/bundle.md
```

### Docker Integration

Use repo-roller in Docker containers:

```yaml
# GitHub Actions
- name: Build and run in Docker
  run: |
    docker run --rm \
      -v $(pwd):/workspace \
      -w /workspace \
      node:20 \
      sh -c "npm install -g repo-roller && repo-roller --preset typescript -o bundle.md"

- name: Upload artifact
  uses: actions/upload-artifact@v4
  with:
    name: docker-bundle
    path: bundle.md
```

### Parallel Generation

Generate multiple bundles in parallel:

```yaml
# GitHub Actions
jobs:
  frontend-bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g repo-roller
      - run: repo-roller --include "frontend/**" -o frontend.md
      - uses: actions/upload-artifact@v4
        with:
          name: frontend-bundle
          path: frontend.md

  backend-bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g repo-roller
      - run: repo-roller --include "backend/**" -o backend.md
      - uses: actions/upload-artifact@v4
        with:
          name: backend-bundle
          path: backend.md
```

## Environment Variables

Configure repo-roller via environment variables:

```yaml
# GitHub Actions
- name: Generate bundle
  env:
    REPO_ROLLER_TARGET: claude-3.5-sonnet
    NO_COLOR: 1  # Disable colors in CI
  run: |
    repo-roller --preset typescript \
      --max-tokens 100000 \
      -o bundle.md
```

## Caching

Speed up CI with npm caching:

```yaml
# GitHub Actions
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'

- name: Install repo-roller
  run: npm install -g repo-roller
```

Or cache the installation:

```yaml
# GitHub Actions
- name: Cache repo-roller
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

- name: Install repo-roller
  run: npm install -g repo-roller
```

## Quality Gates

### Token Budget Gate

Fail build if bundle exceeds token limit:

```yaml
# GitHub Actions
- name: Token budget check
  run: |
    set -e
    repo-roller --preset typescript \
      --max-tokens 150000 \
      --stats-only \
      || { echo "Token budget exceeded!"; exit 1; }
```

### Cost Budget Gate

Fail build if estimated cost too high:

```yaml
# GitHub Actions
- name: Cost budget check
  run: |
    set -e
    repo-roller --preset typescript \
      --max-cost 5.00 \
      --target claude-3.5-sonnet \
      --stats-only \
      || { echo "Cost budget exceeded!"; exit 1; }
```

### File Count Gate

Fail if too many files:

```yaml
# GitHub Actions
- name: File count check
  run: |
    FILE_COUNT=$(repo-roller --stats-only --preset typescript | grep "Total Files" | awk '{print $3}')
    if [ "$FILE_COUNT" -gt 100 ]; then
      echo "Too many files: $FILE_COUNT"
      exit 1
    fi
```

## Notification Integration

### Slack Notifications

Send bundle to Slack:

```yaml
# GitHub Actions
- name: Generate bundle
  run: repo-roller --preset typescript -o bundle.md

- name: Send to Slack
  env:
    SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
  run: |
    STATS=$(grep "Estimated Tokens" bundle.md)
    curl -X POST $SLACK_WEBHOOK \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"Code bundle generated: $STATS\"}"
```

### Discord Webhooks

```yaml
# GitHub Actions
- name: Notify Discord
  env:
    DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK }}
  run: |
    curl -X POST $DISCORD_WEBHOOK \
      -H 'Content-Type: application/json' \
      -d '{"content":"New code bundle generated! Check artifacts."}'
```

## Best Practices

### 1. Use Appropriate Presets

Choose presets that match your CI needs:

```yaml
# Fast, minimal output for quality gates
repo-roller --preset minimal --stats-only

# Complete bundles for releases
repo-roller --preset typescript --with-tree --with-stats
```

### 2. Set Timeouts

Prevent long-running jobs:

```yaml
# GitHub Actions
- name: Generate bundle
  timeout-minutes: 10
  run: repo-roller --preset typescript -o bundle.md
```

### 3. Use Caching

Cache repo-roller installation:

```yaml
# GitHub Actions
- name: Cache global npm
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: npm-global-${{ runner.os }}
```

### 4. Minimize Artifacts

Keep artifacts small:

```yaml
# Use compact format and strip comments
repo-roller --preset typescript \
  --strip-comments \
  --compact \
  -o bundle.md
```

### 5. Clean Up Old Artifacts

Set expiration:

```yaml
# GitHub Actions
- uses: actions/upload-artifact@v4
  with:
    name: code-bundle
    path: bundle.md
    retention-days: 7  # Delete after 7 days
```

### 6. Use Secrets for Sensitive Data

Never hardcode tokens or keys:

```yaml
# GitHub Actions
- name: Upload to S3
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  run: aws s3 cp bundle.md s3://my-bucket/
```

### 7. Fail Fast

Check requirements before generating:

```yaml
# GitHub Actions
- name: Validate environment
  run: |
    if [ ! -d "src" ]; then
      echo "src/ directory not found"
      exit 1
    fi

- name: Generate bundle
  run: repo-roller --preset typescript -o bundle.md
```

## Troubleshooting

### Installation Fails

**Problem:** `npm install -g repo-roller` fails

**Solution:**

```yaml
# Use specific version
- run: npm install -g repo-roller@latest

# Or use npx
- run: npx repo-roller --preset typescript -o bundle.md
```

### Out of Memory

**Problem:** CI runs out of memory

**Solution:**

```yaml
# Limit bundle size
- run: |
    repo-roller --preset typescript \
      --max-tokens 100000 \
      -o bundle.md

# Or increase memory (GitHub Actions)
# Use larger runner or split into multiple jobs
```

### Artifacts Not Uploading

**Problem:** Artifacts missing

**Solution:**

```yaml
# Verify file exists
- name: Check bundle
  run: ls -lh bundle.md

# Upload with explicit path
- uses: actions/upload-artifact@v4
  with:
    name: bundle
    path: ./bundle.md
    if-no-files-found: error
```

### Git Diff Issues

**Problem:** `--diff` fails in CI

**Solution:**

```yaml
# Fetch full history
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Full history

# Fetch specific branch
- run: git fetch origin main:main

# Then diff
- run: repo-roller --diff main -o diff.md
```

## Use Case Examples

### Documentation Pipeline

```yaml
name: Auto Documentation

on:
  push:
    branches: [main]
    paths:
      - 'src/**'

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g repo-roller

      - name: Generate API docs
        run: |
          repo-roller --include "src/api/**" \
            --preset typescript \
            -o docs/api-bundle.md

      - name: Commit docs
        run: |
          git config user.name "Docs Bot"
          git config user.email "bot@example.com"
          git add docs/
          git commit -m "docs: update API bundle" || true
          git push
```

### Release Checklist

```yaml
name: Release Checklist

on:
  pull_request:
    types: [labeled]

jobs:
  release-prep:
    if: github.event.label.name == 'release'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g repo-roller

      - name: Generate release bundle
        run: |
          repo-roller --preset typescript \
            --no-tests \
            --format json \
            -o release-bundle.json

      - name: Check bundle quality
        run: |
          # Verify token count
          repo-roller --stats-only --max-tokens 150000

          # Run additional checks
          # ...
```

## Related Documentation

- **[History](/guide/history)** - Track CI generations
- **[Git Integration](/guide/git-integration)** - Use --diff in CI
- **[Presets](/guide/presets)** - Choose appropriate presets
- **[Token Estimation](/guide/token-estimation)** - Budget checks

## Next Steps

- **Add to your CI** - Copy a workflow from this guide
- **Test locally** - Verify commands work locally first
- **Set up artifacts** - Configure artifact storage
- **Add quality gates** - Implement token/cost checks
