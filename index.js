// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      2025-05-21
// @description  try to take over the world!
// @author       You
// @match        https://www.doubao.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const btn = document.createElement('button');
    btn.textContent = '点击下载';
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '1000';
    btn.style.backgroundColor = 'red';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.padding = '10px';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    document.body.appendChild(btn)

    const download = (url, name) => {
        fetch(url)
            .then(response => response.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = name || '豆包图片.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            })
            .catch(error => {
                console.error('下载图片失败:', error);
                alert('下载图片失败，请重试');
            });
    }

    const getImgName = (url) => {
        const urlObj = new URL(url);
        const imgName = urlObj.pathname.split('/').pop();
        return imgName || `豆包图片${Math.random().toString(36).substring(2, 15)}.png`;
    }

    btn.addEventListener('click', () => {
        const imgElement = document.querySelectorAll('img[data-testid="in_painting_picture"]');
        imgElement.forEach(img => {
            download(img.src, getImgName(img.src));
        });
    });
})();