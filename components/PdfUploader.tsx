import React, { useState, useCallback } from 'react';

interface PdfUploaderProps {
    onFileSelect: (file: File | null) => void;
}

const PdfUploader: React.FC<PdfUploaderProps> = ({ onFileSelect }) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = useCallback((files: FileList | null) => {
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                setFileName(file.name);
                onFileSelect(file);
            } else {
                setFileName("Tipo de arquivo inválido. Selecione um PDF.");
                onFileSelect(null);
            }
        }
    }, [onFileSelect]);

    const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);
    
    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    }, [handleFileChange]);

    return (
        <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-700 mb-2 text-center md:text-left">1. Envie o PDF da Carteira</h3>
            <div
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
                className={`flex justify-center items-center w-full h-48 px-6 transition-all duration-300 border-2 border-dashed rounded-lg cursor-pointer
                    ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-1 text-sm text-gray-500">
                        <span className="font-semibold text-blue-600">Clique para enviar</span> ou arraste e solte
                    </p>
                    <p className="text-xs text-gray-500">Apenas PDF, até 10MB</p>
                    {fileName && <p className="text-xs font-semibold mt-2 truncate text-blue-600">{fileName}</p>}
                </div>
                <input id="file-upload" name="file-upload" type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileChange(e.target.files)} />
            </div>
        </div>
    );
};

export default PdfUploader;