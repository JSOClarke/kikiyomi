import React, { useCallback, useState } from 'react';
import { ServerApi } from '../../utils/ServerApi';
import { useAppContext } from '../../context/AppContext';

export default function Dropzone() {
    const { library } = useAppContext();
    const [isHovering, setIsHovering] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progressText, setProgressText] = useState("");

    const handleFiles = useCallback(async (files) => {
        if (!files || files.length === 0) return;
        
        const validExts = ['mp3','m4b','m4a','ogg','webm','wav','epub'];
        const validFiles = Array.from(files).filter(f => {
            const ext = f.name.split('.').pop().toLowerCase();
            return validExts.includes(ext);
        });

        if (validFiles.length === 0) {
            alert("No valid audio or epub files found.");
            return;
        }

        if (!ServerApi.isAvailable) {
            alert("Server is offline. You can only add files when the Node server is running.");
            return;
        }

        setUploading(true);
        for (let i = 0; i < validFiles.length; i++) {
            setProgressText(`Uploading ${i + 1}/${validFiles.length}: ${validFiles[i].name}...`);
            await ServerApi.uploadFile(validFiles[i]);
        }
        
        setProgressText("");
        setUploading(false);
        library.refreshLibrary();
    }, [library]);

    const onDrop = (e) => {
        e.preventDefault();
        setIsHovering(false);
        handleFiles(e.dataTransfer.files);
    };

    return (
        <div 
            className="drop-zone"
            style={{ 
                border: isHovering ? '2px dashed var(--primary)' : '2px dashed #444',
                padding: '40px 20px',
                textAlign: 'center',
                margin: '20px',
                borderRadius: '8px',
                background: isHovering ? 'var(--surface-hover)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
            onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
            onDragLeave={() => setIsHovering(false)}
            onDrop={onDrop}
            onClick={() => {
                if(uploading) return;
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = '.mp3,.m4b,.m4a,.ogg,.webm,.wav,.epub';
                input.onchange = e => handleFiles(e.target.files);
                input.click();
            }}
        >
            {uploading ? (
                <div>
                    <div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>
                    <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{progressText}</div>
                </div>
            ) : (
                <>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '10px' }}>
                        Add to Library
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                        Drop Audio or EPUB files here or click to browse
                    </div>
                </>
            )}
        </div>
    );
}
