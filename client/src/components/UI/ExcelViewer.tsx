import React, { useState, useEffect } from 'react';
import { AlertCircle, Download, Table } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import * as XLSX from 'xlsx';

interface ExcelViewerProps {
  fileUrl: string;
  fileName: string;
  onDownload?: () => void;
}

interface SheetData {
  name: string;
  data: any[][];
}

const ExcelViewer: React.FC<ExcelViewerProps> = ({ fileUrl, fileName, onDownload }) => {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExcelFile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const sheetsData: SheetData[] = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '', 
            blankrows: false 
          });
          
          return {
            name: sheetName,
            data: jsonData as any[][]
          };
        });
        
        setSheets(sheetsData);
        setActiveSheet(0);
        setLoading(false);
      } catch (error: any) {
        console.error('Error loading Excel file:', error);
        setError(`Failed to load Excel file: ${error.message}`);
        setLoading(false);
      }
    };

    if (fileUrl) {
      loadExcelFile();
    }
  }, [fileUrl, fileName]);

  const renderTable = () => {
    if (!sheets[activeSheet] || !sheets[activeSheet].data || sheets[activeSheet].data.length === 0) {
      return (
        <div className="text-center py-8">
          <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No data to display in this sheet</p>
        </div>
      );
    }

    const data = sheets[activeSheet].data;
    
    return (
      <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row: any[], rowIndex: number) => (
              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                {row.map((cell: any, cellIndex: number) => (
                  <td
                    key={cellIndex}
                    className={`px-3 py-2 whitespace-nowrap text-sm border-r border-gray-200 last:border-r-0 ${
                      rowIndex === 0 ? 'font-medium text-gray-900 bg-gray-50' : 'text-gray-700'
                    }`}
                  >
                    {cell !== null && cell !== undefined ? String(cell) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 mt-4">Loading Excel file...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Excel File</h3>
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

  const currentSheet = sheets[activeSheet];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Table className="w-5 h-5 mr-2 text-green-600" />
            Excel Spreadsheet
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {currentSheet && currentSheet.data.length > 0 && `${currentSheet.data.length} rows displayed`}
          </p>
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

      {/* Sheet Tabs */}
      {sheets.length > 1 && (
        <div className="flex space-x-1 border-b border-gray-200">
          {sheets.map((sheet, index) => (
            <button
              key={index}
              onClick={() => setActiveSheet(index)}
              className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                index === activeSheet
                  ? 'bg-white border-l border-r border-t border-gray-200 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {renderTable()}
      </div>

      {/* Info */}
      {currentSheet && currentSheet.data.length > 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
          <p>
            💡 <strong>Tip:</strong> This is a preview of your Excel file. Some formatting, formulas, and advanced features may not be displayed exactly as in the original file.
            {sheets.length > 1 && ` This file contains ${sheets.length} sheets - use the tabs above to switch between them.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ExcelViewer;
