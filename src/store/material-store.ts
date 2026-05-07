import { create } from 'zustand';

export interface Material {
  id: string;
  name: string;
  type: string;
  fileUrl: string;
  thumbnailUrl: string;
  size: number;
  mimeType: string;
  tags: string;  // JSON string from API
  status: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  usages?: { id: string; postId: string; usedAt: string }[];
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  result?: Material;
}

interface MaterialState {
  materials: Material[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  filterType: string;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  sort: string;
  selectedMaterial: Material | null;
  selectedIds: string[];
  uploadItems: UploadItem[];
  isUploadOpen: boolean;

  setMaterials: (data: { materials: Material[]; total: number; page: number; totalPages: number }) => void;
  setLoading: (loading: boolean) => void;
  setFilterType: (type: string) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSort: (sort: string) => void;
  setSelectedMaterial: (material: Material | null) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setUploadOpen: (open: boolean) => void;
  addUploadItem: (item: UploadItem) => void;
  updateUploadItem: (id: string, updates: Partial<UploadItem>) => void;
  removeUploadItem: (id: string) => void;
  clearUploadItems: () => void;
}

export const useMaterialStore = create<MaterialState>((set) => ({
  materials: [],
  total: 0,
  page: 1,
  totalPages: 1,
  loading: false,
  filterType: 'all',
  searchQuery: '',
  viewMode: 'grid',
  sort: 'createdAt_desc',
  selectedMaterial: null,
  selectedIds: [],
  uploadItems: [],
  isUploadOpen: false,

  setMaterials: (data) => set({ materials: data.materials, total: data.total, page: data.page, totalPages: data.totalPages }),
  setLoading: (loading) => set({ loading }),
  setFilterType: (filterType) => set({ filterType, page: 1 }),
  setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSort: (sort) => set({ sort, page: 1 }),
  setSelectedMaterial: (selectedMaterial) => set({ selectedMaterial }),
  toggleSelect: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter((x) => x !== id)
      : [...state.selectedIds, id],
  })),
  clearSelection: () => set({ selectedIds: [] }),
  setUploadOpen: (isUploadOpen) => set({ isUploadOpen }),
  addUploadItem: (item) => set((state) => ({ uploadItems: [...state.uploadItems, item] })),
  updateUploadItem: (id, updates) => set((state) => ({
    uploadItems: state.uploadItems.map((item) => item.id === id ? { ...item, ...updates } : item),
  })),
  removeUploadItem: (id) => set((state) => ({
    uploadItems: state.uploadItems.filter((item) => item.id !== id),
  })),
  clearUploadItems: () => set({ uploadItems: [] }),
}));
