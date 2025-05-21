// 日志函数，便于统一输出格式和控制开关
const DEBUG = true;
function log(message, data = null) {
  if (!DEBUG) return;
  const prefix = '【豆包去水印-弹窗】';
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// 错误日志函数
function logError(message, error) {
  console.error(`【豆包去水印-弹窗-错误】 ${message}`, error);
}

document.addEventListener('DOMContentLoaded', function() {
  log('弹窗界面已加载');
  
  // 显示插件版本和环境信息
  log('插件信息', {
    版本: chrome.runtime.getManifest().version,
    名称: chrome.runtime.getManifest().name,
    浏览器: navigator.userAgent
  });
}); 