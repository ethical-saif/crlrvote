export function processPhotoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return reject(new Error('Please choose a JPG, PNG, or WebP image.'));
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const size = 200;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const sw = img.naturalWidth || img.width;
        const sh = img.naturalHeight || img.height;
        if (!sw || !sh) throw new Error('invalid');
        const side = Math.min(sw, sh);
        const sx = Math.floor((sw - side) / 2);
        const sy = Math.floor((sh - side) / 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        URL.revokeObjectURL(url);
        if (!dataUrl || !dataUrl.startsWith('data:image/jpeg;base64,')) {
          return reject(new Error('Could not process the image. Please try another file.'));
        }
        resolve(dataUrl);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not process the image. Please try another file.'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image file. Please choose a valid photo.'));
    };
    img.src = url;
  });
}
