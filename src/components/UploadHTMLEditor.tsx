'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Quill editor to avoid SSR issues
const ReactQuill = dynamic(
  () => import('react-quill-new'),
  { ssr: false }
);

// Import Quill styles
import 'react-quill-new/dist/quill.snow.css';

// Cast to avoid missing 'ref' in ReactQuillProps type
const QuillEditor = ReactQuill as any;

interface UploadHTMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  ['blockquote', 'code-block'],
  ['link', 'image'],
  [{ script: 'sub' }, { script: 'super' }],
  ['clean'],
];

export function UploadHTMLEditor({ value, onChange, height = 500 }: UploadHTMLEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const quillInstanceRef = useRef<any>(null);
  const editorRef = useRef<any>(null);

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

  const insertImageToEditor = useCallback((url: string) => {
    const editor = editorRef.current;
    if (editor) {
      const range = editor.getSelection(true);
      editor.insertEmbed(range.index, 'image', url);
      editor.setSelection(range.index + 1);
    }
  }, []);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const url = await uploadImage(file);
          if (url) {
            insertImageToEditor(url);
          }
        }
        break;
      }
    }
  }, [uploadImage, insertImageToEditor]);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files;
    if (!files) return;

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const url = await uploadImage(file);
        if (url) {
          insertImageToEditor(url);
        }
      }
    }
  }, [uploadImage, insertImageToEditor]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Attach DOM event listeners to the editor container
  const handleEditorReady = useCallback((quillInstance: any) => {
    quillInstanceRef.current = quillInstance;
    const editor = quillInstance.getEditor();
    editorRef.current = editor;
    const container = editor.root.parentElement;

    if (container) {
      container.addEventListener('paste', handlePaste);
      container.addEventListener('drop', handleDrop);
      container.addEventListener('dragover', handleDragOver);
    }
  }, [handlePaste, handleDrop, handleDragOver]);

  const captureRef = useCallback((instance: any) => {
    if (instance && instance !== quillInstanceRef.current) {
      handleEditorReady(instance);
    }
  }, [handleEditorReady]);

  const handleChange = useCallback(
    (content: string) => {
      onChange(content);
    },
    [onChange]
  );

  return (
    <div className="relative">
      <div className="quill-editor-wrapper" style={{ height: `${height}px` }}>
        <QuillEditor
          ref={captureRef}
          value={value}
          onChange={handleChange}
          modules={{
            toolbar: TOOLBAR_OPTIONS,
          }}
          placeholder="在这里输入 HTML 内容..."
          theme="snow"
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
