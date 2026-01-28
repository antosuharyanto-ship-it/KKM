import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaBoxOpen } from 'react-icons/fa';
// import { useSellerAuth } from '../../contexts/SellerAuthContext';

interface Product {
    id: string;
    name: string;
    price: string;
    stock: number;
    category: string;
    status: string;
    images: string[];
    weight: number;
    availabilityStatus: string;
}

interface ProductListProps {
    products?: Product[];
    loading?: boolean;
    refreshProducts: () => void;
    onAddProduct: () => void;
    onEditProduct: (product: Product) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products: propProducts, loading: propLoading, refreshProducts, onAddProduct, onEditProduct }) => {
    // const { seller } = useSellerAuth(); // Not used
    const [localProducts, setLocalProducts] = useState<Product[]>([]);
    const [localLoading, setLocalLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const products = propProducts || localProducts;
    const loading = propLoading !== undefined ? propLoading : localLoading;

    // Only fetch if props are not provided
    const fetchProducts = async () => {
        if (propProducts) return;
        try {
            const token = localStorage.getItem('seller_token');
            if (!token) return;

            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/seller/products`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLocalProducts(res.data.data);
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLocalLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [propProducts]);

    /**
     * Download CSV Template
     */
    const handleDownloadTemplate = () => {
        const headers = ["Product Name,Price (IDR),Stock,Category,Weight (grams),Description,Unit (e.g. pcs),Image URL 1,Image URL 2"];
        const example = "Example Product,50000,100,Electronics,500,Great item,pcs,http://example.com/img1.jpg,";
        const csvContent = "data:text/csv;charset=utf-8," + headers.join("\n") + "\n" + example;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "product_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /**
     * Handle Bulk Upload
     */
    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        if (!confirm(`Upload ${file.name}? This will add items to your list.`)) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('seller_token');
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/seller/products/bulk`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert('Products uploaded successfully!');
            refreshProducts();
            fetchProducts(); // Refresh local if needed
        } catch (error: any) {
            console.error('Upload failed', error);
            alert('Upload failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            const token = localStorage.getItem('seller_token');
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/seller/products/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchProducts();
        } catch (error) {
            console.error('Failed to delete product', error);
            alert('Failed to delete product');
        }
    };

    const formatPrice = (price: string) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(price));
    };

    if (loading) return <div className="text-center py-10">Loading products...</div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">My Items</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadTemplate}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                        Download Template
                    </button>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleBulkUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploading}
                        />
                        <button
                            className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {uploading ? 'Uploading...' : 'Import CSV'}
                        </button>
                    </div>
                    <button
                        onClick={onAddProduct}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <FaPlus /> Add Item
                    </button>
                </div>
            </div>

            {products.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow border border-gray-200 text-center">
                    <FaBoxOpen className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">You haven't added any products yet.</p>
                    <button
                        onClick={onAddProduct}
                        className="text-green-600 font-bold hover:underline"
                    >
                        Create your first product
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                                                    {product.images && product.images.length > 0 ? (
                                                        <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <FaBoxOpen className="h-full w-full p-2 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                    <div className="text-xs text-gray-500">{product.category}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatPrice(product.price)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {product.stock} units
                                            {product.availabilityStatus === 'preorder' && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                    Pre-Order
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {product.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => onEditProduct(product)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                                <FaEdit />
                                            </button>
                                            <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductList;
