import React, { useState, useEffect } from 'react';
import { AlertCircle, Download, FileText } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import mammoth from 'mammoth';

interface WordViewerProps {
  fileUrl: string;
  fileName: string;
  onDownload?: () => void;
}

const WordViewer: React.FC<WordViewerProps> = ({ fileUrl, fileName, onDownload }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const loadWordFile = async () => {
      try {
        setLoading(true);
        setError(null);
        setWarnings([]);
        
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Check if the file is a valid Word document
        if (arrayBuffer.byteLength === 0) {
          throw new Error('The file appears to be empty');
        }
        
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        if (result.value) {
          setHtmlContent(result.value);
          
          // Collect any conversion warnings
          if (result.messages && result.messages.length > 0) {
            const warningMessages = result.messages
              .filter(msg => msg.type === 'warning')
              .map(msg => msg.message);
            setWarnings(warningMessages);
          }
        } else {
          setError('No content could be extracted from the Word document.');
        }
        
        setLoading(false);
      } catch (error: any) {
        console.error('Error loading Word file:', error);
        let errorMessage = 'Failed to load Word document';
        
        if (error.message.includes('not supported')) {
          errorMessage = 'This Word document format is not supported. Only .docx files can be previewed.';
        } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
          errorMessage = 'The Word document appears to be corrupted or invalid.';
        } else {
          errorMessage = `Failed to load Word document: ${error.message}`;
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    if (fileUrl) {
      loadWordFile();
    }
  }, [fileUrl, fileName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 mt-4">Loading Word document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Word Document</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
        {onDownload && (
          <div className="mt-4">
            <button
              onClick={onDownload}
              className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download File Instead
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Word Document
          </h3>
          <p className="text-sm text-gray-600 mt-1">{fileName}</p>
        </div>
        {onDownload && (
          <button
            onClick={onDownload}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-yellow-800 font-medium text-sm">Conversion Warnings</h4>
              <ul className="text-yellow-700 text-sm mt-1 space-y-1">
                {warnings.slice(0, 3).map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
                {warnings.length > 3 && (
                  <li className="text-yellow-600">... and {warnings.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Document Content */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Document Paper Effect */}
        <div className="max-w-4xl mx-auto bg-white p-8 shadow-sm">
          <div 
            className="prose prose-lg prose-gray max-w-none
                       prose-headings:text-gray-900 prose-headings:font-semibold
                       prose-p:text-gray-700 prose-p:leading-relaxed
                       prose-strong:text-gray-900 prose-strong:font-semibold
                       prose-em:text-gray-700 prose-em:italic
                       prose-ul:text-gray-700 prose-ol:text-gray-700
                       prose-li:text-gray-700 prose-li:my-1
                       prose-table:border-collapse prose-table:border prose-table:border-gray-300
                       prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2
                       prose-td:border prose-td:border-gray-300 prose-td:p-2
                       prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4
                       prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                       prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
        <p>
          💡 <strong>Tip:</strong> This is a preview of your Word document converted to HTML. 
          Some formatting, images, or advanced features may not appear exactly as in the original file. 
          Download the file to view the complete document with all formatting intact.
        </p>
        {warnings.length > 0 && (
          <p className="mt-2">
            ⚠️ Some elements in the document could not be converted perfectly (see warnings above).
          </p>
        )}
      </div>
    </div>
  );
};

export default WordViewer;
