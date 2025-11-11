import React from 'react';
import { FileTreeSelect } from './FileTreeSelect.js';
import type { FileInfo } from '../core/types.js';

interface AppProps {
  files: readonly FileInfo[];
  onComplete: (selectedPaths: string[]) => void;
}

export const App: React.FC<AppProps> = ({ files, onComplete }) => {
  return <FileTreeSelect files={files} onComplete={onComplete} />;
};
