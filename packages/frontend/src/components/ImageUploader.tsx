import { useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';

interface Props {
  onImageReady: (bytes: ArrayBuffer, mimeType: string) => void;
  onClear: () => void;
}

export default function ImageUploader({ onImageReady, onClear }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setCompressing(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      const buf = await compressed.arrayBuffer();
      setPreview(URL.createObjectURL(compressed));
      onImageReady(buf, compressed.type || 'image/webp');
    } catch (err) {
      console.error('Image compression failed:', err);
    } finally {
      setCompressing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleClear() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onClear();
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative rounded-xl overflow-hidden">
          <img src={preview} alt="Preview" className="w-full max-h-64 object-contain bg-gray-100" />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={compressing}
          >
            <Upload className="w-5 h-5" />
            {compressing ? '压缩中...' : '选择图片'}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="flex-1 gap-2"
            onClick={() => {
              fileRef.current?.setAttribute('capture', 'environment');
              fileRef.current?.click();
            }}
            disabled={compressing}
          >
            <Camera className="w-5 h-5" />
            拍照
          </Button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
