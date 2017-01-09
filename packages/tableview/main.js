'use strict';

module.exports = {
  load () {
    // 当 package 被正确加载的时候执行
  },

  unload () {
    // 当 package 被正确卸载的时候执行
  },

  messages: {
    'say-hello' () {
        Editor.log('横向滚动时，view的宽必须与tableView所在节点的宽相同，纵向滚动时，view的高必须与tableView所在节点的高相同');
    }
  },
};