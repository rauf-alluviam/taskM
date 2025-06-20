import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactQuill from 'react-quill';
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
  Palette,
  Settings,
  Paperclip,
  Sidebar,
  X
} from 'lucide-react';
import { documentAPI, fileAPI, attachmentAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import AttachmentManager from '../components/UI/AttachmentManager';
import DocumentViewer from './DocumentViewer';

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
  const [findText, setFindText] = useState('');  const [replaceText, setReplaceText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [showAttachmentsSidebar, setShowAttachmentsSidebar] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [isImportedDocument, setIsImportedDocument] = useState(false);
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
      loadAttachments();
    }
  }, [id]);

  useEffect(() => {
    if (document) {
      const changed = title !== document.title || content !== document.content;
      setHasUnsavedChanges(changed);
    }
  }, [title, content, document]);

  useEffect(() => {
    // Calculate word count
    const text = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [content]);  const loadDocument = async () => {
    try {
      setLoading(true);
      const data = await documentAPI.getDocument(id!);
      setDocument(data);
      setTitle(data.title);
      setContent(data.content || '');
      
      // Check if this is an imported document
      const isImported = data.isImported === true || 
                        (data.content && data.content.includes('This document was imported from a file'));
      setIsImportedDocument(isImported);
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

  const handleContentChange = (value: string) => {
    setContent(value);
  };

  const handleUndo = () => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      quill.history.undo();
    }
  };

  const handleRedo = () => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      quill.history.redo();
    }
  };

  const handleFindReplace = () => {
    if (!findText || !quillRef.current) return;
    
    const quill = quillRef.current.getEditor();
    const text = quill.getText();
    const index = text.indexOf(findText);
    
    if (index !== -1) {
      quill.setSelection(index, findText.length);
      if (replaceText) {
        quill.deleteText(index, findText.length);
        quill.insertText(index, replaceText);
      }
    }
  };
  const exportDocument = () => {
    const element = window.document.createElement('a');
    const file = new Blob([content], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `${title || 'document'}.html`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
  };

  const printDocument = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              h1, h2, h3, h4, h5, h6 { margin-top: 20px; margin-bottom: 10px; }
              p { margin-bottom: 10px; }
              blockquote { 
                margin: 10px 0; 
                padding: 10px 20px; 
                background: #f9f9f9; 
                border-left: 4px solid #ccc; 
              }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            ${content}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          saveDocument();
          break;
        case 'z':
          e.preventDefault();
          handleUndo();
          break;
        case 'y':
          e.preventDefault();
          handleRedo();
          break;
        case 'f':
          e.preventDefault();
          setShowFindReplace(!showFindReplace);
          break;
        case 'p':
          e.preventDefault();
          printDocument();
          break;
      }
    }
  };

  const loadAttachments = async () => {
    if (!id) return;
    
    setLoadingAttachments(true);
    try {
      const docAttachments = await attachmentAPI.getAttachments('document', id);
      setAttachments(docAttachments);
    } catch (error) {
      console.error('Failed to load attachments:', error);
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Not Found</h2>
          <p className="text-gray-600 mb-4">The document you're looking for doesn't exist.</p>
          <Link to="/documents" className="btn-primary">
            Back to Documents
          </Link>
        </div>
      </div>
    );
  }

  // If this is an imported document with attachments, show the document viewer instead
  if (isImportedDocument) {
    return <DocumentViewer />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/documents" className="btn-outline btn-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-semibold bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded"
              placeholder="Document Title"
            />
            {hasUnsavedChanges && (
              <span className="text-sm text-orange-600">● Unsaved changes</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFindReplace(!showFindReplace)}
              className="btn-outline btn-sm"
              title="Find & Replace (Ctrl+F)"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={handleUndo}
              className="btn-outline btn-sm"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              className="btn-outline btn-sm"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
            <button
              onClick={exportDocument}
              className="btn-outline btn-sm"
              title="Export as HTML"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={printDocument}
              className="btn-outline btn-sm"
              title="Print (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
            </button>            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`btn-sm ${isPreview ? 'btn-primary' : 'btn-outline'}`}
            >
              {isPreview ? <Edit className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {isPreview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={() => setShowAttachmentsSidebar(!showAttachmentsSidebar)}
              className={`btn-sm ${showAttachmentsSidebar ? 'btn-primary' : 'btn-outline'}`}
              title="Attachments"
            >
              <Paperclip className="w-4 h-4 mr-2" />
              Attachments ({attachments.length})
            </button>
            <button
              onClick={saveDocument}
              disabled={saving || !hasUnsavedChanges}
              className="btn-primary btn-sm"
              title="Save (Ctrl+S)"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Find & Replace Bar */}
      {showFindReplace && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Find:</label>
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                className="input input-sm w-40"
                placeholder="Search text..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Replace:</label>
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                className="input input-sm w-40"
                placeholder="Replace with..."
              />
            </div>
            <button
              onClick={handleFindReplace}
              className="btn-primary btn-sm"
              disabled={!findText}
            >
              Replace
            </button>
            <button
              onClick={() => setShowFindReplace(false)}
              className="btn-outline btn-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}      {/* Main Content */}
      <div className="flex-1 flex">
        <div className={`flex-1 p-6 transition-all duration-300 ${showAttachmentsSidebar ? 'mr-80' : ''}`}>
          <div className="max-w-5xl mx-auto">
            {isPreview ? (
              /* Preview Mode */
              <div className="bg-white rounded-lg border border-gray-200 p-8 min-h-[600px] shadow-sm">
                <h1 className="text-3xl font-bold mb-6 text-gray-900">{title}</h1>
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            ) : (
              /* Edit Mode */
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={content}
                  onChange={handleContentChange}
                  modules={modules}
                  formats={formats}
                  style={{ 
                    height: '600px',
                    marginBottom: '50px'
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Start writing your document..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Attachments Sidebar */}
        {showAttachmentsSidebar && (
          <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Paperclip className="w-5 h-5 mr-2" />
                Attachments
              </h3>
              <button
                onClick={() => setShowAttachmentsSidebar(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {loadingAttachments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                <span className="ml-2 text-sm text-gray-600">Loading...</span>
              </div>
            ) : document ? (
              <AttachmentManager
                attachedTo="document"
                attachedToId={document._id}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                canUpload={true}
                canDelete={true}
                maxFileSize={50}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Footer with Stats */}
      <div className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Words: {wordCount}</span>
            <span>Characters: {content.replace(/<[^>]*>/g, '').length}</span>
            {document.projectName && (
              <span>Project: {document.projectName}</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span>Last saved: {new Date(document.updatedAt).toLocaleString()}</span>
            <div className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-orange-500' : 'bg-green-500'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor;
