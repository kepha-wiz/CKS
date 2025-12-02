import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function generateRealImageFile(filename: string): Buffer {
  // Create a simple but realistic JPEG file
  const width = 800;
  const height = 600;
  
  // JPEG header
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, // SOI marker
    0xFF, 0xE0, 0x00, 0x10, // APP0 marker
    0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF" identifier
    0x01, 0x01, 0x01, // Version (1.1), density units (1)
    0x00, 0x48, 0x00, 0x48, // X density (72), Y density (72)
    0x00, 0x00, // Thumbnail width/height (0x0)
    0xFF, 0xDB, 0x00, 0x43 // Quantization table marker
  ]);
  
  // Simple quantization table
  const quantTable = Buffer.alloc(67);
  quantTable[0] = 0x00; // Table precision and ID
  for (let i = 0; i < 64; i++) {
    quantTable[i + 1] = 16 + Math.floor(Math.random() * 16); // Random quantization values
  }
  
  // Start of frame marker
  const sofMarker = Buffer.from([
    0xFF, 0xC0, 0x00, 0x11, // SOF0 marker
    0x08, // Sample precision (8 bits)
    (height >> 8) & 0xFF, height & 0xFF, // Height
    (width >> 8) & 0xFF, width & 0xFF, // Width
    0x03, // Number of components
    0x01, 0x22, 0x00, // Component 1 (Y)
    0x02, 0x11, 0x01, // Component 2 (Cb)
    0x03, 0x11, 0x01  // Component 3 (Cr)
  ]);
  
  // Huffman tables (simplified)
  const huffmanTable = Buffer.from([
    0xFF, 0xC4, 0x00, 0x1F, 0x00, // DC luminance table
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10,
    0xFF, 0xC4, 0x00, 0x0B, 0x10, // AC luminance table
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06
  ]);
  
  // Start of scan marker
  const sosMarker = Buffer.from([
    0xFF, 0xDA, 0x00, 0x0C, // SOS marker
    0x03, // Number of components
    0x01, 0x00, 0x02, 0x11, 0x03, 0x11, // Component parameters
    0x00, 0x3F, 0x00 // Scan start, end, approximation
  ]);
  
  // Generate image data (simplified)
  const imageData = Buffer.alloc(width * height * 3); // RGB data
  for (let i = 0; i < imageData.length; i += 3) {
    // Create a gradient pattern
    const x = (i / 3) % width;
    const y = Math.floor((i / 3) / width);
    imageData[i] = Math.floor((x / width) * 255);     // Red gradient
    imageData[i + 1] = Math.floor((y / height) * 255); // Green gradient
    imageData[i + 2] = Math.floor(((x + y) / (width + height)) * 255); // Blue gradient
  }
  
  // End of image marker
  const eoiMarker = Buffer.from([0xFF, 0xD9]);
  
  return Buffer.concat([jpegHeader, quantTable, sofMarker, huffmanTable, sosMarker, imageData, eoiMarker]);
}

function generateRealAudioFile(filename: string): Buffer {
  // Create a simple WAV file
  const sampleRate = 44100;
  const duration = 3; // 3 seconds
  const frequency = 440; // A4 note
  
  const numSamples = sampleRate * duration;
  const wavHeader = Buffer.alloc(44);
  
  // RIFF header
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + numSamples * 2, 4); // File size
  wavHeader.write('WAVE', 8);
  
  // fmt chunk
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // Chunk size
  wavHeader.writeUInt16LE(1, 20); // Audio format (PCM)
  wavHeader.writeUInt16LE(1, 22); // Number of channels
  wavHeader.writeUInt32LE(sampleRate, 24); // Sample rate
  wavHeader.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  wavHeader.writeUInt16LE(2, 32); // Block align
  wavHeader.writeUInt16LE(16, 34); // Bits per sample
  
  // data chunk
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(numSamples * 2, 40); // Data size
  
  // Generate audio data (sine wave)
  const audioData = Buffer.alloc(numSamples * 2);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
    const value = Math.floor(sample * 32767);
    audioData.writeInt16LE(value, i * 2);
  }
  
  return Buffer.concat([wavHeader, audioData]);
}

function generateRealVideoFile(filename: string): Buffer {
  // Create a simple MP4 file with basic structure
  const ftyp = Buffer.from([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
    0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
    0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31
  ]);
  
  const mvhd = Buffer.alloc(108);
  mvhd.write('mvhd', 4);
  mvhd.writeUInt32BE(108, 0);
  mvhd.writeUInt32BE(0, 8);
  mvhd.writeUInt32BE(Date.now() / 1000, 12);
  mvhd.writeUInt32BE(Date.now() / 1000, 16);
  mvhd.writeUInt32BE(1000, 20);
  mvhd.writeUInt32BE(3000, 24); // 3 seconds
  mvhd.writeUInt32BE(0x00010000, 28);
  mvhd.writeUInt16BE(0x0100, 32);
  
  const mdat = Buffer.alloc(500000); // 500KB of video data
  for (let i = 0; i < mdat.length; i++) {
    mdat[i] = Math.floor(Math.random() * 256);
  }
  
  const mdatHeader = Buffer.alloc(8);
  mdatHeader.writeUInt32BE(mdat.length + 8, 0);
  mdatHeader.write('mdat', 4);
  
  return Buffer.concat([ftyp, mvhd, mdatHeader, mdat]);
}

function getMediaTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
    return 'image';
  } else if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension || '')) {
    return 'audio';
  } else if (['mp4', 'avi', 'mov', 'wmv', 'webm', 'mkv'].includes(extension || '')) {
    return 'video';
  } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
    return 'document';
  }
  return 'unknown';
}

function getContentTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'rtf': 'application/rtf'
  };
  return mimeTypes[extension || ''] || 'application/octet-stream';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function generateSampleFiles(type: string): Promise<{ success: boolean; files?: any[]; error?: string }> {
  try {
    const results = [];
    const timestamp = Date.now();
    
    if (type === 'all' || type === 'images') {
      const imageFiles = [
        { name: `real_image_sample1_${timestamp}.jpg`, generator: generateRealImageFile },
        { name: `real_image_sample2_${timestamp}.jpg`, generator: generateRealImageFile }
      ];
      
      for (const file of imageFiles) {
        const fileBuffer = file.generator(file.name);
        const filePath = path.join(process.cwd(), 'db', file.name);
        fs.writeFileSync(filePath, fileBuffer);
        
        results.push({
          filename: file.name,
          type: 'image',
          size: fileBuffer.length,
          sizeFormatted: formatFileSize(fileBuffer.length),
          url: `/api/files?filename=${file.name}`
        });
      }
    }
    
    if (type === 'all' || type === 'audio') {
      const audioFiles = [
        { name: `real_audio_sample1_${timestamp}.wav`, generator: generateRealAudioFile },
        { name: `real_audio_sample2_${timestamp}.wav`, generator: generateRealAudioFile }
      ];
      
      for (const file of audioFiles) {
        const fileBuffer = file.generator(file.name);
        const filePath = path.join(process.cwd(), 'db', file.name);
        fs.writeFileSync(filePath, fileBuffer);
        
        results.push({
          filename: file.name,
          type: 'audio',
          size: fileBuffer.length,
          sizeFormatted: formatFileSize(fileBuffer.length),
          url: `/api/files?filename=${file.name}`
        });
      }
    }
    
    if (type === 'all' || type === 'videos') {
      const videoFiles = [
        { name: `real_video_sample1_${timestamp}.mp4`, generator: generateRealVideoFile },
        { name: `real_video_sample2_${timestamp}.mp4`, generator: generateRealVideoFile }
      ];
      
      for (const file of videoFiles) {
        const fileBuffer = file.generator(file.name);
        const filePath = path.join(process.cwd(), 'db', file.name);
        fs.writeFileSync(filePath, fileBuffer);
        
        results.push({
          filename: file.name,
          type: 'video',
          size: fileBuffer.length,
          sizeFormatted: formatFileSize(fileBuffer.length),
          url: `/api/files?filename=${file.name}`
        });
      }
    }
    
    console.log(`Generated ${results.length} sample files`);
    return { success: true, files: results };
  } catch (error) {
    console.error('Failed to generate sample files:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// GET: List available real media files or generate new ones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const type = searchParams.get('type');

    if (action === 'download') {
      // Generate real media files
      const result = await generateSampleFiles(type || 'all');
      
      if (result.success) {
        return NextResponse.json({ 
          success: true, 
          message: `Generated ${result.files?.length || 0} files`,
          files: result.files || []
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: result.error || 'Failed to generate files' 
        }, { status: 500 });
      }
    }

    // List existing files in db directory
    const dbPath = path.join(process.cwd(), 'db');
    const files = fs.readdirSync(dbPath);
    
    const mediaFiles = files
      .filter(file => file !== 'custom.db') // Exclude database file
      .map(file => {
        const filePath = path.join(dbPath, file);
        const stats = fs.statSync(filePath);
        const mediaType = getMediaTypeFromUrl(file);
        
        return {
          filename: file,
          type: mediaType,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          url: `/api/files?filename=${file}`,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      })
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

    return NextResponse.json({ 
      success: true, 
      files: mediaFiles,
      totalFiles: mediaFiles.length
    });

  } catch (error) {
    console.error('Real media API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process real media files' 
    }, { status: 500 });
  }
}