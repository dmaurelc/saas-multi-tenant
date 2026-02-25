'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Package,
  ShoppingBag,
  ChevronLeft,
  Minus,
  Plus,
  ShoppingCart,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  isActive: boolean;
}

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  position: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  variants: ProductVariant[];
  images: ProductImage[];
}

interface ProductResponse {
  data: Product;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Product state
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<ProductResponse>(`/api/v1/products/slug/${slug}`);
        setProduct(response.data);

        // Set first active variant as default
        const activeVariants = response.data.variants.filter((v) => v.isActive);
        if (activeVariants.length > 0) {
          setSelectedVariant(activeVariants[0]);
        }

        // Set first image as default
        if (response.data.images.length > 0) {
          setSelectedImage(response.data.images[0]);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  useEffect(() => {
    // Update meta tags
    if (product) {
      document.title = product.metaTitle || `${product.name} | Store`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', product.metaDesc || product.description || '');
      }
    }
  }, [product]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(price);
  };

  const handleAddToCart = () => {
    if (!selectedVariant || quantity > selectedVariant.stock) return;

    // TODO: Implement cart functionality
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
              <div className="h-32 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold mb-2">Product Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The product you are looking for does not exist or is not available.
            </p>
            <Button onClick={() => router.push('/products')}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeVariants = product.variants.filter((v) => v.isActive);
  const hasDiscount = selectedVariant?.comparePrice && selectedVariant.comparePrice > selectedVariant.price;
  const discountPercentage = hasDiscount
    ? Math.round(((selectedVariant.comparePrice! - selectedVariant.price) / selectedVariant.comparePrice!) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              <span className="font-bold text-xl">Store</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                Home
              </Link>
              <Link href="/products" className="text-muted-foreground hover:text-foreground">
                Products
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/products" className="hover:text-foreground">
            Products
          </Link>
          <ChevronLeft className="h-4 w-4 rotate-180" />
          <Link
            href={`/products?category=${product.category.id}`}
            className="hover:text-foreground"
          >
            {product.category.name}
          </Link>
          <ChevronLeft className="h-4 w-4 rotate-180" />
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              {selectedImage ? (
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.alt || product.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    className={`relative aspect-square bg-muted rounded overflow-hidden border-2 transition-colors ${
                      selectedImage?.id === img.id
                        ? 'border-foreground'
                        : 'border-transparent hover:border-muted-foreground'
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt || product.name}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <Badge variant="outline" className="mb-2">
                {product.category.name}
              </Badge>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              {product.description && (
                <p className="text-muted-foreground">{product.description}</p>
              )}
            </div>

            {/* Variants */}
            {activeVariants.length > 1 && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {activeVariants[0].name.includes('Size') ||
                  activeVariants[0].name.includes('Color') ||
                  activeVariants.some((v) => v.name.includes('-'))
                    ? 'Variant'
                    : 'Option'}
                  :
                </label>
                <div className="flex flex-wrap gap-2">
                  {activeVariants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setSelectedVariant(variant);
                        setQuantity(1);
                      }}
                      disabled={variant.stock === 0}
                      className={`px-4 py-2 border rounded-md transition-colors ${
                        selectedVariant?.id === variant.id
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-muted hover:border-foreground'
                      } ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price */}
            {selectedVariant && (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{formatPrice(selectedVariant.price)}</span>
                  {hasDiscount && (
                    <>
                      <span className="text-lg text-muted-foreground line-through">
                        {formatPrice(selectedVariant.comparePrice!)}
                      </span>
                      <Badge variant="destructive">{discountPercentage}% OFF</Badge>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedVariant.stock > 0 ? (
                    <span className="text-green-600">{selectedVariant.stock} in stock</span>
                  ) : (
                    <span className="text-destructive">Out of stock</span>
                  )}
                </p>
              </div>
            )}

            {/* Quantity */}
            {selectedVariant && selectedVariant.stock > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Quantity:</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity((q) => Math.min(selectedVariant.stock, q + 1))}
                    disabled={quantity >= selectedVariant.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Add to Cart */}
            {selectedVariant && (
              <Button
                size="lg"
                className="w-full"
                disabled={selectedVariant.stock === 0 || addedToCart}
                onClick={handleAddToCart}
              >
                {addedToCart ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {selectedVariant.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </>
                )}
              </Button>
            )}

            {/* Features */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Fast shipping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Easy returns</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
