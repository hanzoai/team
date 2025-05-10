const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2); // Lấy các tham số từ dòng lệnh
if (args.length < 1) {
  console.error('Usage: node run-docker-build.js <image-name>');
  process.exit(1);
}

const scriptPath = path.resolve(__dirname, 'docker_build.sh');
const imageName = args[0];

try {
  console.log(`Running docker build for image: ${imageName}`);
  execSync(`bash ${scriptPath} ${imageName}`, { stdio: 'inherit' });
} catch (error) {
  console.error(`Failed to execute docker build for image: ${imageName}`);
  process.exit(1);
}