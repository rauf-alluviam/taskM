import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  ArrowLeft, 
  Save, 
  Upload,
  Eye,
  Edit,
  FileText,
  Download,
  Printer,
  Search,
  Undo,
  Redo,
  Type,
  Palette
} from 'lucide-react';
import { documentAPI, fileAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';

interface Document {
  _id: string;
  title: string;
  content: string;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  updatedAt: string;
}

const DocumentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const quillRef = useRef<ReactQuill>(null);

  // Rich text editor configuration
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['blockquote', 'code-block'],
        ['clean']
      ],
    },
    clipboard: {
      matchVisual: false,
    },
    history: {
      delay: 2000,
      maxStack: 500,
      userOnly: true
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background',
    'align', 'direction',
    'code-block', 'script'
  ];

  useEffect(() => {
    if (id) {
      loadDocument();
    }
  }, [id]);

  useEffect(() => {
    if (document) {
      const changed = title !== document.title || content !== document.content;
      setHasUnsavedChanges(changed);
    }
  }, [title, content, document]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const data = await documentAPI.getDocument(id!);
      setDocument(data);
      setTitle(data.title);
      setContent(data.content || '');
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDocument = async () => {
    if (!document) return;
    
    setSaving(true);
    try {
      const updatedDoc = await documentAPI.updateDocument(document._id, {
        title,
        content,
      });
      setDocument(updatedDoc);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setSaving(false);
    }
  };

  const insertFormatting = (format: string) => {
    if (!editorRef.current) return;

    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let replacement = '';
    
    switch (format) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        break;
      case 'underline':
        replacement = `<u>${selectedText || 'underlined text'}</u>`;
        break;
      case 'h1':
        replacement = `# ${selectedText || 'Heading 1'}`;
        break;
      case 'h2':
        replacement = `## ${selectedText || 'Heading 2'}`;
        break;
      case 'h3':
        replacement = `### ${selectedText || 'Heading 3'}`;
        break;
      case 'ul':
        replacement = `- ${selectedText || 'List item'}`;
        break;
      case 'ol':
        replacement = `1. ${selectedText || 'List item'}`;
        break;
      case 'link':
        replacement = `[${selectedText || 'link text'}](url)`;
        break;
      case 'image':
        replacement = `![${selectedText || 'alt text'}](image-url)`;
        break;
      default:
        replacement = selectedText;
    }

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const uploadResult = await fileAPI.uploadFile(file, 'document');
      const imageMarkdown = `![${file.name}](${uploadResult.url})`;
      
      if (editorRef.current) {
        const textarea = editorRef.current;
        const start = textarea.selectionStart;
        const newContent = content.substring(0, start) + imageMarkdown + content.substring(start);
        setContent(newContent);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  const renderMarkdown = (markdown: string) => {
    // Simple markdown rendering - in production, use a proper markdown library
    return markdown
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 hover:text-primary-700 underline">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto my-4 rounded-lg" />')
      .replace(/\n/g, '<br>');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Document not found</h2>
        <Link to="/documents" className="text-primary-600 hover:text-primary-700">
          ← Back to Documents
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/documents"
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                placeholder="Document title..."
              />
              {hasUnsavedChanges && (
                <span className="text-sm text-warning-600">• Unsaved changes</span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsPreview(!isPreview)}
                className={`btn-outline btn-sm ${isPreview ? 'bg-gray-100' : ''}`}
              >
                {isPreview ? <Edit className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {isPreview ? 'Edit' : 'Preview'}
              </button>
              
              <button
                onClick={saveDocument}
                disabled={saving || !hasUnsavedChanges}
                className="btn-primary btn-sm"
              >
                {saving && <LoadingSpinner size="sm" className="mr-2" />}
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isPreview ? (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => insertFormatting('h1')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Heading 1"
                >
                  H1
                </button>
                <button
                  onClick={() => insertFormatting('h2')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  onClick={() => insertFormatting('h3')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Heading 3"
                >
                  H3
                </button>
              </div>
              
              <div className="w-px h-6 bg-gray-300" />
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => insertFormatting('bold')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('italic')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('underline')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Underline"
                >
                  <Underline className="w-4 h-4" />
                </button>
              </div>
              
              <div className="w-px h-6 bg-gray-300" />
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => insertFormatting('ul')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('ol')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
              </div>
              
              <div className="w-px h-6 bg-gray-300" />
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => insertFormatting('link')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Link"
                >
                  <Link2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('image')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Image"
                >
                  <Image className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Upload File"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Editor */}
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-96 p-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm resize-none"
              placeholder="Start writing your document... You can use Markdown formatting."
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="prose prose-lg max-w-none">
            <div 
              className="min-h-96 p-6 bg-white rounded-lg border"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentEditor;