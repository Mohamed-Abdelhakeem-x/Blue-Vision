"use client";

import imageCompression from "browser-image-compression";

export async function compressImage(file: File): Promise<File> {
  const compressedBlob = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: file.type
  });

  return new File([compressedBlob], file.name, {
    type: compressedBlob.type || file.type
  });
}
