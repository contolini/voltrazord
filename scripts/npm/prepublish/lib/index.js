var fs = require('fs');

module.exports = {
  printLn: require('./print'),
  confirm: require('./confirm'),
  getGitStatus: require('./gitStatus'),
  build: require('./build'),
  publish: require('./publish'),
  commit: require('./commit'),
  push: require('./push'),
  getNpmVersion: require('./getNpmVersion'),
  pkg: JSON.parse(fs.readFileSync('package.json', 'utf8')),
  option: require('./getArgs')
}
