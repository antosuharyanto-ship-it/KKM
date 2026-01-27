import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSellerAuth } from '../../contexts/SellerAuthContext';

interface Product {
    id?: string;
    name: string;
    price: string;
    stock: number;
    weight: number;
    category: string;
    description: string;
    availabilityStatus: 'ready' | 'preorder';
    preorderDays?: number;
    isDiscountActive: boolean;
    discountPrice?: string;
    images: string[];
}

interface ProductFormProps {
    initialData?: Product;
    onSuccess: () => void;
    onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ initialData, onSuccess, onCancel }) => {
    // const { seller } = useSellerAuth(); // Not used directly here
    const [formData, setFormData] = useState<Product>({
        name: '',
        price: '',
        stock: 0,
        weight: 1000,
        category: 'General',
        description: '',
        availabilityStatus: 'ready',
        preorderDays: 7,
        isDiscountActive: false,
        discountPrice: '',
        images: []
    });
    const [imageInput, setImageInput] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                price: String(initialData.price),
                discountPrice: initialData.discountPrice ? String(initialData.discountPrice) : ''
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (name === 'stock' || name === 'weight' || name === 'preorderDays') {
            setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const addImage = () => {
        if (imageInput.trim()) {
            setFormData(prev => ({ ...prev, images: [...prev.images, imageInput.trim()] }));
            setImageInput('');
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('seller_token');

            // Mapping for backend
            const backendPayload = {
                name: formData.name,
                price: formData.price,
                stock: formData.stock,
                weight: formData.weight,
                category: formData.category,
                description: formData.description,
                images: formData.images,
                discount_price: formData.discountPrice,
                is_discount_active: formData.isDiscountActive,
                availability_status: formData.availabilityStatus,
                preorder_days: formData.preorderDays
            };

            const url = `${import.meta.env.VITE_API_BASE_URL}/api/seller/products`;
            if (initialData?.id) {
                await axios.put(`${url}/${initialData.id}`, backendPayload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(url, backendPayload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to save product', error);
            alert('Failed to save product. Please check your inputs.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-bold mb-6">{initialData ? 'Edit Product' : 'Add New Product'}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <input
                        required
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    >
                        <option value="General">General</option>
                        <option value="Food">Food & Beverage</option>
                        <option value="Clothing">Clothing</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Books">Books</option>
                        <option value="Services">Services</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (IDR)</label>
                    <input
                        required
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                    <input
                        required
                        type="number"
                        name="stock"
                        value={formData.stock}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (grams)</label>
                    <input
                        required
                        type="number"
                        name="weight"
                        value={formData.weight}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    />
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                    required
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                />
            </div>

            {/* Images */}
            <div className="mb-6 border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Images (URL)</label>
                <div className="flex gap-2 mb-2">
                    <input
                        value={imageInput}
                        onChange={(e) => setImageInput(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    />
                    <button
                        type="button"
                        onClick={addImage}
                        className="bg-gray-100 px-4 py-2 rounded-lg font-bold hover:bg-gray-200"
                    >
                        Add
                    </button>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-2">
                    {formData.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
                {formData.images.length === 0 && <p className="text-xs text-gray-400 italic">No images added. First image will be the cover.</p>}
            </div>

            {/* Advanced Settings */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-gray-700 mb-4">Availability & Promo</h3>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                        <select
                            name="availabilityStatus"
                            value={formData.availabilityStatus}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="ready">Ready Stock</option>
                            <option value="preorder">Pre-Order</option>
                        </select>
                    </div>
                    {formData.availabilityStatus === 'preorder' && (
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Order Duration (Days)</label>
                            <input
                                type="number"
                                name="preorderDays"
                                value={formData.preorderDays}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    )}
                </div>

                <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="checkbox"
                            id="isDiscountActive"
                            name="isDiscountActive"
                            checked={formData.isDiscountActive}
                            onChange={handleChange}
                            className="w-4 h-4 text-green-600 rounded"
                        />
                        <label htmlFor="isDiscountActive" className="text-sm font-medium text-gray-700 select-none">Activate Discount</label>
                    </div>
                    {formData.isDiscountActive && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Price (IDR)</label>
                            <input
                                type="number"
                                name="discountPrice"
                                value={formData.discountPrice}
                                onChange={handleChange}
                                placeholder="Sale Price (must be lower than original)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-200 disabled:opacity-50"
                >
                    {submitting ? 'Saving...' : 'Save Product'}
                </button>
            </div>
        </form>
    );
};

export default ProductForm;
