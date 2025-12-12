const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG 文件头
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// CRC32 计算
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];
  
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  
  return crc ^ 0xFFFFFFFF;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function createPNG(width, height, pixels) {
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // bit depth
  ihdr.writeUInt8(6, 9);  // color type (RGBA)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace
  
  // IDAT chunk (image data)
  const rawData = [];
  
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rawData.push(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]);
    }
  }
  
  const compressed = zlib.deflateSync(Buffer.from(rawData), { level: 9 });
  
  // IEND chunk
  const iend = Buffer.alloc(0);
  
  return Buffer.concat([
    PNG_SIGNATURE,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', iend)
  ]);
}

// 距离函数
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// 检查点是否在圆角矩形内
function isInRoundedRect(x, y, rx, ry, rw, rh, r) {
  if (x < rx || x > rx + rw || y < ry || y > ry + rh) return false;
  
  // 四个角的圆心
  const corners = [
    { cx: rx + r, cy: ry + r, check: (px, py) => px < rx + r && py < ry + r },
    { cx: rx + rw - r, cy: ry + r, check: (px, py) => px > rx + rw - r && py < ry + r },
    { cx: rx + r, cy: ry + rh - r, check: (px, py) => px < rx + r && py > ry + rh - r },
    { cx: rx + rw - r, cy: ry + rh - r, check: (px, py) => px > rx + rw - r && py > ry + rh - r }
  ];
  
  for (const corner of corners) {
    if (corner.check(x, y)) {
      if (distance(x, y, corner.cx, corner.cy) > r) return false;
    }
  }
  
  return true;
}

// 生成图标像素数据 - 简洁的毕业帽设计
function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const padding = size * 0.0625;
  const rectSize = size - padding * 2;
  const cornerRadius = size * 0.19;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // 检查是否在圆角矩形内
      const inRect = isInRoundedRect(x, y, padding, padding, rectSize, rectSize, cornerRadius);
      
      if (inRect) {
        // 渐变颜色 (从 #8b5cf6 到 #9333ea)
        const t = (x + y) / (size * 2);
        const r = Math.round(139 + (147 - 139) * t);
        const g = Math.round(92 + (51 - 92) * t);
        const b = Math.round(246 + (234 - 246) * t);
        
        // 检查是否在毕业帽图案内
        const inCap = isInGraduationCap(x, y, size, cx, cy);
        
        if (inCap) {
          pixels[idx] = 255;     // R - 白色
          pixels[idx + 1] = 255; // G
          pixels[idx + 2] = 255; // B
          pixels[idx + 3] = 255; // A
        } else {
          pixels[idx] = r;
          pixels[idx + 1] = g;
          pixels[idx + 2] = b;
          pixels[idx + 3] = 255;
        }
      } else {
        // 透明
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }
  
  return pixels;
}

// 简洁的毕业帽形状
function isInGraduationCap(x, y, size, cx, cy) {
  const scale = size / 256;
  
  // 帽顶 - 菱形
  const topCenterY = cy - 35 * scale;
  const topWidth = 90 * scale;
  const topHeight = 45 * scale;
  
  // 菱形顶部
  if (y >= topCenterY - topHeight && y <= topCenterY + topHeight) {
    const progress = Math.abs(y - topCenterY) / topHeight;
    const halfWidth = topWidth * (1 - progress);
    if (Math.abs(x - cx) <= halfWidth) {
      return true;
    }
  }
  
  // 帽檐 - 弧形区域
  const brimTopY = topCenterY + topHeight - 5 * scale;
  const brimBottomY = brimTopY + 50 * scale;
  const brimWidth = 75 * scale;
  const brimInnerWidth = 55 * scale;
  
  if (y >= brimTopY && y <= brimBottomY) {
    const progress = (y - brimTopY) / (brimBottomY - brimTopY);
    const outerWidth = brimWidth * (1 - progress * 0.15);
    const innerWidth = brimInnerWidth * progress;
    
    if (Math.abs(x - cx) <= outerWidth && Math.abs(x - cx) >= innerWidth) {
      return true;
    }
    // 底部封口
    if (progress > 0.85 && Math.abs(x - cx) <= outerWidth) {
      return true;
    }
  }
  
  // 流苏绳 - 从右侧延伸
  const tasselStartX = cx + topWidth - 10 * scale;
  const tasselStartY = topCenterY;
  const tasselEndY = topCenterY + 70 * scale;
  const tasselWidth = 6 * scale;
  
  if (Math.abs(x - tasselStartX) <= tasselWidth && y >= tasselStartY && y <= tasselEndY) {
    return true;
  }
  
  // 流苏球
  const ballCenterY = tasselEndY + 12 * scale;
  const ballRadius = 12 * scale;
  if (distance(x, tasselStartX, y, ballCenterY) <= ballRadius) {
    return true;
  }
  
  return false;
}

// 生成图标
const size = 512; // 使用更大尺寸以获得更好质量
const pixels = generateIcon(size);
const png = createPNG(size, size, pixels);

const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(buildDir, 'icon.png'), png);
fs.writeFileSync(path.join(publicDir, 'icon.png'), png);

console.log('Icon generated successfully! (512x512)');
console.log('- build/icon.png');
console.log('- public/icon.png');
