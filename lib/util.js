'use strict';

function ensurePathExists(obj, path, value) {
  const keys = path.split(',');
  let current = obj;
  for (let key of keys) {
      if (!(key in current)) {
          current[key] = {}; // 创建新对象以继续下一层初始化
      }
      current = current[key]; // 移动到下一层
  }
  // 如果指定了值，则在最后一层设置值
  if (value !== undefined) {
      current = value; // 替换最后一层的值为指定值
  }
}
module.exports = { 
  ensurePathExists,
};
