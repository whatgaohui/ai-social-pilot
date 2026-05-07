'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, X, Tag } from 'lucide-react';

interface TagWithCount {
  name: string;
  count: number;
}

interface TagFilterProps {
  availableTags: TagWithCount[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onClear: () => void;
}

/**
 * Tag filter component with multi-select dropdown
 * @param availableTags - List of available tags with usage counts
 * @param selectedTags - Currently selected tags
 * @param onTagsChange - Callback when tags selection changes
 * @param onClear - Callback to clear all filters
 */
export function TagFilter({ availableTags, selectedTags, onTagsChange, onClear }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 min-w-[120px] justify-between"
      >
        <Tag className="w-3.5 h-3.5 mr-1" />
        {selectedTags.length === 0 ? (
          '标签筛选'
        ) : (
          <span className="flex items-center gap-1">
            {selectedTags.length} 个标签
            <X
              className="w-3 h-3 ml-1 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            />
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 ml-1" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-popover border rounded-lg shadow-lg z-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              选择标签 ({availableTags.length})
            </span>
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  onClear();
                  setIsOpen(false);
                }}
              >
                清除筛选
              </Button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {availableTags.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">暂无标签</p>
            ) : (
              availableTags.map((tag) => (
                <label
                  key={tag.name}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedTags.includes(tag.name)}
                    onCheckedChange={() => toggleTag(tag.name)}
                    className="h-4 w-4"
                  />
                  <span className="flex-1 text-sm">{tag.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {tag.count}
                  </Badge>
                </label>
              ))
            )}
          </div>

          {selectedTags.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">已选标签：</p>
              <div className="flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="flex items-center gap-1 text-xs"
                  >
                    {tag}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-red-300"
                      onClick={() => toggleTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}