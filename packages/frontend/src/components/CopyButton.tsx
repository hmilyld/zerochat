import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useT } from '@/i18n/useT';

interface Props {
  text: string;
  label?: string;
  preface?: string;
}

export default function CopyButton({ text, label, preface }: Props) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const copyText = preface ? `${preface}\n${text}` : text;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = copyText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button onClick={handleCopy} variant={copied ? 'secondary' : 'default'} className="gap-2">
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? t('create.copied') : (label || t('create.copyLink'))}
    </Button>
  );
}
