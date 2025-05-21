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
  const downloadBtn = document.getElementById('downloadBtn');
  const statusP = document.getElementById('status');

  downloadBtn.addEventListener('click', function() {
    log('点击了下载按钮');
    statusP.textContent = '正在查找图片...';
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) {
        logError('找不到活动标签页');
        statusP.textContent = '错误：找不到活动标签页。';
        return;
      }
      const activeTab = tabs[0];
      log('获取到当前标签页', { id: activeTab.id, url: activeTab.url });
      
      if (!activeTab.url || !activeTab.url.startsWith('https://www.doubao.com/chat/')) {
        log('当前页面不是豆包聊天页面', activeTab.url);
        statusP.textContent = '请在豆包聊天页面使用。';
        return;
      }

      log('开始在页面中执行脚本查找图片');
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          func: getContentScript,
        },
        (injectionResults) => {
          if (chrome.runtime.lastError) {
            logError('执行脚本出错', chrome.runtime.lastError);
            statusP.textContent = '错误：' + chrome.runtime.lastError.message;
            return;
          }
          
          log('脚本执行结果', injectionResults);
          if (injectionResults && injectionResults.length > 0 && injectionResults[0].result) {
            const { imageUrl, extension } = injectionResults[0].result;
            log('找到图片URL', { imageUrl, extension });
            statusP.textContent = '正在准备下载...';
            
            // 从原始URL中提取域名
            let urlObj;
            try {
              urlObj = new URL(imageUrl);
              log('解析URL成功', { hostname: urlObj.hostname, pathname: urlObj.pathname });
            } catch (e) {
              logError('URL解析失败', e);
              statusP.textContent = '无效的图片URL';
              return;
            }
            
            // 设置跨域Cookie
            log('开始设置跨域Cookie');
            setCookieForDownload(urlObj.hostname, activeTab.url, () => {
              // 根据图片格式设置文件名扩展名
              const filename = `doubao_image${extension}`;
              log('准备下载文件', { filename, url: imageUrl });
              
              statusP.textContent = '正在下载...';
              // 直接使用 downloads API 下载图片，不设置自定义请求头
              log('调用Chrome下载API');
              chrome.downloads.download({
                url: imageUrl,
                filename: filename
              }, (downloadId) => {
                if (chrome.runtime.lastError) {
                  logError('下载API调用失败', chrome.runtime.lastError);
                  statusP.textContent = '下载失败：' + chrome.runtime.lastError.message;
                  
                  // 如果下载失败，尝试使用内容脚本在页面中直接下载
                  log('尝试使用备用下载方法');
                  tryAlternativeDownload(activeTab.id, imageUrl, filename);
                } else if (downloadId === undefined) {
                  logError('下载失败，无法获取下载ID');
                  statusP.textContent = '下载失败，无法获取下载ID。';
                  // 尝试备用下载方法
                  log('尝试使用备用下载方法');
                  tryAlternativeDownload(activeTab.id, imageUrl, filename);
                }
                else {
                  log('下载已开始', { downloadId });
                  statusP.textContent = '图片已开始下载！';
                }
              });
            });
          } else {
            logError('未找到图片或结果为空');
            statusP.textContent = '未找到指定图片或无法获取图片链接。';
          }
        }
      );
    });
  });
  
  // 显示插件版本和环境信息
  log('插件信息', {
    版本: chrome.runtime.getManifest().version,
    名称: chrome.runtime.getManifest().name,
    浏览器: navigator.userAgent
  });
});

// 尝试使用备用方法下载图片
function tryAlternativeDownload(tabId, imageUrl, filename) {
  log('执行备用下载方法', { tabId, imageUrl, filename });
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (url, fname) => {
      // 在页面上创建一个临时链接元素来下载图片
      console.log('【豆包去水印-页面】开始备用下载', { url, fname });
      const a = document.createElement('a');
      a.href = url;
      a.download = fname || 'image';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      console.log('【豆包去水印-页面】已触发下载');
      setTimeout(() => {
        document.body.removeChild(a);
        console.log('【豆包去水印-页面】已移除下载元素');
      }, 100);
      return true;
    },
    args: [imageUrl, filename]
  }, (results) => {
    log('备用下载方法执行完成', results);
  });
}

// 设置跨域Cookie以便访问图片资源
function setCookieForDownload(domain, referrer, callback) {
  log('开始设置跨域Cookie', { domain, referrer });
  // 设置必要的Cookie
  chrome.cookies.getAll({ domain: 'www.doubao.com' }, function(cookies) {
    let pendingCookies = cookies.length;
    log(`获取到${pendingCookies}个Cookie`);
    
    if (pendingCookies === 0) {
      log('没有Cookie需要设置，直接调用回调');
      callback(); // 如果没有Cookie，直接调用回调
      return;
    }
    
    // 尝试将豆包网站的Cookie复制到图片域名
    cookies.forEach(function(cookie) {
      const cookieData = {
        url: `https://${domain}`,
        name: cookie.name,
        value: cookie.value,
        path: '/',
        secure: true,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expirationDate: cookie.expirationDate
      };
      
      log(`设置Cookie: ${cookie.name}`, cookieData);
      chrome.cookies.set(cookieData, function() {
        if (chrome.runtime.lastError) {
          logError(`设置Cookie ${cookie.name} 失败`, chrome.runtime.lastError);
        } else {
          log(`成功设置Cookie: ${cookie.name}`);
        }
        
        pendingCookies--;
        log(`剩余${pendingCookies}个Cookie需要设置`);
        if (pendingCookies === 0) {
          log('所有Cookie设置完成');
          callback(); // 所有Cookie设置完成后调用回调
        }
      });
    });
  });
}

function getContentScript() {
  console.log('【豆包去水印-页面】开始在页面中查找图片');
  
  const imgElement = document.querySelector('img[data-testid="in_painting_picture"]');
  if (imgElement && imgElement.src) {
    console.log('【豆包去水印-页面】找到图片元素', { 
      src: imgElement.src,
      width: imgElement.width,
      height: imgElement.height,
      alt: imgElement.alt
    });
    
    // 新的水印模式正则表达式，支持多种格式
    const watermarkPattern = /~tplv-a9rns2rl98-(image-\w+-watermark|web-thumb-watermark)\.(png|jpeg|jpg)/i;
    
    // 检查URL是否包含水印标记
    const match = imgElement.src.match(watermarkPattern);
    if (match) {
      console.log('【豆包去水印-页面】图片URL包含水印标记', match);
      
      // 分离URL的基础部分和查询参数
      const [fullUrl, queryString] = imgElement.src.split('?');
      
      // 获取原始文件扩展名
      const extension = fullUrl.substring(fullUrl.lastIndexOf('.'));
      
      // 提取文件名的基础部分（不含水印标记）
      const basePart = fullUrl.split('~')[0];
      
      // 构建无水印URL，保留原始扩展名
      const originalImageUrl = basePart + extension;
      
      // 构建完整URL，包含查询参数
      const finalUrl = queryString ? `${originalImageUrl}?${queryString}` : originalImageUrl;
      
      // 返回处理结果
      console.log('【豆包去水印-页面】已处理为无水印URL:', finalUrl);
      return {
        imageUrl: finalUrl,
        extension: extension
      };
    }
    
    // 如果没有水印标记，直接返回原始URL
    // 尝试从URL中提取扩展名
    const urlExtension = imgElement.src.split('?')[0];
    const extension = urlExtension.substring(urlExtension.lastIndexOf('.')) || '.png';
    
    console.log('【豆包去水印-页面】未找到水印标记，使用原始URL:', imgElement.src);
    return {
      imageUrl: imgElement.src,
      extension: extension
    };
  }
  
  console.error('【豆包去水印-页面】未找到图片元素');
  return null;
} 