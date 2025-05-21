document.addEventListener('DOMContentLoaded', function() {
  const downloadBtn = document.getElementById('downloadBtn');
  const statusP = document.getElementById('status');

  downloadBtn.addEventListener('click', function() {
    statusP.textContent = '正在查找图片...';
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) {
        statusP.textContent = '错误：找不到活动标签页。';
        return;
      }
      const activeTab = tabs[0];
      if (!activeTab.url || !activeTab.url.startsWith('https://www.doubao.com/chat/')) {
        statusP.textContent = '请在豆包聊天页面使用。';
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          func: getContentScript,
        },
        (injectionResults) => {
          if (chrome.runtime.lastError) {
            statusP.textContent = '错误：' + chrome.runtime.lastError.message;
            return;
          }
          if (injectionResults && injectionResults.length > 0 && injectionResults[0].result) {
            const { imageUrl, extension } = injectionResults[0].result;
            statusP.textContent = '正在准备下载...';
            
            // 从原始URL中提取域名
            let urlObj;
            try {
              urlObj = new URL(imageUrl);
            } catch (e) {
              statusP.textContent = '无效的图片URL';
              return;
            }
            
            // 设置跨域Cookie
            setCookieForDownload(urlObj.hostname, activeTab.url, () => {
              // 根据图片格式设置文件名扩展名
              const filename = `doubao_image${extension}`;
              
              statusP.textContent = '正在下载...';
              // 直接使用 downloads API 下载图片，不设置自定义请求头
              chrome.downloads.download({
                url: imageUrl,
                filename: filename
              }, (downloadId) => {
                if (chrome.runtime.lastError) {
                  statusP.textContent = '下载失败：' + chrome.runtime.lastError.message;
                  console.error('下载失败:', chrome.runtime.lastError);
                  
                  // 如果下载失败，尝试使用内容脚本在页面中直接下载
                  tryAlternativeDownload(activeTab.id, imageUrl, filename);
                } else if (downloadId === undefined) {
                  statusP.textContent = '下载失败，无法获取下载ID。';
                  // 尝试备用下载方法
                  tryAlternativeDownload(activeTab.id, imageUrl, filename);
                }
                else {
                  statusP.textContent = '图片已开始下载！';
                }
              });
            });
          } else {
            statusP.textContent = '未找到指定图片或无法获取图片链接。';
          }
        }
      );
    });
  });
});

// 尝试使用备用方法下载图片
function tryAlternativeDownload(tabId, imageUrl, filename) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (url, fname) => {
      // 在页面上创建一个临时链接元素来下载图片
      const a = document.createElement('a');
      a.href = url;
      a.download = fname || 'image';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      return true;
    },
    args: [imageUrl, filename]
  }, (results) => {
    // 不需要处理结果
  });
}

// 设置跨域Cookie以便访问图片资源
function setCookieForDownload(domain, referrer, callback) {
  // 设置必要的Cookie
  chrome.cookies.getAll({ domain: 'www.doubao.com' }, function(cookies) {
    let pendingCookies = cookies.length;
    if (pendingCookies === 0) {
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
      
      chrome.cookies.set(cookieData, function() {
        if (chrome.runtime.lastError) {
          console.error('设置Cookie失败:', chrome.runtime.lastError);
        }
        
        pendingCookies--;
        if (pendingCookies === 0) {
          callback(); // 所有Cookie设置完成后调用回调
        }
      });
    });
  });
}

function getContentScript() {
  const imgElement = document.querySelector('img[data-testid="in_painting_picture"]');
  if (imgElement && imgElement.src) {
    // 新的水印模式正则表达式，支持多种格式
    const watermarkPattern = /~tplv-a9rns2rl98-(image-\w+-watermark|web-thumb-watermark)\.(png|jpeg|jpg)/i;
    
    // 检查URL是否包含水印标记
    const match = imgElement.src.match(watermarkPattern);
    if (match) {
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
      console.log('找到图片:', finalUrl);
      return {
        imageUrl: finalUrl,
        extension: extension
      };
    }
    
    // 如果没有水印标记，直接返回原始URL
    // 尝试从URL中提取扩展名
    const urlExtension = imgElement.src.split('?')[0];
    const extension = urlExtension.substring(urlExtension.lastIndexOf('.')) || '.png';
    
    console.log('未找到水印标记，使用原始URL:', imgElement.src);
    return {
      imageUrl: imgElement.src,
      extension: extension
    };
  }
  return null;
} 