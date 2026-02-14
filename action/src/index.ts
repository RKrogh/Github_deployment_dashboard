import * as core from '@actions/core';
import * as github from '@actions/github';

type DeploymentState =
  | 'error'
  | 'failure'
  | 'inactive'
  | 'in_progress'
  | 'queued'
  | 'pending'
  | 'success';

const VALID_STATES: DeploymentState[] = [
  'error', 'failure', 'inactive', 'in_progress', 'queued', 'pending', 'success',
];

async function run(): Promise<void> {
  try {
    const token = core.getInput('token', { required: true });
    const environment = core.getInput('environment', { required: true });
    const status = (core.getInput('status') || 'success') as string;
    const environmentUrl = core.getInput('environment-url') || undefined;
    const description = core.getInput('description') || undefined;

    const { context } = github;
    const service = core.getInput('service') || context.repo.repo;
    const version = core.getInput('version') || context.sha.substring(0, 7);

    if (!VALID_STATES.includes(status as DeploymentState)) {
      core.setFailed(
        `Invalid status "${status}". Must be one of: ${VALID_STATES.join(', ')}`,
      );
      return;
    }

    const octokit = github.getOctokit(token);
    const payload = JSON.stringify({ service, version });

    core.info(`Creating deployment for ${service}@${version} to ${environment}`);

    const deploymentResponse = await octokit.rest.repos.createDeployment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: context.sha,
      environment,
      payload,
      auto_merge: false,
      required_contexts: [],
      description: description || `Deploy ${service}@${version} to ${environment}`,
      transient_environment: false,
      production_environment: environment === 'prod' || environment === 'production',
    });

    if (deploymentResponse.status === 201) {
      const deploymentId = deploymentResponse.data.id;
      core.info(`Deployment created with ID: ${deploymentId}`);

      await octokit.rest.repos.createDeploymentStatus({
        owner: context.repo.owner,
        repo: context.repo.repo,
        deployment_id: deploymentId,
        state: status as DeploymentState,
        environment_url: environmentUrl,
        description: description || `${service}@${version} deployed to ${environment}`,
        auto_inactive: true,
      });

      core.info(`Deployment status set to: ${status}`);

      core.setOutput('deployment-id', deploymentId.toString());
      core.setOutput('service', service);
      core.setOutput('version', version);
    } else {
      core.warning(
        `Unexpected deployment API response status: ${deploymentResponse.status}. ` +
        `The deployment may have been queued for auto-merge.`,
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`);
    } else {
      core.setFailed('Action failed with an unknown error');
    }
  }
}

run();
