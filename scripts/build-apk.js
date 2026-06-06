const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const androidDir = path.join(__dirname, '..', 'android');
const cmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

console.log(`Starting APK build using ${cmd} in ${androidDir}...`);

let tasksCompleted = 0;
let estimatedTotalTasks = 160; // React Native Android release typically has ~160-200 tasks
let percentage = 0;
const startTime = Date.now();

// Print progress every 60 seconds
const progressInterval = setInterval(() => {
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  // Task-based progress percentage estimation capped at 95%
  const taskPercent = Math.round((tasksCompleted / estimatedTotalTasks) * 100);
  percentage = Math.max(percentage, Math.min(95, taskPercent));
  
  console.log(`[APK BUILD PROGRESS] ${percentage}% completed. (Elapsed: ${elapsed}s, Tasks completed: ${tasksCompleted}/${estimatedTotalTasks})`);
}, 60000);

const child = spawn(cmd, ['assembleRelease', '--console=plain'], {
  cwd: androidDir,
  shell: true
});

child.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.includes('> Task')) {
      tasksCompleted++;
      const match = line.match(/> Task (:[a-zA-Z0-9:-]+)/);
      if (match) {
        const taskName = match[1];
        // Log critical tasks
        if (taskName.includes('bundleReleaseJsAndAssets') || 
            taskName.includes('compileReleaseJavaWithJavac') || 
            taskName.includes('mergeReleaseResources') || 
            taskName.includes('dexBuilder') ||
            taskName.includes('packageRelease')) {
          console.log(`[Gradle] Executing critical task: ${taskName}`);
        }
      }
    }
  }
  
  // Adjust estimation dynamically
  if (tasksCompleted > estimatedTotalTasks) {
    estimatedTotalTasks = tasksCompleted + 10;
  }
});

child.stderr.on('data', (data) => {
  const errOutput = data.toString().trim();
  if (errOutput) {
    console.error(`[Gradle Error] ${errOutput}`);
  }
});

child.on('close', (code) => {
  clearInterval(progressInterval);
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  if (code === 0) {
    console.log(`[APK BUILD PROGRESS] 100% completed.`);
    console.log(`BUILD SUCCESSFUL in ${totalTime}s!`);
    
    const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
    if (fs.existsSync(apkPath)) {
      const stats = fs.statSync(apkPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`[APK_BUILD_RESULT] SUCCESS`);
      console.log(`[APK_BUILD_RESULT] APK_PATH: ${apkPath}`);
      console.log(`[APK_BUILD_RESULT] APK_SIZE: ${sizeInMB} MB`);
    } else {
      console.log(`[APK_BUILD_RESULT] APK not found at expected path: ${apkPath}`);
    }
  } else {
    console.error(`[APK_BUILD_RESULT] FAILED with exit code ${code} after ${totalTime}s`);
    process.exit(1);
  }
});
