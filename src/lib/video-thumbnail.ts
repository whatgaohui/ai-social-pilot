'use client';

/**
 * 用浏览器原生 <video> + <canvas> 提取视频第一帧作为缩略图。
 * 返回 base64 data URL（JPEG，宽度 300px）。
 */
export function extractVideoThumbnail(file: File, timeSeconds = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);

    video.onloadeddata = () => {
      const seekTime = Math.min(timeSeconds, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      const maxWidth = 300;
      const ratio = Math.min(maxWidth / video.videoWidth, 1);
      canvas.width = Math.floor(video.videoWidth * ratio);
      canvas.height = Math.floor(video.videoHeight * ratio);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('无法获取 canvas context'));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      URL.revokeObjectURL(url);
      video.remove();
      resolve(dataUrl);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      video.remove();
      reject(new Error('视频加载失败'));
    };

    video.src = url;
  });
}
