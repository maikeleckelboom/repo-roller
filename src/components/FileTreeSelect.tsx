import React from 'react';
import { CustomTreeSelect } from './CustomTreeSelect.js';
import type { FileInfo } from '../core/types.js';

interface FileTreeSelectProps {
  files: readonly FileInfo[];
  onComplete: (selectedPaths: string[]) => void;
}

export const FileTreeSelect: React.FC<FileTreeSelectProps> = ({ files, onComplete }) => {
  return <CustomTreeSelect files={files} onComplete={onComplete} />;
};
