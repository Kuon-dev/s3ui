'use client';

import React, { useState } from 'react';
import { Upload, FolderPlus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { springPresets } from '@/lib/animations';
import { TooltipWrapper as Tooltip } from '@/components/ui/tooltip-wrapper';

interface FloatingActionButtonProps {
  onUpload: () => void;
  onCreateFolder: () => void;
}

export function FloatingActionButton({ onUpload, onCreateFolder }: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const actions = [
    {
      icon: Upload,
      label: 'Upload files',
      onClick: () => {
        onUpload();
        setIsExpanded(false);
      },
      color: 'bg-primary hover:bg-primary/90',
    },
    {
      icon: FolderPlus,
      label: 'New folder',
      onClick: () => {
        onCreateFolder();
        setIsExpanded(false);
      },
      color: 'bg-primary/90 hover:bg-primary/80',
    },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/50 backdrop-blur-sm"
              onClick={() => setIsExpanded(false)}
            />
            
            {/* Action buttons */}
            <div className="relative">
              {actions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: -(index + 1) * 64 
                  }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  transition={{ 
                    delay: index * 0.05,
                    ...springPresets.bouncy 
                  }}
                  className="absolute bottom-0 right-0"
                >
                  <Tooltip content={action.label} side="left">
                    <Button
                      size="lg"
                      className={`
                        rounded-full w-14 h-14 p-0 shadow-lg
                        ${action.color}
                        active-scale hover:shadow-xl
                      `}
                      onClick={action.onClick}
                      aria-label={action.label}
                    >
                      <action.icon className="h-5 w-5" />
                    </Button>
                  </Tooltip>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div
        animate={{ rotate: isExpanded ? 45 : 0 }}
        transition={springPresets.snappy}
      >
        <Tooltip 
          content={isExpanded ? "Close" : "Quick actions"} 
          side="left"
        >
          <Button
            size="lg"
            className={`
              rounded-full w-16 h-16 p-0 shadow-lg
              ${isExpanded ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}
              active-scale hover:shadow-xl
              transition-colors
            `}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Close quick actions" : "Open quick actions"}
            aria-expanded={isExpanded}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 0 : -45 }}
              transition={springPresets.snappy}
            >
              {isExpanded ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </motion.div>
          </Button>
        </Tooltip>
      </motion.div>
    </div>
  );
}