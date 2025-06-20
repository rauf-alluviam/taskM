# React Libraries for Excel and Word File Viewing

This document outlines the best React libraries for viewing Excel and Word files in the browser, along with implementation recommendations for our document management system.

## Excel File Viewers

### 1. **react-excel-renderer** (Recommended for Excel)
- **Description**: Lightweight library specifically for parsing and displaying Excel files
- **Features**: 
  - Supports .xlsx, .xls formats
  - Converts Excel data to JSON arrays
  - Lightweight and fast
  - Good for data extraction and table display
- **Installation**: `npm install react-excel-renderer`
- **Pros**: Simple API, good performance, active maintenance
- **Cons**: Limited styling options, basic visualization only

### 2. **SheetJS (xlsx)**
- **Description**: Most comprehensive JavaScript library for spreadsheet parsing
- **Features**:
  - Supports 20+ spreadsheet formats
  - Can read/write Excel files
  - Server-side and client-side processing
  - Advanced formula parsing
- **Installation**: `npm install xlsx`
- **Pros**: Industry standard, extremely comprehensive, great documentation
- **Cons**: Larger bundle size, more complex for simple viewing

### 3. **react-spreadsheet-import**
- **Description**: Modern React component for Excel import with preview
- **Features**:
  - Beautiful UI for Excel import/preview
  - Data validation and mapping
  - TypeScript support
  - Customizable themes
- **Installation**: `npm install react-spreadsheet-import`
- **Pros**: Modern UI, great UX, TypeScript support
- **Cons**: More focused on import workflows than pure viewing

## Word File Viewers

### 1. **mammoth.js** (Recommended for Word)
- **Description**: Converts .docx files to HTML with good formatting preservation
- **Features**:
  - Converts .docx to clean HTML
  - Preserves most formatting (bold, italic, headings, lists)
  - Handles images embedded in documents
  - Good styling control
- **Installation**: `npm install mammoth`
- **Pros**: Great formatting preservation, clean HTML output, reliable
- **Cons**: Only supports .docx (not .doc), some complex formatting may be lost

### 2. **docx-preview**
- **Description**: Pure JavaScript library for rendering .docx files
- **Features**:
  - Direct rendering of .docx files in browser
  - Good formatting support
  - No server-side conversion needed
  - Supports images, tables, headers/footers
- **Installation**: `npm install docx-preview`
- **Pros**: Client-side only, good formatting support, actively maintained
- **Cons**: Bundle size, some advanced Word features not supported

### 3. **@microsoft/office-js** (Advanced)
- **Description**: Official Microsoft Office JavaScript API
- **Features**:
  - Full Office integration capabilities
  - Can embed Office Online viewers
  - Supports real-time collaboration
  - Official Microsoft support
- **Installation**: Complex setup, requires Office 365 integration
- **Pros**: Official Microsoft solution, full feature support
- **Cons**: Requires Office 365, complex setup, licensing considerations

## PDF Viewers (Already Excellent Support)

### **react-pdf** (Current Recommendation)
- **Installation**: `npm install react-pdf`
- **Features**: Excellent PDF rendering, page navigation, zoom, search
- **Status**: ✅ Already well-supported in modern browsers

## Implementation Recommendations

### Phase 1: Implemented Solution ✅

**For Excel Files:**
```bash
npm install xlsx
```
- **Status**: ✅ Implemented with ExcelViewer component
- **Features**: Multi-sheet support, table rendering, reliable parsing

**For Word Files:**
```bash
npm install mammoth
```
- **Status**: ✅ Implemented with WordViewer component  
- **Features**: HTML conversion, formatting preservation, embedded content

### Phase 2: Advanced Implementation (Future)

**For Excel Files:**
```bash
npm install xlsx
# For better UI components
npm install react-data-grid
```

**For Word Files:**
```bash
npm install docx-preview
```

## Sample Implementation Code

### Excel Viewer Component (✅ Implemented)
```tsx
// ExcelViewer.tsx - Using xlsx library
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface ExcelViewerProps {
  fileUrl: string;
  fileName: string;
  onDownload?: () => void;
}

const ExcelViewer: React.FC<ExcelViewerProps> = ({ fileUrl, fileName, onDownload }) => {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);

  useEffect(() => {
    const loadExcelFile = async () => {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const sheetsData = workbook.SheetNames.map(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '', 
          blankrows: false 
        });
        
        return { name: sheetName, data: jsonData };
      });
      
      setSheets(sheetsData);
    };

    loadExcelFile();
  }, [fileUrl]);

  // Multi-sheet support with tab navigation
  // Table rendering with proper styling
  // Error handling and loading states
};
```

### Word Viewer Component (✅ Implemented)
```tsx
// WordViewer.tsx - Using mammoth library  
import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';

const WordViewer: React.FC<WordViewerProps> = ({ fileUrl, fileName, onDownload }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    const loadWordFile = async () => {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtmlContent(result.value);
    };

    loadWordFile();
  }, [fileUrl]);

  return (
    <div className="prose prose-lg max-w-none" 
         dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
};
```

## Integration with Current DocumentViewer

Update your `DocumentViewer.tsx` to include these components:

```tsx
// Add to DocumentViewer.tsx imports
import ExcelViewer from '../components/UI/ExcelViewer';
import WordViewer from '../components/UI/WordViewer';

// Add to the render logic
const renderFileViewer = () => {
  if (!document.isImported || !document.mimetype) {
    return renderDefaultViewer();
  }

  const mimetype = document.mimetype;

  // Excel files
  if (mimetype.includes('spreadsheet') || mimetype.includes('excel') || mimetype === 'text/csv') {
    return <ExcelViewer fileUrl={downloadUrl} fileName={document.originalFileName || document.title} />;
  }

  // Word files
  if (mimetype.includes('word')) {
    return <WordViewer fileUrl={downloadUrl} fileName={document.originalFileName || document.title} />;
  }

  // Fallback to existing PDF/image viewers
  return renderDefaultViewer();
};
```

## Bundle Size Considerations

- **react-excel-renderer**: ~50KB
- **mammoth**: ~150KB
- **xlsx**: ~400KB (full version)
- **docx-preview**: ~200KB

## Browser Compatibility

All recommended libraries support:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Security Considerations

1. **File Validation**: Always validate file types and sizes before processing
2. **Sandboxing**: Consider iframe sandboxing for untrusted documents
3. **Content Security Policy**: Ensure CSP allows inline styles/scripts if needed
4. **Virus Scanning**: Implement server-side virus scanning for uploaded files

## Next Steps

1. **Install Core Libraries**:
   ```bash
   npm install react-excel-renderer mammoth
   ```

2. **Create Viewer Components**: Implement ExcelViewer and WordViewer components

3. **Update DocumentViewer**: Integrate new viewers into existing DocumentViewer logic

4. **Test with Sample Files**: Verify functionality with various Excel/Word file formats

5. **Optimize Bundle**: Use code splitting for viewer components to reduce initial bundle size

6. **Add Error Handling**: Implement robust error handling for unsupported formats or corrupted files

This implementation will provide excellent support for viewing Excel and Word files directly in the browser, enhancing the user experience significantly.
