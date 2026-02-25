'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  FolderOpen,
  Edit,
  Trash2,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  level: number;
  position: number;
  isActive: boolean;
  _count?: {
    products: number;
    children: number;
  };
  children?: Category[];
}

interface CategoriesResponse {
  data: Category[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    parentId: '',
    position: 0,
    isActive: true,
  });
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    parentId: '',
    position: 0,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<CategoriesResponse>('/api/v1/categories?limit=100');
      setFlatCategories(response.data);
      setCategories(buildTree(response.data));
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  function buildTree(flatCategories: Category[]): Category[] {
    const map = new Map<string, Category>();
    const roots: Category[] = [];

    // First pass: create map
    flatCategories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    flatCategories.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.slug) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...createForm };
      if (!payload.parentId) delete payload.parentId;
      if (!payload.imageUrl) delete payload.imageUrl;

      await apiClient.post<{
        message: string;
        data: Category;
      }>('/api/v1/categories', payload);

      setCreateModalOpen(false);
      setCreateForm({
        name: '',
        slug: '',
        description: '',
        imageUrl: '',
        parentId: '',
        position: 0,
        isActive: true,
      });
      fetchCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      alert(error.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setEditForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      parentId: category.parentId || '',
      position: category.position,
      isActive: category.isActive,
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedCategory) return;

    setSubmitting(true);
    try {
      const payload: any = { ...editForm };
      if (!payload.parentId) delete payload.parentId;
      if (!payload.imageUrl) delete payload.imageUrl;

      await apiClient.patch<{
        message: string;
        data: Category;
      }>(`/api/v1/categories/${selectedCategory.id}`, payload);

      setEditModalOpen(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (error: any) {
      console.error('Error updating category:', error);
      alert(error.message || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const productCount = category._count?.products || 0;
    const childrenCount = category._count?.children || 0;
    if (productCount > 0 || childrenCount > 0) {
      alert('Cannot delete category with products or subcategories. Move or delete them first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${category.name}?`)) return;

    try {
      await apiClient.delete<{ message: string }>(`/api/v1/categories/${category.id}`);
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      alert(error.message || 'Failed to delete category');
    }
  };

  const renderCategoryRow = (category: Category, depth: number = 0): React.ReactNode => {
    const filtered = search
      ? category.name.toLowerCase().includes(search.toLowerCase()) ||
        category.description?.toLowerCase().includes(search.toLowerCase())
      : true;

    if (!filtered && !search) return null;

    return (
      <div key={category.id}>
        <div
          className="flex items-center gap-3 py-3 px-4 hover:bg-muted/50 border-b"
          style={{ paddingLeft: `${16 + depth * 24}px` }}
        >
          <span className="text-muted-foreground">
            {category.children && category.children.length > 0 && <ChevronRight className="h-4 w-4" />}
          </span>
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">{category.name}</div>
            <div className="text-sm text-muted-foreground">{category.slug}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{category._count?.products || 0} products</Badge>
            {(category._count?.children || 0) > 0 && (
              <Badge variant="secondary">{category._count.children} subcategories</Badge>
            )}
            <Badge variant={category.isActive ? 'default' : 'secondary'}>
              {category.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <RoleGuard permission="categories.manage">
                  <DropdownMenuItem onClick={() => handleEdit(category)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </RoleGuard>
                <RoleGuard permission="categories.manage">
                  <DropdownMenuItem
                    onClick={() => handleDelete(category)}
                    className="text-destructive"
                    disabled={(category._count?.products || 0) > 0 || (category._count?.children || 0) > 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </RoleGuard>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {category.children && category.children.map((child) => renderCategoryRow(child, depth + 1))}
      </div>
    );
  };

  const getFilteredCategories = () => {
    if (!search) return categories;

    const filterTree = (cats: Category[]): Category[] => {
      return cats.reduce((acc: Category[], cat) => {
        const matchesSearch =
          cat.name.toLowerCase().includes(search.toLowerCase()) ||
          cat.description?.toLowerCase().includes(search.toLowerCase());

        const filteredChildren = filterTree(cat.children || []);
        const hasMatchingChildren = filteredChildren.length > 0;

        if (matchesSearch || hasMatchingChildren) {
          acc.push({
            ...cat,
            children: hasMatchingChildren ? filteredChildren : cat.children,
          });
        }

        return acc;
      }, []);
    };

    return filterTree(categories);
  };

  return (
    <RoleGuard permission="products.read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">Manage your product categories</p>
          </div>
          <RoleGuard permission="categories.manage">
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Category
            </Button>
          </RoleGuard>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Category Tree</CardTitle>
                <CardDescription>Total: {flatCategories.length} categories</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search categories..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No categories found</p>
              </div>
            ) : (
              <div className="divide-y">
                {getFilteredCategories().map((category) => renderCategoryRow(category))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Category Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>Add a new category to your catalog</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, name: e.target.value });
                    if (!createForm.slug) {
                      setCreateForm((prev) => ({ ...prev, slug: generateSlug(e.target.value) }));
                    }
                  }}
                  placeholder="Category name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  placeholder="category-slug"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent">Parent Category</Label>
                <Select
                  value={createForm.parentId}
                  onValueChange={(value) => setCreateForm({ ...createForm, parentId: value })}
                >
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="No parent (root level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent (root level)</SelectItem>
                    {flatCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {'\u00A0'.repeat(cat.level * 2)}└ {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Category description"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={createForm.imageUrl}
                  onChange={(e) => setCreateForm({ ...createForm, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  type="number"
                  value={createForm.position}
                  onChange={(e) => setCreateForm({ ...createForm, position: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Category Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Update category information</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Category name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-slug">Slug *</Label>
                <Input
                  id="edit-slug"
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  placeholder="category-slug"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-parent">Parent Category</Label>
                <Select
                  value={editForm.parentId}
                  onValueChange={(value) => setEditForm({ ...editForm, parentId: value })}
                >
                  <SelectTrigger id="edit-parent">
                    <SelectValue placeholder="No parent (root level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent (root level)</SelectItem>
                    {flatCategories
                      .filter((c) => c.id !== selectedCategory?.id)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {'\u00A0'.repeat(cat.level * 2)}└ {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Category description"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-imageUrl">Image URL</Label>
                <Input
                  id="edit-imageUrl"
                  value={editForm.imageUrl}
                  onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-position">Position</Label>
                <Input
                  id="edit-position"
                  type="number"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Category'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
