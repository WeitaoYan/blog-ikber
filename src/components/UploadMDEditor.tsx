'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import MD Editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface UploadMDEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export function UploadMDEditor({ value, onChange, height = 500 }: UploadMDEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const editorRef = useRef<HTMLDivElement>(null);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      setUploadProgress(`上传中: ${file.name}`);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return null;
      }

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      setUploadProgress('');
      return data.url;
    } catch (error) {
      console.error('Failed to upload image:', error);
      setUploadProgress('');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const insertImage = useCallback((url: string, alt: string = 'image') => {
    const imageMarkdown = `![${alt}](${url})`;
    const textarea = editorRef.current?.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + imageMarkdown + value.substring(end);
      onChange(newValue);

      // Move cursor after the inserted image
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
      }, 0);
    } else {
      onChange(value + '\n' + imageMarkdown);
    }
  }, [value, onChange]);

  const handlePaste = useCallback(async (e: Event) => {
    const clipboardEvent = e as ClipboardEvent;
    const items = clipboardEvent.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        clipboardEvent.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const url = await uploadImage(file);
          if (url) {
            insertImage(url, file.name);
          }
        }
        break;
      }
    }
  }, [uploadImage, insertImage]);

  const handleDrop = useCallback(async (e: Event) => {
    const dragEvent = e as DragEvent;
    dragEvent.preventDefault();
    dragEvent.stopPropagation();

    const files = dragEvent.dataTransfer?.files;
    if (!files) return;

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const url = await uploadImage(file);
        if (url) {
          insertImage(url, file.name);
        }
      }
    }
  }, [uploadImage, insertImage]);

  const handleDragOver = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('paste', handlePaste);
      editor.addEventListener('drop', handleDrop);
      editor.addEventListener('dragover', handleDragOver);

      return () => {
        editor.removeEventListener('paste', handlePaste);
        editor.removeEventListener('drop', handleDrop);
        editor.removeEventListener('dragover', handleDragOver);
      };
    }
  }, [handlePaste, handleDrop, handleDragOver]);

  return (
    <div className="relative">
      <div ref={editorRef}>
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || '')}
          height={height}
          preview="live"
        />
      </div>
      {uploading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <div className="bg-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent"></div>
            <span className="text-gray-700">{uploadProgress}</span>
          </div>
        </div>
      )}
      <p className="mt-1 text-xs text-gray-400">
        支持拖拽或粘贴图片自动上传
      </p>
    </div>
  );
}
