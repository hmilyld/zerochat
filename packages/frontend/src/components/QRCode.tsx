import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface Props {
  url: string;
  size?: number;
}

export default function QRCode({ url, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }
  }, [url, size]);

  return (
    <div className="flex justify-center">
      <canvas ref={canvasRef} className="rounded-xl" />
    </div>
  );
}
