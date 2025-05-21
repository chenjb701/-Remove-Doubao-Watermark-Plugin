'use strict';

// 日志函数，便于统一输出格式和控制开关
const DEBUG = true;
function log(message, data = null) {
  if (!DEBUG) return;
  const prefix = '【豆包去水印】';
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// 错误日志函数
function logError(message, error) {
  console.error(`【豆包去水印-错误】 ${message}`, error);
}

log('插件已加载');

// 自定义菜单样式类
const MENU_CLASS = 'dbwm-custom-context-menu';
let customMenu = null;
let currentImgElement = null;
let shadowHost = null;
let shadowRoot = null;

// 检查菜单是否已存在于DOM中
function checkMenuExistence() {
  // 检查直接的菜单
  const directMenu = document.querySelector('.' + MENU_CLASS);
  if (directMenu) {
    log('菜单直接存在于DOM中', directMenu);
  } else {
    log('菜单不存在于DOM中');
  }
  
  // 检查shadow DOM中的菜单
  if (shadowRoot && shadowRoot.querySelector('.' + MENU_CLASS)) {
    log('菜单存在于Shadow DOM中', shadowRoot.querySelector('.' + MENU_CLASS));
  } else if (shadowRoot) {
    log('Shadow DOM存在但菜单不在其中');
  } else {
    log('Shadow DOM不存在');
  }
  
  // 检查所有可能的菜单容器
  const allPossibleMenus = document.querySelectorAll('div[style*="position"][style*="z-index"]');
  log(`找到${allPossibleMenus.length}个可能的菜单容器`);
  for (let i = 0; i < Math.min(allPossibleMenus.length, 5); i++) {
    const menu = allPossibleMenus[i];
    log(`可能的菜单 #${i+1}:`, {
      类名: menu.className,
      样式: menu.getAttribute('style'),
      内容: menu.innerHTML.substring(0, 100)
    });
  }
}

// 创建阴影DOM和自定义右键菜单
function createShadowDomMenu() {
  log('创建Shadow DOM和自定义右键菜单');
  
  // 移除现有的Shadow DOM
  if (shadowHost && document.body.contains(shadowHost)) {
    document.body.removeChild(shadowHost);
  }
  
  // 创建新的Shadow DOM
  shadowHost = document.createElement('div');
  shadowHost.id = 'dbwm-menu-host';
  shadowHost.style.position = 'absolute';
  shadowHost.style.top = '0';
  shadowHost.style.left = '0';
  shadowHost.style.width = '0';
  shadowHost.style.height = '0';
  shadowHost.style.overflow = 'visible';
  shadowHost.style.zIndex = '999999999';
  document.body.appendChild(shadowHost);
  
  try {
    // 创建封闭的Shadow DOM
    shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    log('成功创建Shadow DOM', shadowRoot);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      /* 右键菜单主容器 */
      .${MENU_CLASS} {
        position: fixed;           /* 固定定位，不随滚动而移动 */
        background-color: white;   /* 菜单背景色 */
        border: 1px solid #ccc;    /* 菜单边框 */
        border-radius: 8px;        /* 圆角边框 */
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35); /* 阴影效果 */
        min-width: 150px;          /* 最小宽度 */
        z-index: 999999999;        /* 确保显示在最上层 */
        padding: 6px 0;            /* 上下内边距 */
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; /* 字体 */
        box-sizing: border-box;    /* 盒模型计算方式 */
        text-align: left;          /* 文本左对齐 */
      }
      
      /* 菜单项样式 */
      .dbwm-menu-item {
        padding: 6px 0;           /* 上下内边距 */
        cursor: pointer;           /* 鼠标指针为手型 */
        font-size: 15px;           /* 字体大小 */
        color: #333;               /* 文字颜色 */
        transition: background-color 0.2s; /* 背景色过渡动画 */
        box-sizing: border-box;    /* 盒模型计算方式 */
        width: 100%;               /* 宽度占满容器 */
      }
      
      /* 菜单项悬停效果 */
      .dbwm-menu-item:hover {
        background-color: #f5f5f5; /* 悬停背景色 */
        color: #1890ff;            /* 悬停文字颜色（蓝色） */
      }
      
      /* 菜单项内容容器 */
      .dbwm-menu-item-container {
        display: inline-flex;      /* 行内弹性布局 */
        align-items: center;       /* 垂直居中对齐 */
        width: auto;               /* 自动宽度 */
        margin: 0 0 0 6px;        /* 左对齐(左边距6px) */
      }
      
      /* 菜单项图标样式 */
      .dbwm-menu-item svg {
        margin-right: 10px;        /* 右侧外边距 */
        flex-shrink: 0;            /* 防止图标被压缩 */
      }
      
      /* 菜单项文本样式 */
      .dbwm-menu-item-text {
        white-space: nowrap;       /* 文本不换行 */
      }
      
      /* 菜单分隔线样式 */
      .dbwm-menu-divider {
        height: 1px;               /* 分隔线高度 */
        background-color: #eee;    /* 分隔线颜色 */
        margin: 4px 0;             /* 上下外边距 */
      }
    `;
    shadowRoot.appendChild(style);
    
    // 创建菜单容器
    customMenu = document.createElement('div');
    customMenu.className = MENU_CLASS;
    customMenu.style.display = 'none';
    
    // 创建无水印复制按钮
    const copyButton = document.createElement('div');
    copyButton.className = 'dbwm-menu-item';
    copyButton.innerHTML = `
      <div class="dbwm-menu-item-container" style="width: 130px; padding: 0 16px; box-sizing: border-box;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
          <path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke="#2C2C2C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M15 2H9C8.44772 2 8 2.44772 8 3V5C8 5.55228 8.44772 6 9 6H15C15.5523 6 16 5.55228 16 5V3C16 2.44772 15.5523 2 15 2Z" stroke="#2C2C2C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="dbwm-menu-item-text">无水印复制</span>
      </div>
    `;
    copyButton.addEventListener('click', () => {
      log('点击了复制按钮');
      copyImageWithoutWatermark();
    });
    
    // 创建无水印下载按钮
    const downloadButton = document.createElement('div');
    downloadButton.className = 'dbwm-menu-item';
    downloadButton.innerHTML = `
      <div class="dbwm-menu-item-container" style="width: 130px; padding: 0 16px; box-sizing: border-box;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
          <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="#2C2C2C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 10L12 15L17 10" stroke="#2C2C2C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 15V3" stroke="#2C2C2C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="dbwm-menu-item-text">无水印下载</span>
      </div>
    `;
    downloadButton.addEventListener('click', () => {
      log('点击了下载按钮');
      downloadImageWithoutWatermark();
    });
    
    // 添加按钮到菜单
    customMenu.appendChild(copyButton);
    // 添加分隔线
    const divider = document.createElement('div');
    divider.className = 'dbwm-menu-divider';
    customMenu.appendChild(divider);
    customMenu.appendChild(downloadButton);
    shadowRoot.appendChild(customMenu);
    
    log('Shadow DOM菜单创建完成', {
      复制按钮: copyButton,
      下载按钮: downloadButton,
      菜单元素: customMenu
    });
    
    // 点击页面任意位置关闭菜单
    document.addEventListener('click', hideCustomMenu);
    document.addEventListener('scroll', hideCustomMenu);
    
    return true;
  } catch (error) {
    logError('创建Shadow DOM失败', error);
    return false;
  }
}

// 显示自定义右键菜单
function showCustomMenu(e) {
  log('尝试显示自定义右键菜单', {
    位置: {x: e.pageX, y: e.pageY},
    clientX: e.clientX,
    clientY: e.clientY
  });
  
  // 如果菜单不存在，创建它
  if (!shadowRoot || !customMenu) {
    const success = createShadowDomMenu();
    if (!success) {
      logError('创建菜单失败，无法显示');
      return;
    }
  }
  
  try {
    // 确保菜单可见
    customMenu.style.display = 'block';
    // 计算位置（考虑页面滚动）
    customMenu.style.left = `${e.clientX}px`;
    customMenu.style.top = `${e.clientY}px`;
    
    log('菜单应该显示在位置', {
      left: customMenu.style.left,
      top: customMenu.style.top,
      display: customMenu.style.display
    });
    
    // 防止默认右键菜单和事件冒泡
    e.preventDefault();
    e.stopPropagation();
    
    // 检查菜单元素是否存在于DOM中
    setTimeout(checkMenuExistence, 100);
  } catch (error) {
    logError('显示菜单时出错', error);
  }
}

// 隐藏自定义右键菜单
function hideCustomMenu() {
  log('尝试隐藏自定义右键菜单');
  if (customMenu) {
    customMenu.style.display = 'none';
    log('菜单已隐藏');
  }
}

// 从图片元素获取无水印图片URL
function getImageUrl(imgElement) {
  // 使用豆包网无水印图片选择器
  if (imgElement && imgElement.hasAttribute('src')) {
    log('获取到图片URL', imgElement.src);
    return imgElement.src;
  }
  logError('无法获取图片URL', imgElement);
  return null;
}

// 获取图片文件名
function getImageName(url, alt) {
  if (!url) {
    const defaultName = `豆包图片${Date.now()}.png`;
    log('未提供URL，使用默认文件名', defaultName);
    return defaultName;
  }
  
  try {
    const urlObj = new URL(url);
    const imgName = urlObj.pathname.split('/').pop();
    const finalName = imgName || (alt ? alt + '.png' : `豆包图片${Date.now()}.png`);
    log('生成的文件名', finalName);
    return finalName;
  } catch (e) {
    logError('解析URL失败，使用备用文件名', e);
    const backupName = (alt ? alt + '.png' : `豆包图片${Date.now()}.png`);
    log('使用备用文件名', backupName);
    return backupName;
  }
}

// 复制无水印图片到剪贴板
async function copyImageWithoutWatermark() {
  hideCustomMenu();
  
  if (!currentImgElement) {
    logError('复制失败：当前没有选中的图片元素');
    return;
  }

  const imgUrl = getImageUrl(currentImgElement);
  if (!imgUrl) {
    logError('复制失败：无法获取图片URL');
    return;
  }

  log('开始复制图片', imgUrl);
  
  try {
    // 方法1：使用Canvas复制图片
    log('使用Canvas复制图片');
    
    // 创建一个临时图片元素
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    
    // 等待图片加载完成
    await new Promise((resolve, reject) => {
      tempImg.onload = resolve;
      tempImg.onerror = reject;
      tempImg.src = imgUrl;
      
      // 设置超时，防止图片加载过长
      setTimeout(resolve, 3000);
    });
    
    // 创建Canvas并绘制图片
    const canvas = document.createElement('canvas');
    canvas.width = tempImg.naturalWidth || tempImg.width;
    canvas.height = tempImg.naturalHeight || tempImg.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(tempImg, 0, 0);
    
    // 将Canvas内容转换为Blob
    canvas.toBlob(async (blob) => {
      try {
        // 使用Clipboard API复制Blob
        const clipboardItem = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([clipboardItem]);
        
        log('成功复制图片到剪贴板 (Clipboard API)');
        showNotification('图片已复制到剪贴板');
      } catch (clipError) {
        logError('使用Clipboard API复制失败', clipError);
        
        // 备用方法：尝试使用execCommand
        try {
          // 将Canvas转为dataURL，可以用于创建img
          const dataUrl = canvas.toDataURL('image/png');
          const tempImg2 = document.createElement('img');
          tempImg2.src = dataUrl;
          tempImg2.style.position = 'fixed';
          tempImg2.style.left = '-9999px';
          tempImg2.style.top = '-9999px';
          document.body.appendChild(tempImg2);
          
          // 创建Range和Selection
          const range = document.createRange();
          range.selectNode(tempImg2);
          
          // 清除当前选择，然后选择图片
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
          
          // 执行复制命令
          const success = document.execCommand('copy');
          
          // 清理
          window.getSelection().removeAllRanges();
          document.body.removeChild(tempImg2);
          
          if (success) {
            log('成功复制图片到剪贴板 (execCommand)');
            showNotification('图片已复制到剪贴板');
            return;
          }
          
          // 如果前两种方法都失败，显示手动复制对话框
          throw new Error('自动复制失败');
        } catch (execError) {
          logError('execCommand复制失败', execError);
          showManualCopyDialog(imgUrl);
        }
      }
    }, 'image/png');
  } catch (error) {
    logError('复制图片失败', error);
    showManualCopyDialog(imgUrl);
  }
}

// 显示手动复制帮助对话框
function showManualCopyDialog(imgUrl) {
  log('显示手动复制帮助对话框');
  
  // 显示复制提示对话框
  const copyHelpDiv = document.createElement('div');
  copyHelpDiv.style.position = 'fixed';
  copyHelpDiv.style.top = '50%';
  copyHelpDiv.style.left = '50%';
  copyHelpDiv.style.transform = 'translate(-50%, -50%)';
  copyHelpDiv.style.padding = '20px';
  copyHelpDiv.style.backgroundColor = 'white';
  copyHelpDiv.style.border = '1px solid #ccc';
  copyHelpDiv.style.borderRadius = '5px';
  copyHelpDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  copyHelpDiv.style.zIndex = '9999999';
  copyHelpDiv.style.fontFamily = 'sans-serif';
  copyHelpDiv.style.fontSize = '14px';
  copyHelpDiv.style.lineHeight = '1.5';
  copyHelpDiv.style.maxWidth = '400px';
  
  copyHelpDiv.innerHTML = `
    <div style="margin-bottom:15px;">由于浏览器安全限制，无法自动复制图片。请按以下步骤操作：</div>
    <ol style="margin-left:20px;padding-left:0;">
      <li style="margin-bottom:8px;">1. 右键点击下方图片</li>
      <li style="margin-bottom:8px;">2. 选择"复制图片"选项</li>
      <li>3. 完成后点击"关闭"按钮</li>
    </ol>
    <div style="text-align:center;margin:15px 0;">
      <img src="${imgUrl}" style="max-width:100%;max-height:300px;border:1px solid #eee;">
    </div>
    <div style="text-align:center;">
      <button id="dbwm-close-help" style="padding:8px 20px;background:#1890ff;color:white;border:none;border-radius:4px;cursor:pointer;">关闭</button>
    </div>
  `;
  
  document.body.appendChild(copyHelpDiv);
  
  // 添加关闭按钮事件
  document.getElementById('dbwm-close-help').addEventListener('click', function() {
    document.body.removeChild(copyHelpDiv);
  });
}

// 下载无水印图片
async function downloadImageWithoutWatermark() {
  hideCustomMenu();
  
  if (!currentImgElement) {
    logError('下载失败：当前没有选中的图片元素');
    return;
  }

  const imgUrl = getImageUrl(currentImgElement);
  if (!imgUrl) {
    logError('下载失败：无法获取图片URL');
    return;
  }

  log('开始下载图片', imgUrl);
  try {
    log('正在获取图片数据...');
    const response = await fetch(imgUrl);
    if (!response.ok) {
      throw new Error(`HTTP错误：${response.status} ${response.statusText}`);
    }
    log('图片数据获取成功，正在转换为Blob...');
    const blob = await response.blob();
    log('Blob创建成功', {
      类型: blob.type,
      大小: blob.size + ' 字节'
    });
    
    const blobUrl = URL.createObjectURL(blob);
    log('创建了Blob URL', blobUrl);
    
    // 创建下载链接并点击
    const filename = getImageName(imgUrl, currentImgElement.alt);
    log('开始下载文件', {文件名: filename});
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 释放Blob URL
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      log('已释放Blob URL');
    }, 100);
    
    // 显示成功提示
    log('图片下载已触发');
    showNotification('图片下载中...');
  } catch (error) {
    logError('下载图片失败', error);
    showNotification('下载图片失败，请重试', true);
  }
}

// 创建简单通知
function createSimpleNotification(message, isError = false) {
  log(`创建简单通知: ${message}`);
  
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = isError ? '#f5222d' : '#52c41a';
  notification.style.color = 'white';
  notification.style.padding = '10px 15px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '999999999';
  notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  notification.style.fontFamily = 'Arial, sans-serif';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }
  }, 3000);
  
  return notification;
}

// 显示通知
function showNotification(message, isError = false) {
  log(`显示通知: ${message}, 是否错误: ${isError}`);
  
  // 首先尝试在shadow DOM中显示通知
  if (shadowRoot) {
    try {
      const notificationInShadow = document.createElement('div');
      notificationInShadow.style.position = 'fixed';
      notificationInShadow.style.top = '20px';
      notificationInShadow.style.right = '20px';
      notificationInShadow.style.backgroundColor = isError ? '#f5222d' : '#52c41a';
      notificationInShadow.style.color = 'white';
      notificationInShadow.style.padding = '10px 15px';
      notificationInShadow.style.borderRadius = '4px';
      notificationInShadow.style.zIndex = '999999999';
      notificationInShadow.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      notificationInShadow.textContent = message;
      
      shadowRoot.appendChild(notificationInShadow);
      
      setTimeout(() => {
        if (shadowRoot.contains(notificationInShadow)) {
          notificationInShadow.style.opacity = '0';
          notificationInShadow.style.transition = 'opacity 0.5s';
          setTimeout(() => {
            if (shadowRoot.contains(notificationInShadow)) {
              shadowRoot.removeChild(notificationInShadow);
            }
          }, 500);
        }
      }, 3000);
      
      log('在Shadow DOM中显示了通知');
      return;
    } catch (error) {
      logError('在Shadow DOM中显示通知失败', error);
    }
  }
  
  // 如果Shadow DOM不可用，使用常规DOM
  createSimpleNotification(message, isError);
}

// 寻找豆包网的自定义右键菜单并禁用
function disableDoubaoContextMenu() {
  // 尝试查找并移除所有现有的豆包自定义右键菜单
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 检查是否是豆包的右键菜单
            const contextMenu = node.querySelector && node.querySelector('[data-testid="image_context_menu"]');
            const isPortal = node.classList && node.classList.contains('semi-portal');
            const isContextMenu = node.getAttribute && node.getAttribute('data-testid') === 'image_context_menu';
            
            if (contextMenu || isPortal || isContextMenu) {
              log('发现并移除豆包右键菜单', node);
              node.style.display = 'none';
              node.style.visibility = 'hidden';
              node.style.opacity = '0';
              node.style.pointerEvents = 'none';
              
              // 如果有子元素也设置为隐藏
              if (node.children) {
                Array.from(node.children).forEach(child => {
                  child.style.display = 'none';
                  child.style.visibility = 'hidden';
                });
              }
            }
          }
        }
      }
    }
  });
  
  // 监视整个文档的DOM变化
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
  
  // 额外监听document上的contextmenu事件
  document.addEventListener('contextmenu', function(e) {
    // 延迟一点执行，确保在豆包菜单出现后执行
    setTimeout(() => {
      // 查找所有可能的豆包菜单元素
      const menus = document.querySelectorAll('.semi-portal, [data-testid="image_context_menu"], .context-menu-OyqNKm');
      menus.forEach(menu => {
        if (menu.style.display !== 'none') {
          log('捕获到豆包菜单显示，强制隐藏', menu);
          menu.style.display = 'none';
          menu.style.visibility = 'hidden';
          menu.style.opacity = '0';
        }
      });
    }, 10);
  }, true);
  
  log('已设置豆包右键菜单监视器');
}

// 查找所有可能的图片选择器
function findAllPossibleImageSelectors() {
  log('开始查找所有可能的图片选择器');
  const selectors = [
    'img[data-testid="in_painting_picture"]',
    'img.doubao-image',
    'img[alt*="豆包"]',
    'img[src*="byteimg.com"]',
    'img[src*="doubao"]',
    'div.painting-preview-item img',
    '.painting-preview img',
    '.doubao-image-container img'
  ];
  
  const results = {};
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    results[selector] = elements.length;
    if (elements.length > 0) {
      log(`找到选择器 ${selector} 的元素 ${elements.length} 个`);
      for (let i = 0; i < Math.min(elements.length, 3); i++) {
        const el = elements[i];
        log(`- 示例 #${i+1}:`, {
          标签: el.tagName,
          src: el.src ? (el.src.substring(0, 50) + '...') : '无',
          宽度: el.width || '无',
          高度: el.height || '无',
          类名: el.className || '无',
          数据属性: Array.from(el.attributes)
                     .filter(attr => attr.name.startsWith('data-'))
                     .map(attr => `${attr.name}="${attr.value}"`)
                     .join(', ')
        });
      }
    }
  }
  
  // 找到所有图片元素
  const allImages = document.querySelectorAll('img');
  log(`页面上共有 ${allImages.length} 个图片元素`);
  
  // 检查最前面的几个图片
  for (let i = 0; i < Math.min(allImages.length, 5); i++) {
    const img = allImages[i];
    if (img.width > 100 && img.height > 100) { // 只分析较大的图片
      log(`页面图片 #${i+1}:`, {
        src: img.src ? (img.src.substring(0, 50) + '...') : '无',
        宽度: img.width,
        高度: img.height,
        类名: img.className || '无',
        id: img.id || '无',
        数据属性: Array.from(img.attributes)
                   .filter(attr => attr.name.startsWith('data-'))
                   .map(attr => `${attr.name}="${attr.value}"`)
                   .join(', ')
      });
    }
  }
  
  return results;
}

// 尝试找到有效的图片选择器
let effectiveImageSelector = 'img[data-testid="in_painting_picture"]';
let selectorSearchCompleted = false;

// 确定哪个图片选择器最有效
function determineEffectiveImageSelector() {
  if (selectorSearchCompleted) return;
  
  const selectors = [
    'img[data-testid="in_painting_picture"]',
    'img.doubao-image',
    'img[src*="byteimg.com"]',
    '.painting-preview img',
    '.doubao-image-container img'
  ];
  
  // 检查每个选择器
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // 验证图片元素
      for (const img of elements) {
        if (img.tagName === 'IMG' && img.src && img.width > 100 && img.height > 100) {
          log(`找到有效的图片选择器: ${selector}`, {
            src: img.src.substring(0, 50) + '...',
            宽度: img.width,
            高度: img.height
          });
          effectiveImageSelector = selector;
          selectorSearchCompleted = true;
          return;
        }
      }
    }
  }
  
  // 如果无法找到预定义的选择器，尝试查找所有大尺寸图片
  const allLargeImages = Array.from(document.querySelectorAll('img'))
    .filter(img => img.width > 200 && img.height > 200);
  
  if (allLargeImages.length > 0) {
    log('未找到预定义选择器，但找到了大尺寸图片');
    // 不更改选择器，但记录发现
    for (let i = 0; i < Math.min(allLargeImages.length, 3); i++) {
      const img = allLargeImages[i];
      log(`大尺寸图片 #${i+1}:`, {
        src: img.src.substring(0, 50) + '...',
        宽度: img.width,
        高度: img.height,
        类名: img.className || '无'
      });
    }
  }
}

// 从元素或其父元素中找到图片元素
function findImgElementFrom(element) {
  // 如果自身是图片，直接返回
  if (element.tagName === 'IMG') {
    log('检查图片元素', {
      src: element.src ? element.src.substring(0, 50) + '...' : '无',
      宽度: element.width || '无',
      高度: element.height || '无',
      类名: element.className || '无',
      标签: element.tagName,
      属性: Array.from(element.attributes)
        .map(attr => `${attr.name}="${attr.value}"`)
        .join(', ')
    });
    
    // 放宽条件：任何图片都接受
    if (element.src) {
      log('接受任何有src的图片元素');
      return element;
    }
  }
  
  // 检查子元素
  const childImg = element.querySelector('img');
  if (childImg && childImg.src) {
    log('找到子图片元素', {src: childImg.src.substring(0, 50) + '...'});
    return childImg;
  }
  
  // 向上查找祖先元素中的图片容器
  let currentNode = element.parentElement;
  let depth = 0;
  while (currentNode && depth < 5) {
    // 检查当前节点是否有图片
    const imgInParent = currentNode.querySelector('img');
    if (imgInParent && imgInParent.src) {
      log('在父元素中找到图片', {src: imgInParent.src.substring(0, 50) + '...'});
      return imgInParent;
    }
    
    currentNode = currentNode.parentElement;
    depth++;
  }
  
  return null;
}

// 检查元素是否为图片元素
function isTargetImageElement(element) {
  // 直接放宽条件：任何图片元素都可以
  if (element.tagName === 'IMG' && element.src) {
    log('识别到图片元素', {
      src: element.src.substring(0, 50) + '...',
      类名: element.className || '无'
    });
    return true;
  }
  
  // 检查是否有图片子元素
  const childImg = element.querySelector('img');
  if (childImg && childImg.src) {
    return true;
  }
  
  return false;
}

// 初始化函数
function init() {
  log('初始化插件');
  
  // 检查运行环境
  log('浏览器环境信息', {
    UserAgent: navigator.userAgent,
    语言: navigator.language,
    平台: navigator.platform
  });
  
  // 测试创建通知
  // setTimeout(testNotification, 2000);
  
  // 禁用豆包网站的原生右键菜单
  disableDoubaoContextMenu();
  
  // 提前创建Shadow DOM和菜单
  createShadowDomMenu();
  
  // 简化：用统一的方法处理右键菜单
  document.addEventListener('contextmenu', function(e) {
    log('捕获右键点击事件', {
      元素: e.target.tagName,
      类名: e.target.className,
      坐标: {clientX: e.clientX, clientY: e.clientY, pageX: e.pageX, pageY: e.pageY}
    });
    
    // 尝试查找图片元素
    let imgElement = null;
    
    // 1. 直接检查目标元素
    if (e.target.tagName === 'IMG' && e.target.src) {
      imgElement = e.target;
      log('目标元素本身是图片', {src: imgElement.src.substring(0, 50) + '...'});
    }
    
    // 2. 检查目标内部的图片
    if (!imgElement && e.target.querySelector) {
      const innerImg = e.target.querySelector('img');
      if (innerImg && innerImg.src) {
        imgElement = innerImg;
        log('目标元素内部包含图片', {src: imgElement.src.substring(0, 50) + '...'});
      }
    }
    
    // 3. 向上查找父元素中的图片
    if (!imgElement) {
      let parent = e.target.parentElement;
      for (let i = 0; i < 3 && parent; i++) {
        if (parent.querySelector) {
          const parentImg = parent.querySelector('img');
          if (parentImg && parentImg.src) {
            imgElement = parentImg;
            log('在父元素中找到图片', {src: imgElement.src.substring(0, 50) + '...'});
            break;
          }
        }
        parent = parent.parentElement;
      }
    }
    
    // 如果找到图片，显示自定义菜单
    if (imgElement) {
      currentImgElement = imgElement;
      
      // 立即禁用任何豆包菜单
      const doubaoMenus = document.querySelectorAll('.semi-portal, [data-testid="image_context_menu"], .context-menu-OyqNKm');
      doubaoMenus.forEach(menu => {
        menu.style.display = 'none';
        menu.style.visibility = 'hidden';
        menu.style.opacity = '0';
        menu.style.pointerEvents = 'none';
      });
      
      // 显示我们的菜单
      showCustomMenu(e);
      
      log('已显示自定义菜单');
      e.preventDefault();
      e.stopPropagation();
      return false;
    } else {
      log('没有找到相关图片元素');
    }
  }, true);
  
  // 页面加载完成后重新扫描
  window.addEventListener('load', function() {
    log('页面加载完成，重新检查');
    findAllPossibleImageSelectors();
  });
  
  log('插件初始化完成');
}

// 当DOM加载完成后初始化
if (document.readyState === 'loading') {
  log('DOM正在加载，等待DOMContentLoaded事件');
  document.addEventListener('DOMContentLoaded', init);
} else {
  log('DOM已加载完成，直接初始化');
  init();
}

// 在页面加载完成后执行一次全面扫描
window.addEventListener('load', () => {
  log('页面完全加载完成，执行一次全面扫描');
  determineEffectiveImageSelector();
  if (!selectorSearchCompleted) {
    findAllPossibleImageSelectors();
  }
}); 