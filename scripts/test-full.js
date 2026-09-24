// npm run test:full: wie npm test, aber inklusive der grossen Testmengen (EB 21.09., MNIST).
// Als Datei statt `node -e`, weil Jest die Node-Optionen an seine Worker weitergibt.
process.env.OCR_FULL_TESTS = '1';
require('jest').run(process.argv.slice(2));
