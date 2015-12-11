var exec = require('child-process-promise').exec;

var git = {
  checkoutMaster: function(){
    return exec('git checkout master');
  },
  commit: function(version) {
    var msg = version || 'Auto-incrementing version';
    return exec('git commit -am "' + msg + '"');
  },
  push: function(){
    return exec('git push "https://' + process.env.GH_TOKEN + '@' + process.env.GH_REF + '" master:master');
  }
}

module.exports = git;
