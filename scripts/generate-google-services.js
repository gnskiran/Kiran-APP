const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const outputPath = path.join(projectRoot, 'android', 'app', 'google-services.json');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing .env file at ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = {};

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  });

  return parsed;
}

function requireEnv(env, key) {
  const value = env[key];
  if (!value || value.includes('YOUR_')) {
    throw new Error(`Set ${key} in .env before generating google-services.json`);
  }
  return value;
}

function getStorageBucket(env) {
  const configuredBucket = env.FIREBASE_STORAGE_BUCKET;
  if (configuredBucket && !configuredBucket.includes('YOUR_')) {
    return configuredBucket;
  }

  return `${requireEnv(env, 'FIREBASE_PROJECT_ID')}.appspot.com`;
}

function buildGoogleServicesJson(env) {
  const packageName = env.FIREBASE_ANDROID_PACKAGE || 'com.kiran.kirandrive';

  return {
    project_info: {
      project_number: requireEnv(env, 'FIREBASE_PROJECT_NUMBER'),
      project_id: requireEnv(env, 'FIREBASE_PROJECT_ID'),
      storage_bucket: getStorageBucket(env),
    },
    client: [
      {
        client_info: {
          mobilesdk_app_id: requireEnv(env, 'FIREBASE_MOBILESDK_APP_ID'),
          android_client_info: {
            package_name: packageName,
          },
        },
        oauth_client: [],
        api_key: [
          {
            current_key: requireEnv(env, 'FIREBASE_API_KEY'),
          },
        ],
        services: {
          appinvite_service: {
            other_platform_oauth_client: [],
          },
        },
      },
    ],
    configuration_version: '1',
  };
}

function main() {
  const env = parseEnvFile(envPath);
  const googleServices = buildGoogleServicesJson(env);

  fs.writeFileSync(outputPath, `${JSON.stringify(googleServices, null, 2)}\n`, 'utf8');

  console.log(`Generated ${outputPath}`);
  console.log(`Firebase Android package: ${googleServices.client[0].client_info.android_client_info.package_name}`);
  console.log(`Firebase project: ${googleServices.project_info.project_id}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
